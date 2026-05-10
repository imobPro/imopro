# Checklist de produção — ImobPro

Tudo que precisa estar **pago, contratado ou configurado** para rodar o ImobPro
com cliente real, organizado por urgência. Atualize toda vez que mudar de plano,
contratar serviço ou descobrir um novo limite de free tier.

> **Status atual (2026-05-10):** desenvolvimento local. Nenhum cliente piloto.
> Tudo rodando em free tier. Resend ainda **não testado** (depende de domínio).
> LGPD documental: rascunho criado em `docs/privacidade.md` e `docs/termos.md`
> — precisa de revisão de advogado antes da operação em escala.

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
| **Cap de spending Anthropic** | console.anthropic.com → Billing → Limits | Grátis | Definir teto mensal hard (ex: US$ 50) para evitar surpresa em bug que consuma tokens em loop. |
| **Cap de spending OpenAI** | platform.openai.com → Settings → Limits | Grátis | Mesma lógica do Anthropic. Recomendado: US$ 20/mês no piloto. |
| **LGPD — Política de Privacidade** | `docs/privacidade.md` | Grátis | Rascunho criado em 2026-05-10. Vincular no rodapé do painel e no fluxo de onboarding. **Revisão de advogado antes de escalar.** |
| **LGPD — Termos de Uso** | `docs/termos.md` | Grátis | Rascunho criado em 2026-05-10. Aceite explícito no cadastro. **Revisão de advogado antes de escalar.** |
| **LGPD — Acordo de Operador (DPA)** | `docs/dpa.md` | Grátis | Rascunho criado em 2026-05-10. Anexar ao contrato de assinatura do piloto. **Revisão de advogado antes de escalar.** |
| **Sentry — projeto Node** | sentry.io → Free tier (5k errors/mês) | Grátis | Decidido em 2026-05-10: observabilidade primária via Sentry. Integrar com `@sentry/node` no backend e worker BullMQ. |

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

- **Vivareal / OLX Imóveis** (integração de portfólio — Fase 4)
- **Google Calendar / Gmail / Drive** (integrações via MCP — Fase 4)
- **Managed Agents da Anthropic** (substituir loop manual — Fase 4, fora de Research Preview ainda)

---

## ❌ Descartado

Itens que estavam no roadmap mas saíram após análise. Podem voltar se a
necessidade reaparecer.

| Item | Quando saiu | Motivo |
|---|---|---|
| **N8N Cloud** | 2026-05-10 | Mencionado no CLAUDE.md original como camada de "Automações secundárias e webhooks", mas nunca foi usado. Toda lógica está em Node/Express + BullMQ, sem demanda concreta para N8N. Reavaliar se surgir caso de uso de integração no-code com terceiros. |

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
