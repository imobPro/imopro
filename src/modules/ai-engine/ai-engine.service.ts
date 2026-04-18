import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { buildSystemPrompt } from './ai-engine.prompts'
import type {
  AgentConfig,
  AIResponse,
  ConversationMessage,
  IntentType,
  PendingMessage,
} from './ai-engine.types'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY não definida no ambiente')
}
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não definida no ambiente')
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MODEL = process.env.CLAUDE_DEFAULT_MODEL ?? 'claude-sonnet-4-6'
const MAX_HISTORY = 20
const AUDIO_FALLBACK_MESSAGE =
  'Não consegui entender bem sua mensagem. Pode me enviar novamente ou escrever o que precisa?'

// Histórico em memória — Sprint 3 substituirá por Supabase
const conversationHistory = new Map<string, ConversationMessage[]>()

function historyKey(tenantId: string, phone: string): string {
  return `${tenantId}:${phone}`
}

export function getHistory(tenantId: string, phone: string): ConversationMessage[] {
  return conversationHistory.get(historyKey(tenantId, phone)) ?? []
}

export function appendHistory(
  tenantId: string,
  phone: string,
  message: ConversationMessage
): void {
  const key = historyKey(tenantId, phone)
  const history = conversationHistory.get(key) ?? []
  history.push(message)
  // Sliding window: mantém apenas as últimas MAX_HISTORY mensagens
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY)
  }
  conversationHistory.set(key, history)
}

export function clearHistory(tenantId: string, phone: string): void {
  conversationHistory.delete(historyKey(tenantId, phone))
}

export async function transcribeAudio(
  mediaUrl: string,
  mimeType: string
): Promise<string | null> {
  try {
    // 1. Baixar o áudio da URL do Z-API
    const response = await fetch(mediaUrl)
    if (!response.ok) {
      console.error(`[AI] Falha ao baixar áudio | status=${response.status} url=${mediaUrl}`)
      return null
    }

    const buffer = await response.arrayBuffer()
    const filename = `audio.${mimeType.split('/')[1] ?? 'ogg'}`

    // 2. Enviar para o Whisper (OpenAI) como File
    const file = new File([buffer], filename, { type: mimeType })

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

function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase()
  if (/\b(comprar?|financiamento|entrada|minha casa)\b/.test(lower)) return 'compra'
  if (/\b(alugar?|aluguel|locar?|locação)\b/.test(lower)) return 'aluguel'
  if (/\b(vender?|meu imóvel|preciso vender)\b/.test(lower)) return 'venda'
  if (/\b(visita|visitar?|conhecer o imóvel|agendar)\b/.test(lower)) return 'visita'
  if (/\b(informaç|dúvida|como funciona|me conta|saber mais)\b/.test(lower)) return 'informacao'
  return 'desconhecido'
}

function parseTransfer(text: string): { cleanText: string; shouldTransfer: boolean; transferReason?: string } {
  const match = /\[TRANSFER:([^\]]+)\]/.exec(text)
  if (!match) return { cleanText: text.trim(), shouldTransfer: false }
  return {
    cleanText: text.replace(match[0], '').trim(),
    shouldTransfer: true,
    transferReason: match[1],
  }
}

export async function generateResponse(
  pendingMessages: PendingMessage[],
  tenantId: string,
  phone: string,
  config: AgentConfig
): Promise<AIResponse> {
  const history = getHistory(tenantId, phone)

  // Montar o conteúdo das mensagens do lead para este turno
  const userLines: string[] = []

  for (const msg of pendingMessages) {
    if (msg.type === 'audio' && msg.mediaUrl) {
      const transcription = await transcribeAudio(msg.mediaUrl, msg.mimeType ?? 'audio/ogg')
      if (!transcription) {
        // Retorna fallback imediatamente sem chamar a IA
        return {
          text: AUDIO_FALLBACK_MESSAGE,
          intent: 'desconhecido',
          shouldTransfer: false,
        }
      }
      userLines.push(transcription)
    } else if (msg.text) {
      userLines.push(msg.text)
    }
  }

  if (userLines.length === 0) {
    return {
      text: AUDIO_FALLBACK_MESSAGE,
      intent: 'desconhecido',
      shouldTransfer: false,
    }
  }

  const userContent = userLines.join('\n')

  // Montar mensagens para a API no formato histórico + nova mensagem
  const apiMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user' as const, content: userContent },
  ]

  let rawText: string
  try {
    const result = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: buildSystemPrompt(config),
      messages: apiMessages,
    })

    const block = result.content[0]
    rawText = block.type === 'text' ? block.text : ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AI] Falha ao gerar resposta | tenant=${tenantId} phone=${phone} erro=${msg}`)
    throw err
  }

  const { cleanText, shouldTransfer, transferReason } = parseTransfer(rawText)
  const intent = detectIntent(userContent)

  // Persistir no histórico
  appendHistory(tenantId, phone, { role: 'user', content: userContent, timestamp: Date.now() })
  appendHistory(tenantId, phone, { role: 'assistant', content: cleanText, timestamp: Date.now() })

  console.log(`[AI] Resposta gerada | tenant=${tenantId} phone=${phone} intent=${intent} transfer=${shouldTransfer}`)

  return { text: cleanText, intent, shouldTransfer, transferReason }
}
