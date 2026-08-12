import { supabase } from './supabase'

// -----------------------------------------------------------------------------
// tenantDb — wrapper que injeta tenant_id automaticamente
// -----------------------------------------------------------------------------
//
// Achado #8 da auditoria de segurança (T2 do quality-gate.md).
//
// Problema estrutural: o cliente `supabase` (service_role) bypassa RLS por
// completo. Qualquer service que faça `.from('leads').select('*')` sem
// filtrar por tenant_id vaza a base inteira entre tenants. Hoje ninguém
// esqueceu — mas "hoje ninguém esqueceu" não é uma trava, é sorte.
//
// A trava é: novo código de negócio usa `tenantDb(tenantId).from(...)`,
// que faz três coisas automaticamente:
//   - select(): concatena .eq('tenant_id', tenantId) na chain
//   - insert()/upsert(): injeta tenant_id no row (ou em cada row do array)
//   - update()/delete(): concatena .eq('tenant_id', tenantId) na chain
//
// Se alguém esquecer o filtro, o wrapper não permite — a chain nasce filtrada.
//
// Escape hatches (uso legítimo do cliente cru):
//   - `.raw` — para tabelas globais (`tenants` pesquisada por `id`, `plans`,
//     lookup cross-tenant como `flagInactiveLeadsAllTenants`, subscriptions
//     pesquisadas por `tenant_id` como PK).
//   - `.rpc()` — funções armazenadas têm parâmetros próprios (`p_tenant_id`),
//     a convenção fica com o service. O wrapper apenas delega.
//   - `.storage`, `.auth` — não têm noção de tenant_id; delegados diretos.
//
// Migração: os ~60 call sites existentes já filtram manualmente por
// tenant_id — não há bug hoje. A migração pode ser incremental, um service
// por commit, sem urgência. Novos services de negócio DEVEM usar tenantDb.
// -----------------------------------------------------------------------------

export const TENANT_COLUMN = 'tenant_id'

type Row = Record<string, unknown>

function withTenant(row: Row | Row[], tenantId: string): Row | Row[] {
  return Array.isArray(row)
    ? row.map((r) => ({ ...r, [TENANT_COLUMN]: tenantId }))
    : { ...row, [TENANT_COLUMN]: tenantId }
}

export function tenantDb(tenantId: string) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantDb: tenantId obrigatório e não-vazio')
  }

  return {
    /**
     * Cliente cru do Supabase. Use SOMENTE para:
     *  - Tabelas globais (`plans`, ou `tenants` pesquisada por `id`).
     *  - Lookup cross-tenant deliberado (ex: cron `flagInactiveLeadsAllTenants`).
     *  - Chamadas ao `supabase.auth.admin.*` e `supabase.storage`.
     *
     * Nunca use `.raw` para uma query em tabela de negócio (`leads`,
     * `conversations`, `messages`, `agents`, `reports`) sem `.eq('tenant_id', ...)`
     * imediatamente após — se você fizer isso, prefira o wrapper.
     */
    raw: supabase,

    /**
     * Delegação direta para `supabase.rpc`. RPCs têm parâmetros próprios
     * (`p_tenant_id`, `p_lead_id`, etc.) — o wrapper não tenta adivinhar
     * qual param corresponde ao tenant; o service passa explicitamente.
     */
    rpc(fn: string, params?: Record<string, unknown>) {
      return supabase.rpc(fn, params)
    },

    /**
     * Delegação direta para `supabase.storage`. Storage é organizado por
     * bucket + path, não por coluna — o service constrói o path incluindo
     * o tenantId manualmente.
     */
    get storage() {
      return supabase.storage
    },

    /**
     * Delegação direta para `supabase.auth`. Não faz sentido escopar
     * operações de admin (createUser, deleteUser) por tenant.
     */
    get auth() {
      return supabase.auth
    },

    from(table: string) {
      const base = supabase.from(table)
      return {
        select(cols = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
          return base.select(cols, options).eq(TENANT_COLUMN, tenantId)
        },
        insert(row: Row | Row[]) {
          return base.insert(withTenant(row, tenantId))
        },
        upsert(row: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
          return base.upsert(withTenant(row, tenantId), options)
        },
        update(patch: Row) {
          return base.update(patch).eq(TENANT_COLUMN, tenantId)
        },
        delete() {
          return base.delete().eq(TENANT_COLUMN, tenantId)
        },
      }
    },
  }
}

export type TenantDb = ReturnType<typeof tenantDb>
