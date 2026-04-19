import Anthropic from '@anthropic-ai/sdk'
import type { SentimentType } from './sentiment.types'

// Haiku para classificação simples — rápido e barato
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não definida')
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

const SYSTEM_PROMPT = `Você analisa o tom emocional de mensagens de WhatsApp de leads imobiliários.
Retorne APENAS um JSON no formato exato: {"sentiment":"positivo"} ou {"sentiment":"neutro"} ou {"sentiment":"negativo"}

Critérios:
- negativo: frustração, impaciência, raiva, insatisfação, desânimo, decepção
- positivo: entusiasmo, satisfação, interesse genuíno, animação
- neutro: informativo, sem carga emocional clara, perguntas simples`

export async function analyzeSentiment(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<SentimentType> {
  const userMessages = history.filter((m) => m.role === 'user').map((m) => m.content)

  // Tom geral requer ao menos 2 mensagens do lead para ser significativo
  if (userMessages.length < 2) return 'neutro'

  const conversationText = userMessages.join('\n---\n')

  try {
    const result = await getClient().messages.create({
      model: HAIKU_MODEL,
      max_tokens: 64,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise o tom geral desta conversa:\n\n${conversationText}`,
        },
      ],
    })

    const block = result.content[0]
    const text = block.type === 'text' ? block.text.trim() : ''

    const parsed = JSON.parse(text) as { sentiment: string }
    if (parsed.sentiment === 'positivo' || parsed.sentiment === 'neutro' || parsed.sentiment === 'negativo') {
      return parsed.sentiment
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Sentiment] Falha na análise | erro=${msg}`)
  }

  return 'neutro'
}
