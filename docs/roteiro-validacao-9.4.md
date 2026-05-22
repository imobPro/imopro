# Roteiro de validação manual — Sprint 9.4

Use este roteiro pra validar o onboarding self-service + billing antes do 1º piloto. Marque cada item ao concluir. Quando achar um bug, anote no fim do arquivo (seção "Bugs encontrados") e me avise.

## Setup

- Backend rodando: porta `3001` (`PORT=3001 npm run dev` na raiz)
- Frontend rodando: porta `3000` (`npm run dev` em `frontend/`)
- Redis local rodando
- Supabase apontando pro projeto de dev. **"Confirm email" precisa estar habilitado** (Authentication → Providers → Email)
- `frontend/.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `BACKEND_URL=http://localhost:3001`
  - `NEXT_PUBLIC_SUPPORT_WHATSAPP=` (deixe vazio nesta primeira passada)
  - `NEXT_PUBLIC_SUPPORT_EMAIL=`
- `.env` (raiz): `SENTRY_DSN=` vazio em dev (relatórios desabilitados — sem ruído)

> **Dica de banco:** antes de começar, anote 2-3 e-mails de teste que você vai usar. Você vai precisar deletar entre rodadas (Supabase → Authentication → Users → delete).

---

## 1. Marketing público (sem login)

| # | Passo | Esperado |
|---|---|---|
| 1.1 | Abrir `http://localhost:3000/` em aba anônima | Redireciona pra `/precos` |
| 1.2 | Conferir `/precos` | 2 cards lado a lado (R$297 Corretor / R$597 Imobiliária), badge "Mais popular" no segundo, badge "7 dias grátis" no topo |
| 1.3 | Clicar em "Começar trial de 7 dias" no card Corretor | Vai pra `/cadastro?plano=corretor` |
| 1.4 | Voltar para `/precos`, clicar no card Imobiliária | Vai pra `/cadastro?plano=imobiliaria` |
| 1.5 | Abrir `/privacidade` | Renderiza o conteúdo de `docs/privacidade.md` formatado (h1/h2, listas, links) |
| 1.6 | Abrir `/termos` | Renderiza o conteúdo de `docs/termos.md` |
| 1.7 | Header: clicar "Entrar" | Vai pra `/login` |
| 1.8 | Footer: links de privacidade/termos funcionam | OK |
| 1.9 | Mobile (DevTools 375px): layout não estoura, cards empilham | OK |

---

## 2. Cadastro — wizard (tela 1: responsável)

| # | Passo | Esperado |
|---|---|---|
| 2.1 | `/cadastro`: enviar formulário vazio | Toast "Informe seu nome completo." (botão valida client-side) |
| 2.2 | Preencher só nome e e-mail inválido (`abc`), continuar | Toast "Informe um e-mail válido." |
| 2.3 | E-mail válido, senha curta (`1234`), continuar | Toast "A senha precisa ter pelo menos 8 caracteres." |
| 2.4 | Preencher dados válidos, continuar | Vai pra tela 2 (stepper 2 de 3 ativo) |

---

## 3. Cadastro — wizard (tela 2: modo de operação)

| # | Passo | Esperado |
|---|---|---|
| 3.1 | Selecionar "Sou corretor individual" | Campo "Nome da imobiliária" some |
| 3.2 | Selecionar "Represento uma imobiliária" | Campo "Nome da imobiliária" aparece, obrigatório |
| 3.3 | Telefone com letras (`abc`) | Validador aceita (máscara faz `digitsOnly`), mas se passar dígitos inválidos avisa |
| 3.4 | Telefone "55" só (curto demais) | Toast "Telefone inválido. Use o formato 55DDXXXXXXXXX." |
| 3.5 | Voltar → dados da tela 1 ainda lá | OK |
| 3.6 | Telefone vazio + modo individual, continuar | Vai pra tela 3 |

---

## 4. Cadastro — wizard (tela 3: revisão + LGPD)

