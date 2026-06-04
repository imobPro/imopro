# Checklist de produção — ImobPro

Tudo que precisa estar **pago, contratado ou configurado** para rodar o ImobPro
com cliente real, organizado por urgência. Atualize toda vez que mudar de plano,
contratar serviço ou descobrir um novo limite de free tier.

> **Status atual (2026-05-16):** desenvolvimento local. Nenhum cliente piloto.
> Tudo rodando em free tier. Resend ainda **não testado** (depende de domínio).
> LGPD documental: rascunho criado em `docs/privacidade.md` e `docs/termos.md`
> — precisa de revisão de advogado antes da operação em escala.
> Sprint 9.2 (onboarding backend) entregue — ver itens novos na seção 🟢 Fase 3.
> Migrations 011 e 012 já aplicadas no Supabase.

---

## 🔴 Bloqueia o primeiro cliente piloto

Sem isso, o produto não roda na vida real nem para testar com 1 imobiliária.

### Infra paga

| Item | Onde | Custo estimado | Notas |
|---|---|---|---|
| **Domínio próprio** (`imobpro.com.br` ou similar) | registro.br | ~R$ 40/ano | Pré-requisito do Resend (e da credibilidade do produto). |
| **Resend** — verificar domínio | resend.com → Domains | Free tier: 3k e-mails/mês, 100/dia | Sem domínio validado, e-mails caem em spam ou nem saem. |
| **Z-API** — instância dedicada do piloto | app.z-api.io | ~R$ 70–100/mês por instância | Cada cliente = 1 instância. Sem isso não recebe nem envia mensagem. |
| **Railway** — sair do free tier se ultrapassar $5/mês | railway.app | $5/mês mínimo (Hobby) | O backend + worker BullMQ + Redis somam horas. Monitore o uso. |
| **Supabase** — manter no free tier no piloto | supabase.com | Free até 500MB DB / 1GB storage / 2GB egress | 1 cliente piloto cabe folgado. Confirme antes de escalar. |
| **Anthropic API** — Claude Sonnet/Haiku | console.anthropic.com | Pay-as-you-go (~US$ 3/MTok input Sonnet) | Cada conversa de 10 mensagens custa centavos. Estimativa real só com tráfego. |
| **OpenAI API** — Whisper (transcrição de áudio) | platform.openai.com | ~US$ 0,006/min de áudio | Áudio será feature paga (Fase 4). No piloto: ligar com cap baixo de spending. |

### Configuração gratuita (mas obrigatória antes do piloto)

| Item | Onde | Custo | Notas |
|---|---|---|---|
| ~~**Cap de spending Anthropic**~~ ✅ | console.anthropic.com → Settings → Limites | Grátis | Configurado em 2026-05-30: hard US$ 50/mês + alerta por e-mail em US$ 30. Reset todo dia 1. |
| **Cap de spending OpenAI** | platform.openai.com → Settings → Limits | Grátis | **Adiado** (decisão 2026-05-30) — Arthur ainda sem caixa pra contratar OpenAI/Whisper no piloto. Quando contratar, recomendado: US$ 20/mês. Implicação atual: lead que mandar áudio recebe falha do `transcribeAudio`; feature flag pra fallback elegante fica pra depois (ver project_status_pre_cliente em memory). |
| **LGPD — Política de Privacidade** | `docs/privacidade.md` | Grátis | Rascunho criado em 2026-05-10. Vincular no rodapé do painel e no fluxo de onboarding. **Revisão de advogado antes de escalar.** |
| **LGPD — Termos de Uso** | `docs/termos.md` | Grátis | Rascunho criado em 2026-05-10. Aceite explícito no cadastro. **Revisão de advogado antes de escalar.** |
| **LGPD — Acordo de Operador (DPA)** | `docs/dpa.md` | Grátis | Rascunho criado em 2026-05-10. Anexar ao contrato de assinatura do piloto. **Revisão de advogado antes de escalar.** |
| ~~**Sentry — projeto Node**~~ ✅ | sentry.io → Free tier (5k errors/mês) | Grátis | Configurado em 2026-06-04: projeto criado, DSN em `.env` local (`SENTRY_DSN` + `SENTRY_ENVIRONMENT=development`). SDK já estava integrado desde Sprint 9.4. **Pendência:** replicar `SENTRY_DSN` no Railway com `SENTRY_ENVIRONMENT=production` no deploy. |

