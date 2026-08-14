/**
 * Guarda de segredos — trava T5 do Quality Gate (docs/quality-gate.md).
 *
 * No Next.js, toda variável com prefixo NEXT_PUBLIC_ vai para o bundle e é
 * lida por qualquer pessoa com F12. A anon key do Supabase (chave publishable
 * ou anon) pode ir — ela depende de RLS para ser segura. Chaves de serviço,
 * tokens de webhook, secrets de gateway de pagamento e connection strings
 * jamais.
 *
 * Este teste lê o .env.example e o código-fonte procurando o padrão do erro,
 * não a chave em si. Um segredo real nunca deve estar no repositório para ser
 * encontrado — disso cuida o Gitleaks no CI.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

// __dirname aqui: src/tests/security → sobe 3 pastas para chegar na raiz.
const RAIZ = join(__dirname, '../../..')

/**
 * Nomes que jamais podem aparecer com prefixo NEXT_PUBLIC_.
 * A lista casa por `.includes()` case-insensitive, então basta o fragmento.
 */
const NUNCA_PUBLICO = [
  'SERVICE_ROLE',        // SUPABASE_SERVICE_ROLE_KEY
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'ZAPI_TOKEN',
  'ZAPI_ACCOUNT_TOKEN',
  'ZAPI_CLIENT_TOKEN',   // removido no 9.6, mas se voltar não vai pro browser
  'STRIPE_SECRET',
  'STRIPE_WEBHOOK_SECRET',
  'ASAAS_API_KEY',
  'DATABASE_URL',
  'SUPABASE_DB_URL',
  'JWT_SECRET',          // SUPABASE_JWT_SECRET
  'WEBHOOK_SECRET',
  'RESEND_API_KEY',
]

/** Formatos de chave real que não podem estar hardcoded em lugar nenhum. */
const PADROES_DE_CHAVE: Array<{ nome: string; regex: RegExp }> = [
  { nome: 'Chave da Anthropic', regex: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { nome: 'Chave secreta Stripe', regex: /sk_(live|test)_[A-Za-z0-9]{20,}/ },
  { nome: 'Chave nova Supabase (secret)', regex: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { nome: 'JWT (service_role/anon legacy)', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { nome: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
]

const IGNORAR_PASTAS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'out',
  'coverage',
])

const EXTENSOES = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml'])

function listarArquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR_PASTAS.has(nome)) continue
    const caminho = join(dir, nome)
    let stat
    try {
      stat = statSync(caminho)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      listarArquivos(caminho, acc)
    } else if (EXTENSOES.has(extname(nome))) {
      acc.push(caminho)
    }
  }
  return acc
}

describe('Guarda de segredos (T5)', () => {
  it('nenhum segredo está declarado com prefixo NEXT_PUBLIC_ no .env.example', () => {
    let envExample = ''
    try {
      envExample = readFileSync(join(RAIZ, '.env.example'), 'utf8')
    } catch {
      throw new Error('.env.example não encontrado — ele é obrigatório desde o dia 1.')
    }

    const publicas = envExample
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('NEXT_PUBLIC_'))
      .map((l) => l.split('=')[0])

    const vazando = publicas.filter((chave) =>
      NUNCA_PUBLICO.some((proibida) => chave.toUpperCase().includes(proibida)),
    )

    expect(
      vazando,
      `Segredo exposto no bundle do frontend: ${vazando.join(', ')}\n` +
        `Qualquer pessoa lê isso com F12. Remova o prefixo e mova o uso para o backend.`,
    ).toEqual([])
  })

  it('nenhum arquivo do repositório usa NEXT_PUBLIC_ com nome de segredo', () => {
    const ocorrencias: string[] = []

    for (const arquivo of listarArquivos(RAIZ)) {
      // Este próprio arquivo lista os nomes proibidos — ignorar.
      if (arquivo.includes('secrets-guard.test')) continue
      // A pasta docs/ é doutrinária: quality-gate.md pode referenciar os nomes.
      if (arquivo.includes(`${RAIZ}/docs/`) || arquivo.includes(`${RAIZ}\\docs\\`)) continue

      const conteudo = readFileSync(arquivo, 'utf8')
      for (const proibida of NUNCA_PUBLICO) {
        const regex = new RegExp(`NEXT_PUBLIC_[A-Z0-9_]*${proibida}`, 'i')
        if (regex.test(conteudo)) {
          ocorrencias.push(`${arquivo.replace(RAIZ, '.')} → NEXT_PUBLIC_*${proibida}`)
        }
      }
    }

    expect(ocorrencias, `Segredos expostos:\n  ${ocorrencias.join('\n  ')}`).toEqual([])
  })

  it('nenhuma chave de API aparece hardcoded no código', () => {
    const ocorrencias: string[] = []

    for (const arquivo of listarArquivos(RAIZ)) {
      // Este próprio arquivo contém os padrões — ignorar.
      if (arquivo.includes('secrets-guard.test')) continue

      const conteudo = readFileSync(arquivo, 'utf8')
      for (const { nome, regex } of PADROES_DE_CHAVE) {
        if (regex.test(conteudo)) {
          ocorrencias.push(`${arquivo.replace(RAIZ, '.')} → ${nome}`)
        }
      }
    }

    expect(
      ocorrencias,
      `Chave hardcoded encontrada:\n  ${ocorrencias.join('\n  ')}\n\n` +
        `ATENÇÃO: se a chave já foi commitada, apagar não resolve. Ela está no ` +
        `histórico do Git. Rotacione a chave no provedor imediatamente.`,
    ).toEqual([])
  })

  it('.env está no .gitignore', () => {
    const gitignore = readFileSync(join(RAIZ, '.gitignore'), 'utf8')
    expect(
      gitignore,
      '.env ausente do .gitignore — commit acidental de credenciais fica trivial.',
    ).toMatch(/^\.env$/m)
  })
})
