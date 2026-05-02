# Checklist de produção — ImobPro

Tudo que precisa estar **pago, contratado ou configurado** para rodar o ImobPro
com cliente real, organizado por urgência. Atualize toda vez que mudar de plano,
contratar serviço ou descobrir um novo limite de free tier.

> **Status atual (2026-05-01):** desenvolvimento local. Nenhum cliente piloto.
> Tudo rodando em free tier. Resend ainda **não testado** (depende de domínio).

---

## 🔴 Bloqueia o primeiro cliente piloto

Sem isso, o produto não roda na vida real nem para testar com 1 imobiliária.

| Item | Onde | Custo estimado | Notas |
|---|---|---|---|
| **Domínio próprio** (`imobpro.com.br` ou similar) | registro.br | ~R$ 40/ano | Pré-requisito do Resend (e da credibilidade do produto). |
| **Resend** — verificar domínio | resend.com → Domains | Free tier: 3k e-mails/mês, 100/dia | Sem domínio validado, e-mails caem em spam ou nem saem. |
| **Z-API** — instância dedicada do piloto | app.z-api.io | ~R$ 70–100/mês por instância | Cada cliente = 1 instância. Sem isso não recebe nem envia mensagem. |
| **Railway** — sair do free tier se ultrapassar $5/mês | railway.app | $5/mês mínimo (Hobby) | O backend + worker BullMQ + Redis somam horas. Monitore o uso. |
| **Supabase** — manter no free tier no piloto | supabase.com | Free até 500MB DB / 1GB storage / 2GB egress | 1 cliente piloto cabe folgado. Confirme antes de escalar. |
| **Anthropic API** — Claude Sonnet/Haiku | console.anthropic.com | Pay-as-you-go (~US$ 3/MTok input Sonnet) | Cada conversa de 10 mensagens custa centavos. Estimativa real só com tráfego. |
| **OpenAI API** — Whisper (transcrição de áudio) | platform.openai.com | ~US$ 0,006/min de áudio | Áudio será feature paga (Fase 4). No piloto: ligar com cap baixo de spending. |

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

---

## 🟢 Bloqueia Fase 3 (onboarding self-service e cobrança)

Necessário quando o ImobPro vira produto que cliente assina sozinho.

| Item | Notas |
|---|---|
| **Stripe BR** ou **Asaas** | Pra cobrança recorrente automática. Stripe pede CNPJ no Brasil. Asaas é nacional, integra Pix/boleto. Custo: ~3,5% por transação (ambos). |
| **CNPJ** | Pré-requisito pra Stripe e pra emitir nota fiscal. Custo de abertura: variável (R$ 0 com MEI, mais alto pra LTDA). |
| **Conta jurídica** | Caixa, BB ou banco digital (Inter/Stone). Necessária para receber via gateway. |
| **Suporte legal** | LGPD: política de privacidade + termos de uso. Modelo gratuito serve pro piloto, advogado vira necessidade quando o ARR justificar. |

---

## 🔵 Free hoje, vai pesar lá na frente

Ficar atento, mas sem ação imediata.

| Item | O que vigiar |
|---|---|
| **GitHub** | Free pra repos privados ilimitados. Só vira custo se quiser GitHub Actions com muitos minutos. |
| **Anthropic** | System prompt grande + prompt caching reduz custo. Quando passar de US$ 100/mês, ativar cache (já no backlog do PLAN). |
| **OpenAI Whisper** | Áudio é feature paga por design (Fase 4). Mantém custo previsível. |
| **N8N Cloud** | Mencionado no CLAUDE.md mas ainda não usado. Free tier: 5k execuções/mês. Decidir antes de integrar. |
| **Sentry / Logs** | Hoje só tem `console.log`. Antes do segundo cliente, decidir entre Sentry, Logtail ou Better Stack (todos com free tier inicial). |

---

## ❌ Não está em uso (ainda)

Coisas mencionadas no roadmap mas que **não foram contratadas nem implementadas** —
não pague enquanto não chegar a hora.

- **Vivareal / OLX Imóveis** (integração de portfólio — Fase 4)
- **Google Calendar / Gmail / Drive** (integrações via MCP — Fase 4)
- **Managed Agents da Anthropic** (substituir loop manual — Fase 4, fora de Research Preview ainda)

---

## Como atualizar este arquivo

Toda vez que:
- Contratar um serviço pago → mover do "Bloqueia X" pra status atual com ✅
- Estourar um free tier → mover o item pra cima de uma seção
- Descobrir um custo novo (ex: Twilio pra SMS) → criar linha na seção certa
- Cliente piloto fechar → marcar a seção 🔴 inteira como concluída

Mantenha a estimativa de custo em **BRL ou USD explicitando**, e a data da última
revisão no topo.
