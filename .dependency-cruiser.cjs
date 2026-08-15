/**
 * dependency-cruiser — a arquitetura vira regra de build.
 *
 * As regras do CLAUDE.md deixam de ser um pedido e viram erro de compilação.
 * Um agente não consegue "esquecer" que módulos são independentes: se ele
 * escrever o import errado, o CI fica vermelho.
 *
 * Instalação:
 *   npm i -D dependency-cruiser
 *   npx depcruise --init          (opcional, gera config base)
 *
 * Uso:
 *   npx depcruise src --config .dependency-cruiser.cjs
 *   npx depcruise src --output-type dot | dot -T svg > docs/dependencias.svg
 *   npx depcruise src --output-type metrics       (mede acoplamento)
 *
 * O gráfico exige graphviz instalado (brew install graphviz / apt install graphviz).
 */

module.exports = {
  forbidden: [
    // ─── Estrutura ────────────────────────────────────────────────────────
    {
      name: 'sem-ciclos',
      comment:
        'Dependência circular: A precisa de B que precisa de A. É o começo da ' +
        'perda de controle — nada pode ser testado ou movido isoladamente.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'sem-orfaos',
      comment:
        'Arquivo que ninguém importa. Normalmente é código morto que o agente ' +
        'gerou numa tentativa abandonada e ficou lá ocupando espaço mental.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts)$',
          '^src/index\\.ts$',
          '^src/instrument\\.ts$',
          // Testes rodam via Vitest (nenhum os "importa" no sentido do bundler)
          '^src/tests/',
        ],
      },
      to: {},
    },

    // ─── Regras do CLAUDE.md, agora mecânicas ─────────────────────────────
    //
    // Arquitetura em CAMADAS (substitui a antiga "modulos-independentes",
    // que tratava o whatsapp.worker como dependente ilegítimo dos módulos
    // que ele ORQUESTRA — o worker é, por design, o coordenador do pipeline).
    //
    //   Camada 0 — src/shared/**   → NÃO pode importar src/modules/**
    //                                (regra `shared-nao-conhece-modulos` abaixo)
    //   Camada 1 — módulos de domínio  → só podem importar shared
    //                                    (leads, sentiment, ai-engine, agents,
    //                                     billing, tenant-settings, onboarding)
    //   Camada 2 — orquestradores      → podem importar camada 1 e shared
    //                                    Arquivos autorizados (com justificativa):
    //     - src/modules/whatsapp/whatsapp.worker.ts
    //         Pipeline WhatsApp → IA → leads/sentiment/agents/billing.
    //         Consome ai-engine para gerar resposta, leads para persistir/upsert,
    //         sentiment para classificar, agents para handoff target, billing
    //         para checar acesso, tenant-settings para horário/config, onboarding
    //         para status Z-API e credenciais.
    //     - src/modules/reports/reports.cron.ts
    //         Cron diário: dispara relatórios para todos os agents ativos
    //         (leads.flagInactiveLeadsAllTenants, agents.listAgentsForReports).
    //     - src/modules/reports/reports.metrics.ts
    //         Agrega métricas por status/perfil de lead — usa LeadStatus como
    //         contrato de coluna.
    //     - src/modules/reports/reports.pdf.ts
    //         Renderiza PDF a partir das métricas — tipa colunas de leads.
    //     - src/modules/reports/reports.service.ts
    //         Orquestra a geração e o envio; usa agents.listAgentsForReports.
    //     - src/modules/reports/reports.types.ts
    //         Contrato de dados dos relatórios — reusa LeadStatus.
    {
      name: 'modulo-so-importa-shared',
      comment:
        'Camada 1: módulo de domínio só pode importar de shared/. Se precisa ' +
        'de outro módulo, ou é um tipo compartilhado (mover para shared/types) ' +
        'ou este arquivo é um ORQUESTRADOR (camada 2) — nesse caso, adicione-o ' +
        'ao pathNot com um comentário justificando por quê.',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/',
        pathNot: [
          '^src/modules/whatsapp/whatsapp\\.worker\\.ts$',
          '^src/modules/reports/reports\\.cron\\.ts$',
          '^src/modules/reports/reports\\.metrics\\.ts$',
          '^src/modules/reports/reports\\.pdf\\.ts$',
          '^src/modules/reports/reports\\.service\\.ts$',
          '^src/modules/reports/reports\\.types\\.ts$',
        ],
      },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: '^src/modules/$1/',
      },
    },
    {
      name: 'controller-nao-toca-banco',
      comment:
        'REGRA 2 do CLAUDE.md. Controller recebe e delega. Se ele importa o banco, ' +
        'a regra de negócio começou a vazar pra dentro dele.',
      severity: 'error',
      from: { path: '(\\.controller\\.ts$|^src/modules/[^/]+/controllers/)' },
      to: { path: '^src/shared/database' },
    },
    {
      name: 'supabase-so-no-repositorio',
      comment:
        'TRAVA T2. O client do Supabase usa service_role, que ignora RLS por completo. ' +
        'Ele só pode ser tocado dentro de /shared/database, onde o client_id é ' +
        'aplicado obrigatoriamente. Import fora dali é caminho sem escopo de tenant.',
      severity: 'error',
      from: { pathNot: '^src/shared/database' },
      to: { path: '@supabase/supabase-js', dependencyTypes: ['npm'] },
    },
    {
      name: 'shared-nao-conhece-modulos',
      comment:
        'O compartilhado é a base. Se ele importa um módulo, a base passou a ' +
        'depender do andar de cima — inversão que quebra a independência de todos.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'backend-nao-importa-frontend',
      comment: 'Fronteira entre Express e Next.js. Os dois lados não se misturam.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^frontend/' },
    },

    // ─── Higiene ──────────────────────────────────────────────────────────
    {
      name: 'sem-import-quebrado',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'sem-devdep-em-producao',
      comment:
        'Dependência de desenvolvimento usada em código de produção. ' +
        'Funciona na sua máquina e quebra no deploy.',
      severity: 'error',
      from: { path: '^src/', pathNot: '\\.(spec|test)\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
    {
      name: 'sem-dep-obsoleta',
      severity: 'warn',
      from: {},
      to: { dependencyTypes: ['deprecated'] },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(src|frontend)',
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },

    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
        theme: {
          graph: { rankdir: 'TD', splines: 'ortho' },
          modules: [
            { criteria: { source: '^src/modules' }, attributes: { fillcolor: '#c8e6c9' } },
            { criteria: { source: '^src/shared/database' }, attributes: { fillcolor: '#ffcdd2' } },
            { criteria: { source: '^src/shared' }, attributes: { fillcolor: '#bbdefb' } },
          ],
        },
      },
      // Métricas de acoplamento por pasta.
      // Instabilidade (I) perto de 1 = depende de muita coisa, frágil a mudanças.
      // Instabilidade perto de 0 = muita coisa depende dele, mudar ali é caro.
      // /shared deve ser estável (I baixo). /modules pode ser instável (I alto).
      metrics: { orderBy: 'instability', hideModules: false },
    },
  },
};
