import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { buildSystemPrompt } from './ai-engine.prompts'
import type {
  AgentConfig,
  AIResponse,
  IntentType,
  PendingMessage,
} from './ai-engine.types'

const MODEL = process.env.CLAUDE_DEFAULT_MODEL ?? 'claude-sonnet-4-6'
const AUDIO_FALLBACK_MESSAGE =
  'Não consegui entender bem sua mensagem. Pode me enviar novamente ou escrever o que precisa?'

// Clientes inicializados na primeira chamada — servidor sobe sem as chaves configuradas
let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não definida')
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não definida')
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

export async function transcribeAudio(
  mediaUrl: string,
  mimeType: string
): Promise<string | null> {
  try {
    const openai = getOpenAI()

    const response = await fetch(mediaUrl)
    if (!response.ok) {
      console.error(`[AI] Falha ao baixar áudio | status=${response.status} url=${mediaUrl}`)
      return null
    }

    const buffer = await response.arrayBuffer()
    const filename = `audio.${mimeType.split('/')[1] ?? 'ogg'}`
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

export function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase()
  if (/\b(comprar?|financiamento|entrada)\b/.test(lower)) return 'compra'
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
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  config: AgentConfig,
  tenantId: string,
  phone: string,
): Promise<AIResponse> {
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

  const apiMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userContent },
  ]

  let rawText: string
  try {
    const result = await getAnthropic().messages.create({
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

  console.log(`[AI] Resposta gerada | tenant=${tenantId} phone=${phone} intent=${intent} transfer=${shouldTransfer}`)

  return { text: cleanText, intent, shouldTransfer, transferReason }
}
