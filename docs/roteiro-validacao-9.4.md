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