| # | Passo | Esperado |
|---|---|---|
| 4.1 | Revisar dados — corretos? | Resumo bate com o preenchido |
| 4.2 | Tentar "Criar conta" sem aceitar termos | Toast "Você precisa aceitar os Termos e a Política de Privacidade." |
| 4.3 | Marcar aceite + Criar conta | Redireciona pra `/verificar-email` (sem o shell do painel — tela cheia) |
| 4.4 | Conferir Supabase → Authentication → Users | Usuário criado, **e-mail não confirmado** |
| 4.5 | Conferir tabela `tenants` | Tenant criado com `operation_mode` correto, `lgpd_accepted_at` preenchido |
| 4.6 | Conferir tabela `agents` | Agent criado vinculado ao user, `active=true` |
| 4.7 | Conferir tabela `subscriptions` | 1 row com `status='trial'`, `trial_started_at=NULL`, `trial_ends_at=NULL` |

---

## 5. E-mail duplicado

| # | Passo | Esperado |
|---|---|---|
| 5.1 | Tentar cadastrar de novo com o mesmo e-mail | Toast "Este e-mail já está cadastrado." e wizard volta pra tela 1 |

---

## 6. Verificação de e-mail

> **Obsoleto após fix do Bug #3** (2026-05-20): com `email_confirm:true` no backend, os novos cadastros já vêm confirmados — `/verificar-email` vira passagem instantânea (`page.tsx:28` redireciona pra `/conectar-whatsapp`). A tela continua no código mas só é acessível se algum usuário ficar com `email_confirmed_at = null` manualmente (admin desconfirmando, ou se a regra de produto mudar de novo). Os passos 6.1–6.8 ficam preservados como documentação de comportamento; revalidar quando o gate de e-mail voltar.


| # | Passo | Esperado |
|---|---|---|
| 6.1 | Tela `/verificar-email`: e-mail mascarado correto? | Ex.: `ar***@gmail.com` |
| 6.2 | Clicar "Já confirmei" antes de confirmar | Toast info "Ainda não detectamos a confirmação." |
| 6.3 | Clicar "Reenviar e-mail" | Toast sucesso, botão entra em cooldown 60s |
| 6.4 | Tentar reenviar de novo durante o cooldown | Botão desabilitado, mostra "Reenviar em Xs" |
| 6.5 | Abrir o e-mail de confirmação do Supabase (inbox) | Link de confirmação |
| 6.6 | Clicar no link, voltar pra `/verificar-email` e clicar "Já confirmei" | Vai pra `/conectar-whatsapp` |
| 6.7 | Tentar acessar `/inbox` antes de confirmar | Redireciona pra `/verificar-email` |
| 6.8 | "Sair desta conta" (link discreto) | Faz logout, vai pra `/login` |

---

## 7. Conectar WhatsApp

> **Atenção:** sem `BACKEND_PUBLIC_URL` no `.env` (e/ou `ZAPI_ACCOUNT_TOKEN`), o backend retorna 500 SERVER_MISCONFIGURED — a UI deve mostrar a tela de erro com botão "Tentar novamente". Esse é o cenário esperado em dev sem tokens reais.

| # | Passo | Esperado |
|---|---|---|
| 7.1 | Chegar em `/conectar-whatsapp` após confirmar e-mail | Tenta provisionar automaticamente |
| 7.2 | **Sem tokens Z-API:** | Tela de erro: "Não foi possível criar sua instância do WhatsApp." + botão "Tentar novamente" |
| 7.3 | **Com tokens reais:** QR aparece | Imagem do QR + contador regressivo "Expira em 45s" |
| 7.4 | Esperar 45s | Overlay "QR expirado" sobre a imagem, botão muda pra "Gerar novo" |
| 7.5 | Clicar "Gerar novo" | Pede novo QR, contador volta pra 45s |
| 7.6 | Escanear QR com WhatsApp (Aparelhos conectados) | Após ~2s o polling detecta `connected` e redireciona pra `/inbox` |

---

## 8. Painel autenticado

| # | Passo | Esperado |
|---|---|---|
| 8.1 | `/inbox` após conectar WhatsApp | Painel completo carrega |
| 8.2 | Banner de trial no topo | "Trial: 7 dias e 50 mensagens restantes" (neutro/cinza, antes do banner de notificação) |
| 8.3 | Aba "Configurações" → card "Assinatura" | Visível, leva pra `/configuracoes/assinatura` |
| 8.4 | `/configuracoes/assinatura`: status badge | "Trial em andamento" |
| 8.5 | Métricas: dias restantes / termina em / mensagens | 7 / data correta / 0/50 / 50 |

