/**
 * Guarda estrutural do banco — trava T2 do Quality Gate (docs/quality-gate.md).
 *
 * Este arquivo não testa uma funcionalidade — testa se as regras de arquitetura
 * continuam valendo. Se alguém (humano ou agente) criar uma tabela sem RLS, sem
 * policy ou sem tenant_id, o CI quebra antes de chegar em produção.
 *
 * É o teste de melhor custo-benefício do projeto inteiro: ~150 linhas que
 * protegem permanentemente a regra mais perigosa de violar.
 *
 * COMO ATIVAR (opcional hoje, obrigatório antes do 2º cliente):
 *   1. npm i -D pg @types/pg
 *   2. Definir SUPABASE_DB_URL apontando pro banco de teste
 *      (Supabase → Project Settings → Database → Connection string → URI).
 *      Ideal: projeto Supabase separado, só para CI.
 *   3. Rodar `npm test` — se pg + SUPABASE_DB_URL presentes, o describe roda;
 *      caso contrário, os testes ficam skipped com mensagem clara.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// pg é opcional hoje — usamos dynamic import pra permitir o skip.
let pgAvailable = false
try {
  await import('pg')
  pgAvailable = true
} catch {
  pgAvailable = false
}

const dbUrl = process.env.SUPABASE_DB_URL
const shouldRun = pgAvailable && !!dbUrl && dbUrl !== 'redis://localhost:6379'

const skipReason = !pgAvailable
  ? 'pg não instalado — `npm i -D pg @types/pg` pra ativar as travas'
  : !dbUrl
    ? 'SUPABASE_DB_URL ausente — sem ela os guardas estruturais não rodam e o CI passaria dando falsa sensação de proteção'
    : ''

type PgClient = {
  connect(): Promise<void>
  end(): Promise<void>
  query<T = unknown>(sql: string): Promise<{ rows: T[] }>
}

let db: PgClient | null = null

/**
 * Tabelas que legitimamente NÃO pertencem a um tenant específico.
 * Adicionar aqui exige justificativa no comentário — esta lista é a única
 * porta de saída da regra, então precisa ficar pequena.
 */
const TABELAS_GLOBAIS = new Set<string>([
  'tenants', // a própria tabela de tenants, endereçada por id
])

describe.skipIf(!shouldRun)('Guarda de RLS (T2)', () => {
  beforeAll(async () => {
    const { Client } = await import('pg')
    db = new Client({ connectionString: dbUrl! }) as unknown as PgClient
    await db.connect()
  })

  afterAll(async () => {
    await db?.end()
  })

  it('toda tabela do schema public tem RLS ativado', async () => {
    const { rows } = await db!.query<{ tablename: string }>(`
      select tablename
      from pg_tables
      where schemaname = 'public'
        and rowsecurity = false
      order by tablename
    `)

    const desprotegidas = rows.map((r) => r.tablename)

    expect(
      desprotegidas,
      `Tabelas SEM RLS: ${desprotegidas.join(', ')}\n` +
        `Corrija com: alter table <tabela> enable row level security;`,
    ).toEqual([])
  })

  it('toda tabela com RLS tem pelo menos uma policy', async () => {
    // RLS ativado sem nenhuma policy bloqueia todo acesso via anon key.
    // Parece seguro, mas na prática o dev descobre que "não funciona", desativa
    // o RLS e segue. Este teste pega isso antes.
    const { rows } = await db!.query<{ tablename: string }>(`
      select t.tablename
      from pg_tables t
      left join pg_policies p
        on p.schemaname = t.schemaname
       and p.tablename = t.tablename
      where t.schemaname = 'public'
        and t.rowsecurity = true
        and p.policyname is null
      order by t.tablename
    `)

    const semPolicy = rows.map((r) => r.tablename)

    expect(
      semPolicy,
      `Tabelas com RLS mas SEM nenhuma policy: ${semPolicy.join(', ')}\n` +
        `RLS sem policy bloqueia tudo — provavelmente a migration ficou pela metade.`,
    ).toEqual([])
  })
})

describe.skipIf(!shouldRun)('Guarda de isolamento multi-tenant (T1)', () => {
  beforeAll(async () => {
    if (!db) {
      const { Client } = await import('pg')
      db = new Client({ connectionString: dbUrl! }) as unknown as PgClient
      await db.connect()
    }
  })

  afterAll(async () => {
    await db?.end()
    db = null
  })

  it('toda tabela de negócio tem coluna tenant_id NOT NULL', async () => {
    const { rows } = await db!.query<{
      tablename: string
      tenant_id_nullable: string | null
    }>(`
      select t.tablename,
             c.is_nullable as tenant_id_nullable
      from pg_tables t
      left join information_schema.columns c
        on c.table_schema = t.schemaname
       and c.table_name = t.tablename
       and c.column_name = 'tenant_id'
      where t.schemaname = 'public'
      order by t.tablename
    `)

    const problemas = rows
      .filter((r) => !TABELAS_GLOBAIS.has(r.tablename))
      .filter((r) => r.tenant_id_nullable === null || r.tenant_id_nullable === 'YES')
      .map((r) =>
        r.tenant_id_nullable === null
          ? `${r.tablename} (sem coluna tenant_id)`
          : `${r.tablename} (tenant_id aceita NULL)`,
      )

    expect(
      problemas,
      `Tabelas sem isolamento de tenant:\n  ${problemas.join('\n  ')}\n\n` +
        `Se a tabela é global por design, adicione em TABELAS_GLOBAIS com justificativa.`,
    ).toEqual([])
  })

  it('tenant_id tem índice — isolamento que não escala vira lentidão', async () => {
    const { rows } = await db!.query<{ tablename: string }>(`
      select t.tablename
      from pg_tables t
      join information_schema.columns c
        on c.table_schema = t.schemaname
       and c.table_name = t.tablename
       and c.column_name = 'tenant_id'
      where t.schemaname = 'public'
        and not exists (
          select 1 from pg_indexes i
          where i.schemaname = t.schemaname
            and i.tablename = t.tablename
            and i.indexdef like '%tenant_id%'
        )
      order by t.tablename
    `)

    const semIndice = rows.map((r) => r.tablename)

    expect(
      semIndice,
      `Tabelas com tenant_id sem índice: ${semIndice.join(', ')}\n` +
        `Toda query filtra por tenant_id — sem índice, cada consulta varre a tabela inteira.`,
    ).toEqual([])
  })
})

describe.skipIf(shouldRun)('Guarda estrutural (avisos de setup)', () => {
  it(`skip: ${skipReason}`, () => {
    // Este teste existe só para deixar visível no output do vitest o motivo
    // do skip acima. Quando shouldRun for true, este describe é ignorado.
    expect(shouldRun).toBe(false)
  })
})