---

## 🟡 Bloqueia rodar com 5+ clientes

Vira problema conforme você adiciona pilotos. Não trava o primeiro, mas limita a escala.

| Item | Limite que estoura | Próximo passo |
|---|---|---|
| **Supabase Pro** | DB > 500MB, storage > 1GB, egress > 2GB/mês | US$ 25/mês — habilita backups diários e mais cota. |
| **Railway** uso > $5 crédito | Worker BullMQ rodando 24/7 + backend Express | Subir pro plano Pro (US$ 20/mês) ou otimizar uso. |
| **Resend free tier** | > 3k e-mails/mês ou > 100/dia | US$ 20/mês (50k e-mails). 5 clientes × 4 corretores × 1 mensal + 4 semanais = 100 e-mails/mês — folgado, mas com 20 clientes já aperta. |
| **Z-API** | Custo linear por instância | Negociar volume direto com Z-API quando passar de 10 clientes. |
| **Vercel** | Build minutes / bandwidth | Free tier do Hobby suporta tráfego baixo; upgrade no Pro (US$ 20/mês) se for ficar sério. |
| **Sentry free tier** | > 5k errors/mês ou perda de performance traces | US$ 26/mês (Team) — habilita 50k errors, mais retenção e alertas. |
| **BetterStack** (logs + uptime + status page) | A integrar no 2º cliente | Free tier: 1GB logs/mês + 10 monitors uptime + status page pública. Vira diferencial perante o cliente (transparência de uptime). |
| **LGPD — revisão por advogado** | Antes do 2º cliente ou de qualquer comunicação institucional | Custo: variável (R$ 1k–3k para o conjunto de 3 documentos). |

---

## 🟢 Bloqueia Fase 3 (onboarding self-service e cobrança)

Necessário quando o ImobPro vira produto que cliente assina sozinho.

| Item | Notas |
|---|---|
| ~~**Rodar migration 012 no Supabase**~~ ✅ | Aplicada por Arthur em 2026-05-16. Migrations 011 e 012 fechadas. |
| **`BACKEND_PUBLIC_URL` no Railway** | URL pública do backend (ex.: `https://imobpro.up.railway.app`). A Z-API posta nela as callbacks das instâncias provisionadas (`/webhook/whatsapp` e `/webhook/zapi-status`). Sem ela, `POST /api/onboarding/provision-zapi` responde 500. |
| ~~**Setting "Confirm email" no Supabase Auth**~~ ✅ | Resolvido em 2026-05-20: `onboarding.service.ts` agora cria o user com `email_confirm: true`. O cliente entra direto no painel; a setting "Confirm email" do Supabase Auth ficou irrelevante (pode estar ON ou OFF). O gate de e-mail confirmado em `provision-zapi` continua como defesa em profundidade. |
| ~~**Client-token por instância (Z-API)**~~ ✅ | Resolvido em 2026-05-22 (Sprint 9.6): `/webhook/whatsapp` autentica por posse do `instanceId` (UUID 30+ chars gerado pela Partner API) — `resolveTenantByInstance` busca o tenant em `tenants.zapi_instance_id`. Removidos `ZAPI_CLIENT_TOKEN` e o middleware `requireZapiToken`. **Pendência operacional pra legacy piloto manual**: gravar o `instanceId` da instância manual em `tenants.zapi_instance_id` via SQL antes do deploy (não há código novo, é one-shot). |
| ~~**Verificar payload das callbacks de status da Z-API**~~ ✅ | Verificado em 2026-05-22 (Sprint 9.6) via context7 → doc oficial. Connected: `{ type: 'ConnectedCallback', connected: true, instanceId, phone, momment }`. Disconnected: `{ type: 'DisconnectedCallback', disconnected: true, instanceId, error, momment }`. `classifyEvent` corrigido — antes checava `connected === false` em vez de `disconnected === true` (dead code). |
| **Caps de spending revisados para tráfego self-service** | Com onboarding aberto, o número de tenants pode crescer rápido — reavaliar os tetos da Anthropic/OpenAI antes de divulgar o cadastro. |
| **Stripe BR** ou **Asaas** | Pra cobrança recorrente automática. Stripe pede CNPJ no Brasil. Asaas é nacional, integra Pix/boleto. Custo: ~3,5% por transação (ambos). |
| **CNPJ** | Pré-requisito pra Stripe e pra emitir nota fiscal. **MEI é gratuito** e atende ao piloto (limite R$ 81k/ano). Migrar para LTDA quando o ARR justificar. |
| **Conta jurídica** | Caixa, BB ou banco digital (Inter/Stone). Necessária para receber via gateway. |
| **Substituir CPF do controlador nos documentos LGPD** | Quando o CNPJ for ativado, atualizar `docs/privacidade.md` e `docs/termos.md` (seção "Prestador" e "Controlador"). |