---

## 9. Cenários de banner (manipular o banco)

> Forçar status via SQL no Supabase. Reverter ao final.

| # | Passo | Esperado |
|---|---|---|
| 9.1 | Banco: `UPDATE subscriptions SET trial_started_at='2026-05-09T00:00:00Z', trial_ends_at='2026-05-16T00:00:00Z' WHERE tenant_id='<seu>'` | Banner âmbar (≤3 dias) |
| 9.2 | Banco: `UPDATE subscriptions SET status='expired' WHERE tenant_id='<seu>'` | Banner vermelho "Seu trial encerrou..." |
| 9.3 | `/configuracoes/assinatura` com status=expired | Mostra "Trial encerrado" + bloco destacado |
| 9.4 | Como `NEXT_PUBLIC_SUPPORT_WHATSAPP` está vazio | Fallback: "Em breve disponibilizaremos..." (sem botões) |
| 9.5 | Setar `NEXT_PUBLIC_SUPPORT_WHATSAPP=5521999999999` no `.env.local`, reiniciar `npm run dev` | Botão "Falar no WhatsApp" aparece, link com mensagem pré-preenchida do `wa.me/` |
| 9.6 | Banco: `UPDATE subscriptions SET status='active', plan_id='corretor' WHERE tenant_id='<seu>'` | Banner some, página mostra "Plano ativo" |
| 9.7 | Reverter: `UPDATE subscriptions SET status='trial', trial_started_at=NULL, trial_ends_at=NULL, plan_id=NULL WHERE tenant_id='<seu>'` | Volta ao trial pendente, banner neutro com "Conecte seu WhatsApp..." (porque trial não começou + WhatsApp foi simulado em 7.6) |

---

## 10. Edge cases gerais

| # | Passo | Esperado |
|---|---|---|
| 10.1 | Voltar pra `/precos` enquanto logado | Middleware redireciona pra `/inbox` |
| 10.2 | Acessar `/privacidade` logado | Funciona — não força redirect pro painel |
| 10.3 | Limpar cookies → acessar `/inbox` | Middleware redireciona pra `/login` |
| 10.4 | Erro de rede (parar backend) → recarregar painel | Banner some (tolera fetch falhar), painel continua acessível |
| 10.5 | Dark mode toggle no painel | Continua funcionando, banner também muda |

---

## 11. Sentry (opcional — só se quiser conferir agora)

