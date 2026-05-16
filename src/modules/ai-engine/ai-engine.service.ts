import Anthropic from '@anthropic-ai/sdk'
import OpenAI, { toFile } from 'openai'
import { addExternalCallBreadcrumb } from '../../shared/observability/sentry'
import { buildSystemPrompt, buildHandoffPreparatorySystemPrompt } from './ai-engine.prompts'
import type {
  AgentConfig,
  AIResponse,
  GenerateResponseOptions,
  IntentType,
  PendingMessage,
  TransferReason,
} from './ai-engine.types'

const MODEL = process.env.CLAUDE_DEFAULT_MODEL ?? 'claude-sonnet-4-6'
const AUDIO_FALLBACK_MESSAGE =
  'Não consegui entender bem sua mensagem. Pode me enviar novamente ou escrever o que precisa?'

// Cap defensivo: getConversationHistory usa LIMIT 20 por padrão, mas o caller
// pode pedir mais ou a RPC pode mudar. A fronteira de confiança fica aqui —
// nunca enviar mais do que MAX_HISTORY_MESSAGES turnos para a IA.
const MAX_HISTORY_MESSAGES = 30

const VALID_TRANSFER_REASONS: readonly TransferReason[] = [
  'pedido_explicito',
  'intencao_fechamento',
  'ia_sem_resposta',
]

// Clientes inicializados na primeira chamada — servidor sobe sem as chaves configuradas
let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não definida')
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
      timeout: 30_000,
    })
  }
  return anthropicClient
}

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não definida')
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 30_000,
    })
  }
  return openaiClient
}

export async function transcribeAudio(
  mediaUrl: string,
  mimeType: string
): Promise<string | null> {
  try {
    const openai = getOpenAI()

    addExternalCallBreadcrumb({
      service: 'openai',
      operation: 'audio.transcriptions.create',
      data: { mimeType },
    })

    const response = await fetch(mediaUrl)
    if (!response.ok) {
      console.error(`[AI] Falha ao baixar áudio | status=${response.status} url=${mediaUrl}`)
      return null
    }

    // Z-API costuma enviar PTT do WhatsApp como `audio/ogg; codecs=opus` — extrair só o tipo base
    const baseMime = mimeType.split(';')[0].trim() || 'audio/ogg'
    const ext = baseMime.split('/')[1] || 'ogg'
    const buffer = Buffer.from(await response.arrayBuffer())
    const file = await toFile(buffer, `audio.${ext}`, { type: baseMime })

    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
    })

    const transcription = result.text.trim()
    console.log(`[AI] Áudio transcrito | chars=${transcription.length}`)
    return transcription || null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AI] Falha na transcrição de áudio | erro=${msg}`)
    return null
  }
}

export function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase()
  if (/\b(comprar?|financiamento|entrada)\b/.test(lower)) return 'compra'
  if (/\b(alugar?|aluguel|locar?|locação)\b/.test(lower)) return 'aluguel'
  if (/\b(vender?|meu imóvel|preciso vender)\b/.test(lower)) return 'venda'
  if (/\b(visita|visitar?|conhecer o imóvel|agendar)\b/.test(lower)) return 'visita'
  if (/\b(informaç|dúvida|como funciona|me conta|saber mais)\b/.test(lower)) return 'informacao'
  return 'desconhecido'
}

function parseTransfer(text: string): { cleanText: string; shouldTransfer: boolean; transferReason?: TransferReason } {
  const match = /\[TRANSFER:([^\]]+)\]/.exec(text)
  if (!match) return { cleanText: text.trim(), shouldTransfer: false }

  const cleanText = text.replace(match[0], '').trim()
  const reason = match[1].trim() as TransferReason

  // Se a IA alucinar uma razão fora do whitelist, ignorar o handoff e devolver só o texto
  if (!VALID_TRANSFER_REASONS.includes(reason)) {
    return { cleanText, shouldTransfer: false }
  }

  return { cleanText, shouldTransfer: true, transferReason: reason }
}

export async function generateResponse(
  pendingMessages: PendingMessage[],
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  config: AgentConfig,
  tenantId: string,
  phone: string,
  options: GenerateResponseOptions = {},
): Promise<AIResponse> {
  const handoffMode = options.handoffMode === true

  const userLines: string[] = []

  for (const msg of pendingMessages) {
    if (msg.type === 'audio' && msg.mediaUrl) {
      const transcription = await transcribeAudio(msg.mediaUrl, msg.mimeType ?? 'audio/ogg')
      if (transcription) {
        userLines.push(transcription)
      }
      // Áudio com falha na transcrição é ignorado — outras mensagens do batch continuam
    } else if (msg.text) {
      userLines.push(msg.text)
    }
  }

  // Todos os itens do batch falharam ou eram mídia sem texto
  if (userLines.length === 0) {
    return { text: AUDIO_FALLBACK_MESSAGE, intent: 'desconhecido', shouldTransfer: false }
  }

  const userContent = userLines.join('\n')

  const trimmedHistory =
    history.length > MAX_HISTORY_MESSAGES ? history.slice(-MAX_HISTORY_MESSAGES) : history

  const apiMessages: Anthropic.MessageParam[] = [
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userContent },
  ]

  const systemPrompt = handoffMode
    ? buildHandoffPreparatorySystemPrompt(config)
    : buildSystemPrompt(config)

  addExternalCallBreadcrumb({
    service: 'anthropic',
    operation: handoffMode ? 'messages.create (handoff)' : 'messages.create',
    data: { tenantId, phone, model: MODEL, historyLen: trimmedHistory.length },
  })

  let rawText: string
  try {
    const result = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: apiMessages,
    })

    const block = result.content[0]
    rawText = block?.type === 'text' ? block.text : ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AI] Falha ao gerar resposta | tenant=${tenantId} phone=${phone} erro=${msg}`)
    throw err
  }

  const parsed = parseTransfer(rawText)
  const intent = detectIntent(userContent)

  // Em handoffMode descartamos qualquer marker [TRANSFER:] que a IA tenha incluído por engano —
  // o lead já está em handoff, novo pedido seria duplicidade.
  if (handoffMode) {
    console.log(`[AI] Resposta gerada (handoff) | tenant=${tenantId} phone=${phone} intent=${intent}`)
    return { text: parsed.cleanText, intent, shouldTransfer: false }
  }

  console.log(`[AI] Resposta gerada | tenant=${tenantId} phone=${phone} intent=${intent} transfer=${parsed.shouldTransfer}`)

  return {
    text: parsed.cleanText,
    intent,
    shouldTransfer: parsed.shouldTransfer,
    transferReason: parsed.transferReason,
  }
}