---

## 🔵 Free hoje, vai pesar lá na frente

Ficar atento, mas sem ação imediata.

| Item | O que vigiar |
|---|---|
| **GitHub** | Free pra repos privados ilimitados. Só vira custo se quiser GitHub Actions com muitos minutos. |
| **Anthropic** | System prompt grande + prompt caching reduz custo. Quando passar de US$ 100/mês, ativar cache (já no backlog do PLAN). |
| **OpenAI Whisper** | Áudio é feature paga por design (Fase 4). Mantém custo previsível. |
| **Sentry / BetterStack** | Já decididos como stack de observabilidade. Free tier inicial cabe; planos pagos só com 5+ clientes. |

---

## ❌ Não está em uso (ainda)

Coisas mencionadas no roadmap mas que **não foram contratadas nem implementadas** —
não pague enquanto não chegar a hora.

- **Google Calendar / Gmail / Drive** (integrações via MCP — Fase 4)
- **Managed Agents da Anthropic** (substituir loop manual — Fase 4, fora de Research Preview ainda)

---

## ❌ Descartado

Itens que estavam no roadmap mas saíram após análise. Podem voltar se a
necessidade reaparecer.

| Item | Quando saiu | Motivo |
|---|---|---|
| **N8N Cloud** | 2026-05-10 | Mencionado no CLAUDE.md original como camada de "Automações secundárias e webhooks", mas nunca foi usado. Toda lógica está em Node/Express + BullMQ, sem demanda concreta para N8N. Reavaliar se surgir caso de uso de integração no-code com terceiros. |
| **Captação ativa de imóveis (Vivareal / OLX scraping)** | 2026-05-24 | Avaliada como nova feature: monitorar anúncios de proprietários em portais para corretores prospectarem. Descartada por dois motivos. (1) ToS dos portais brasileiros proíbem raspagem por terceiros — Vivareal/OLX já moveram ações contra produtos similares; liminar derrubaria a feature de todos os clientes ao mesmo tempo. (2) LGPD: captura de telefone+nome de anunciante PF para prospecção comercial tem base legal frágil ("legítimo interesse" com ônus da prova no controlador). Captação inbound (proprietário que escolhe nos procurar) já é coberta pelo `intent=venda` da IA atual — não é feature nova. Reavaliar só se houver parceria oficial com algum portal, e somente com 3+ clientes pagantes pra ter leverage comercial. |

---

## Como atualizar este arquivo

Toda vez que:
- Contratar um serviço pago → mover do "Bloqueia X" pra status atual com ✅
- Estourar um free tier → mover o item pra cima de uma seção
- Descobrir um custo novo (ex: Twilio pra SMS) → criar linha na seção certa
- Cliente piloto fechar → marcar a seção 🔴 inteira como concluída
- Descartar uma dependência → registrar em "❌ Descartado" com data e motivo

Mantenha a estimativa de custo em **BRL ou USD explicitando**, e a data da última
revisão no topo.