Criar projeto Node.js em [sentry.io](https://sentry.io) (free tier, 5k errors/mês). Copiar o DSN.

| # | Passo | Esperado |
|---|---|---|
| 11.1 | Setar `SENTRY_DSN=https://...@.../...` no `.env`, reiniciar backend | Log de boot: `[Sentry] Inicializado (environment=development).` |
| 11.2 | Forçar um erro: chamar `/api/me` com token inválido | 401 INVALID_TOKEN — não vira evento no Sentry (esperado, é validation) |
| 11.3 | Forçar erro inesperado: derrubar Supabase (renomear `SUPABASE_URL`) e chamar `/api/me` | Aparece evento no Sentry com tag `module=Auth` |
| 11.4 | Reverter `SUPABASE_URL` | OK |
| 11.5 | Manter `SENTRY_DSN` vazio em dev daqui pra frente | Sem ruído nos issues |

---

## Bugs encontrados

> Use este formato pra cada bug:
>
> ```
> ### Bug #1 — Título curto
> **Onde:** rota/tela/fluxo
> **Esperado:** comportamento esperado
> **Aconteceu:** o que aconteceu
> **Repro:** passos pra reproduzir
> ```

<!-- Anote aqui conforme aparecerem -->

> **Resumo da validação (2026-05-20, via Playwright MCP; atualizado 2026-05-22)**
> 6 bugs encontrados (5 do roteiro original + 1 do sweep adicional de 2026-05-22). **Todos corrigidos** (#1, #2, #3 ainda na sessão de 2026-05-20; #4, #5, #6 em 2026-05-22). Seções 1, 3, 5, 8, 9 passaram limpas. Seção 6 ficou obsoleta após o fix do #3. Seções 2, 4, 7, 10 passaram com bugs anotados. Sweep adicional cobriu: dark mode toggle (funciona), mobile resize (layout adapta), `/privacidade` e `/termos` (renderizam OK), login com credenciais erradas (mensagem dev vs prod intencional), cadastro completo e2e modo imobiliária (criação → login → /conectar-whatsapp pulando /verificar-email), EMAIL_IN_USE (toast PT + retorna Step 1 com dados preservados). Estado pós-validação: 6 users de teste no Supabase Auth (`arthur.cg12+teste1..6@gmail.com`); `.env.local` do frontend ganhou `NEXT_PUBLIC_SUPPORT_WHATSAPP=5521999999999` e `NEXT_PUBLIC_SUPPORT_EMAIL=suporte@imobpro.com.br` (Arthur pode limpar); tenant `ed55b319-618a-4919-a12a-94720bcb2e92` está em `status='trial', trial_started_at=NULL` após revert do 9.7 (mas `zapi_status='connected'`); tenant novo do teste6 (modo imobiliária) criado com sucesso.

### Bug #1 — Validação HTML5 sobrepõe toasts custom no Step 1 do wizard ✅ CORRIGIDO
**Onde:** `/cadastro` — tela 1 do wizard (`frontend/src/app/(marketing)/cadastro/signup-wizard.tsx:229-269`)
**Esperado:** Ao clicar "Continuar" com campos vazios/inválidos, ver toast custom — "Informe seu nome completo.", "Informe um e-mail válido.", etc. (itens 2.1, 2.2 do roteiro).
**Aconteceu:** Os `<Input>` têm `required` HTML5 + o de e-mail é `type="email"`. O browser dispara tooltip nativo "Preencha este campo." / "Inclua um '@' no endereço de e-mail." e bloqueia o submit antes do `onSubmit` rodar. O `handleNext` nunca é chamado, o toast custom nunca aparece.
**Repro:** abrir `/cadastro`, clicar "Continuar" sem preencher nada → aparece tooltip nativo do Chrome focado no `#fullName`, não o toast.
**Correção aplicada (2026-05-22):** `noValidate` adicionado nos `<form>` dos 3 steps do `signup-wizard.tsx`. `required` e `type="email"` ficam (semântica/AT), browser não bloqueia mais o submit. Validação JS em PT continua cobrindo todos os casos. Verificado via Playwright: forma vazia → "Informe seu nome completo."; e-mail inválido → "Informe um e-mail válido."; senha < 8 → "A senha precisa ter pelo menos 8 caracteres.".

### Bug #2 — Mesmo padrão no Step 3: `required` no checkbox de LGPD sobrepõe toast ✅ CORRIGIDO
**Onde:** `/cadastro` — tela 3 do wizard, checkbox LGPD (`signup-wizard.tsx:456`)
**Esperado:** Toast custom "Você precisa aceitar os Termos e a Política de Privacidade." (item 4.2 do roteiro).
**Aconteceu:** Checkbox tem `required` HTML5; browser dispara tooltip nativo "Marque esta caixa se deseja continuar." e bloqueia `handleSubmit`. Toast nunca aparece. Bug irmão do #1, mesma causa raiz.
**Repro:** chegar no Step 3, clicar "Criar conta" sem marcar o checkbox.
**Correção aplicada (2026-05-22):** mesmo fix do #1 — `noValidate` no `<form>` do Step 3. Verificado via Playwright: avançar até Step 3 e submeter sem marcar o checkbox → toast "Você precisa aceitar os Termos e a Política de Privacidade.".

### Bug #3 — Cadastro com "Confirm email" ligado cai em /login em vez de /verificar-email
**Onde:** `/cadastro` — handleSubmit do wizard após criar conta (`signup-wizard.tsx:96-143`)
**Esperado:** Após criar conta, redirecionar pra `/verificar-email` (item 4.3 do roteiro), com o cliente logado e capaz de reenviar e-mail e clicar "Já confirmei".
**Aconteceu:** O backend cria o user via admin API (não confirmado). Em seguida o frontend chama `signInWithPassword`, que retorna **400 Bad Request** porque o Supabase tem "Confirm email" habilitado (setup obrigatório do roteiro). O `if (signInError)` cai no fallback: toast "Conta criada, mas não conseguimos te logar agora. Entre manualmente." + `router.push("/login")`. O cliente fica preso em /login — não consegue logar (e-mail não confirmado), não tem caminho pra reenviar e-mail (auth.resend nunca foi chamado), e nem sabe que precisa abrir o Gmail.
**Repro:** 1. garantir Supabase com Confirm email ON. 2. concluir o wizard com e-mail novo. 3. clicar "Criar conta". Cai em /login. Console: `Failed to load resource: 400 @ /auth/v1/token?grant_type=password`.
**Causa raiz:** Supabase bloqueia `signInWithPassword` de usuários com `email_confirmed_at = null` quando "Confirm email" está ON. O fluxo do wizard assume que o sign-in vai funcionar mesmo sem confirmação.
**Sugestão:** detectar o erro específico de e-mail não confirmado (`error.message` contém "Email not confirmed" ou `error.code === "email_not_confirmed"`) e tratá-lo como sucesso: disparar `auth.resend({ type: "signup", email })` e `router.push("/verificar-email")`. Só cair em /login pra erros realmente inesperados. Alternativa mais simples: mover `auth.resend` pra antes do return de erro do sign-in, e sempre que `signupAction` retorna ok, redirecionar pra `/verificar-email` (mesmo sem sessão — a tela /verificar-email já tem "Já confirmei" que faz `refreshSession` + `getUser`).
**Impacto:** crítico — bloqueia o caminho feliz inteiro do onboarding. Sem corrigir isso, nenhum cliente novo consegue completar o cadastro self-service. Atualmente o roteiro 4.3 → 8 está inteiro inválido com Confirm Email ON.
**Correção aplicada (2026-05-20):** `onboarding.service.ts:47` agora cria o user com `email_confirm: true`. Cliente entra direto no painel pós-cadastro (alinhado ao PLAN.md "cliente loga e vê o painel antes de confirmar"). A tela `/verificar-email` vira passagem instantânea: como `user.email_confirmed_at` já está preenchido, `page.tsx:28` redireciona pra `/conectar-whatsapp` no mesmo carregamento. O gate `email_confirmed_at` em `provision-zapi` continua existindo como defesa em profundidade, mas nunca dispara pra cadastros via wizard (só pra contas manualmente desconfirmadas). **Esse fix muda o setup do roteiro: o item "Confirm email precisa estar habilitado" não é mais relevante — pode ficar ON ou OFF.** Item 4.4 esperava "e-mail não confirmado" — agora é "e-mail confirmado".

### Bug #4 — Middleware não redireciona /precos pra /inbox quando logado ✅ CORRIGIDO
**Onde:** `frontend/middleware.ts` (raiz) — entry-point inválido na estrutura do projeto
**Esperado:** Item 10.1 — usuário logado acessando `/precos` deve ser redirecionado pra `/inbox`. `REDIRECT_WHEN_LOGGED_IN` inclui `/precos` (linha 14 do helper).
**Aconteceu:** Navegando direto pra `http://localhost:3000/precos` com sessão Supabase válida (cookie `sb-...-auth-token` presente, `/inbox` carrega normalmente, `/api/me` retorna user), a página `/precos` renderiza normalmente sem redirect. `fetch('/precos', { redirect: 'manual' })` retorna 200 sem `Location` header — confirmando que o middleware decidiu não redirecionar.
**Repro:** 1. logar como qualquer user. 2. navegar pra `/precos`. 3. ver que fica em `/precos` em vez de ir pra `/inbox`.
**Causa raiz (achada com instrumentação Playwright + log no middleware):** o middleware estava em `frontend/middleware.ts` (raiz do projeto), mas o frontend usa estrutura `src/app/`. Em Next 16 com Turbopack, o entry-point do middleware precisa ficar em `frontend/src/middleware.ts` (ou `proxy.ts`) — o arquivo raiz é silenciosamente ignorado. Sintoma: nenhum log de instrumentação aparecia no console do dev server, mesmo em `/inbox`. A defesa em profundidade em `(app)/layout.tsx` (`if (!user) redirect("/login")`) é que mantinha o painel protegido — o middleware era decorativo.
**Correção aplicada (2026-05-22):**
1. Movido `frontend/middleware.ts` → `frontend/src/middleware.ts` (Next 16 reconheceu, mas avisou "The 'middleware' file convention is deprecated. Please use 'proxy' instead.")
2. Migrado para a nova convenção do Next 16: arquivo renomeado para `frontend/src/proxy.ts`, função exportada renomeada de `middleware` → `proxy`. O helper `src/lib/supabase/middleware.ts` (e a função `updateSession`) ficou como está — é módulo interno, não entry-point.
3. Validado via Playwright: logged-in user navegando para `/precos` → redirect para `/inbox` ✅; idem `/cadastro` ✅. Log do dev server mostra `proxy.ts: 42ms` em cada request.

### Bug #6 — Hydration mismatch em ThemeToggle (Sun/Moon className) ✅ CORRIGIDO
**Encontrado em:** Sweep adicional 2026-05-22 (não estava no roteiro original).
**Onde:** `frontend/src/components/shell/theme-toggle.tsx`
**Esperado:** Console limpo de errors em produção/dev.
**Aconteceu:** Toda página do painel logava no console "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties" apontando para `<Sun>` e `<Moon>` do `ThemeToggle`. Causa: `useTheme()` retorna `resolvedTheme=undefined` no SSR (next-themes resolve no cliente via localStorage/system). Server renderizava modo claro; cliente podia reidratar com dark e os classNames de `rotate/scale/opacity` divergiam.
**Repro:** abrir DevTools → Console e visitar qualquer página interna do painel. Apareceria 1 erro de hydration por render.
**Correção aplicada (2026-05-22):** estado `mounted` + `useEffect` em `ThemeToggle` faz `isDark = mounted && resolvedTheme === "dark"`. Antes do mount, ambos servidor e cliente renderizam com `isDark=false` (idêntico). Após mount, useEffect re-renderiza com o tema real. `suppressHydrationWarning` adicionado nos ícones e botão como defensive belt-and-suspenders. Validado via Playwright: console fica em 0 errors após o fix.

### Bug #5 — Backend offline quebra o painel inteiro (sem fallback) ✅ CORRIGIDO
**Onde:** `frontend/src/lib/backend.ts` — `fetchBackend` sem try/catch ao redor do `fetch`
**Esperado:** Item 10.4 — backend parado, recarregar painel: "Banner some (tolera fetch falhar), painel continua acessível".
**Aconteceu:** Backend parado, navegar pra `/inbox`: tela Next "This page couldn't load — A server error occurred. Reload to try again." com botão Reload. Painel inteiro inacessível. 2 issues no DevTools.
**Repro:** 1. logar. 2. parar o backend Express (`Get-NetTCPConnection -LocalPort 3001 -State Listen | Stop-Process`). 3. navegar pra `/inbox`. 4. ver tela de erro do Next em vez do painel.
**Causa raiz:** `fetchBackend` em `lib/backend.ts` chamava `await fetch(...)` sem try/catch. Com o backend offline, o fetch lança `TypeError: fetch failed` (ECONNREFUSED), e a exceção propaga pro Server Component (no caso, o `TrialBanner` no `(app)/layout.tsx`), derrubando toda a árvore. Outros callers (`assinatura/page.tsx`, etc.) já tratam `!result.ok`, mas nunca recebiam essa branch porque o erro era exception, não return.
**Correção aplicada (2026-05-22):** try/catch ao redor do `fetch` em `fetchBackend`. Erro de rede vira `{ ok: false, error: { status: 0, code: "NETWORK_ERROR", message: "..." } }`. Todos os callers (3 Server Components + 3 actions) já tratam `!result.ok` — o `TrialBanner` retorna `null`, `assinatura/page.tsx` mostra "Não foi possível carregar sua assinatura. Recarregue.", `conectar-whatsapp/page.tsx` redireciona, actions reportam toast. Validado via Playwright: backend offline + navegação para `/inbox` → painel carrega completo, banner some (era esperado) ✅.

