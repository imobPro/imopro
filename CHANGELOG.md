# CHANGELOG.md — Registro de Sessões

ImobBot SaaS · Sistema PAEA · Arthur CG · 2026

Registre aqui o que foi feito em cada sessão de trabalho com o Claude Code.
Isso evita retrabalho, mantém o contexto entre sessões e serve como histórico do projeto.

---

## Como usar este arquivo

Ao final de cada sessão de trabalho, adicione uma entrada seguindo o formato abaixo.
Peça ao Claude Code: *"Registre no CHANGELOG o que foi feito nessa sessão."*

```
## [DATA] — Título da sessão

**Fase:** Fase X — Nome da fase
**Duração:** Xh

### O que foi feito
- Item 1
- Item 2

### Arquivos criados ou modificados
- `caminho/do/arquivo.ts` — descrição
- `caminho/do/outro.sql` — descrição

### Decisões tomadas
- Decisão 1 e o motivo
- Decisão 2 e o motivo

### Pendências para próxima sessão
- [ ] O que ainda precisa ser feito
```

---

## [2026-04-03] — Planejamento inicial do projeto

**Fase:** Fase 0 — Setup
**Duração:** planejamento

### O que foi feito
- Definição completa da arquitetura do SaaS
- Criação do CLAUDE.md com stack, regras e disciplina de sessão
- Criação do PRD.md com personas, módulos e critérios de sucesso
- Criação do PLAN.md com roadmap completo em 4 fases e sprints
- Criação deste CHANGELOG.md

### Arquivos criados
- `CLAUDE.md` — contexto central do projeto
- `PRD.md` — requisitos do produto
- `PLAN.md` — roadmap de fases
- `CHANGELOG.md` — este arquivo

### Decisões tomadas
- Stack escolhida: Node.js + Express + Supabase + Z-API + Claude API + Next.js
- Multi-tenant via `client_id` em todas as tabelas com RLS no Supabase
- Modelo padrão: Sonnet para dia a dia, Opus para arquitetura, Haiku para tarefas simples
- Versionamento com Git obrigatório desde o primeiro commit
- IDE recomendada: Cursor (Claude Code integrado + visão de arquivos)
- Skills a criar: criar-modulo, criar-migration, integrar-zapi, prompt-claude-api, gerar-relatorio, commit-padrao
- Framework de negócio: Sistema PAEA

### Pendências para próxima sessão
- [ ] Criar repositório no GitHub
- [ ] Criar estrutura de pastas do projeto
- [ ] Configurar .gitignore e .env.example
- [ ] Instalar Node.js, TypeScript e dependências base
- [ ] Criar primeira skill: `/skills/criar-modulo/`

---

## [2026-04-05] — Setup do projeto e estrutura base

**Fase:** Fase 0 — Setup
**Duração:** configuração inicial

### O que foi feito
- Criada estrutura completa de pastas do projeto (`/src`, `/skills`, `/frontend`, `/docs`)
- Configurado `.gitignore` e `.env.example`
- Criadas todas as skills iniciais com SKILL.md completo: `iniciar-sprint`, `criar-modulo`, `criar-migration`, `integrar-zapi`, `prompt-claude-api`, `gerar-relatorio`, `commit-padrao`, `seguranca`, `melhorar-skills`
- Criado `lessons.md` para registro de erros e correções
- Configurado `.claude/settings.local.json` com permissões automáticas de git
- Corrigido bug de sintaxe nas permissões do `settings.local.json`

### Arquivos criados ou modificados
- `skills/*/SKILL.md` — todas as skills com instruções completas
- `skills/seguranca/SKILL.md` — skill de segurança com 6 camadas e checklist pré-deploy
- `lessons.md` — registro de lições aprendidas (estrutura criada, sem lições reais ainda)
- `.claude/settings.local.json` — permissões automáticas para git add, commit, status, diff, log
- `PLAN.md` — atualizado com status real da Fase 0

### Decisões tomadas
- Permissões automáticas apenas para comandos git de leitura e commit — comandos destrutivos exigem aprovação manual
- Skill de segurança cobre LGPD explicitamente — obrigação legal para dados de leads brasileiros

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes de começar o Sprint 1
- [ ] Instalar dependências base (Node.js, TypeScript, Express)
- [ ] Configurar Supabase — projeto e credenciais
- [ ] Iniciar Sprint 1 — Módulo WhatsApp

---

## [2026-04-08] — Configuração de comandos e regras de comunicação

**Fase:** Fase 0 — Setup
**Duração:** configuração

### O que foi feito
- Criados slash commands `/commit-sprint` e `/revisar-modulo` para padronizar o fluxo de trabalho
- Configurado `settings.json` com permissões seguras do Claude Code (allow/deny explícitos)
- Criada skill de comunicação que define como o Claude deve explicar ações ao Arthur em linguagem simples

### Arquivos criados
- `.claude/commands/commit-sprint.md` — comando para fechar sprints com checklist completo
- `.claude/commands/revisar-modulo.md` — comando com feedback loop automático de revisão
- `.claude/settings.json` — permissões do Claude Code com comandos seguros autorizados
- `skills/comunicacao/SKILL.md` — regra de comunicação para linguagem acessível durante o trabalho

### Decisões tomadas
- Slash commands versionados no repositório para garantir consistência entre sessões
- Permissões explícitas no settings.json — nenhum comando destrutivo autorizado automaticamente
- Regra de comunicação criada como skill para que esteja sempre acessível como referência

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes de começar o Sprint 1
- [ ] Instalar dependências base (Node.js, TypeScript, Express)
- [ ] Configurar Supabase — projeto e credenciais

---

## [2026-04-11] — Instalação de dependências base e configuração TypeScript

**Fase:** Fase 0 — Setup
**Duração:** configuração

### O que foi feito
- Inicializado `package.json` com `npm init`
- Instaladas dependências de produção: `express`, `helmet`, `express-rate-limit`, `zod`, `bcryptjs`, `jsonwebtoken`, `cors`
- Instaladas dependências de desenvolvimento: `typescript`, `ts-node`, `tsx` e todos os `@types/*`
- Configurado `tsconfig.json` com TypeScript strict mode completo
- Criado `src/index.ts` com servidor Express já com helmet, cors e rate limiting aplicados
- Confirmado: TypeScript compila sem erros, servidor sobe na porta 3000

### Arquivos criados ou modificados
- `package.json` — scripts `dev`, `build`, `start` adicionados
- `tsconfig.json` — strict mode, rootDir `src/`, outDir `dist/`
- `src/index.ts` — servidor Express com camadas de segurança base

### Decisões tomadas
- `tsx watch` para desenvolvimento (mais rápido que `ts-node-dev`)
- Rate limit geral de 100 req/min aplicado globalmente no servidor
- CORS configurado via variável `APP_URL` — nunca hardcodado

### Pendências para próxima sessão
- [ ] Rodar skill `iniciar-sprint` antes do Sprint 1 — Módulo WhatsApp
- [ ] Configurar Supabase — projeto e credenciais

<!-- Adicione novas sessões acima desta linha -->
