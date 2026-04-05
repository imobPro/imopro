# SKILL.md — seguranca

## O que é esta skill

Esta skill define todas as regras de segurança do ImobPro SaaS.
Deve ser consultada antes de qualquer deploy em produção e durante a construção de qualquer módulo que lida com dados, autenticação ou comunicação externa.

O objetivo é garantir que o sistema não seja hackeado, que credenciais nunca vazem e que dados dos clientes estejam sempre protegidos.

---

## Quando usar

- Antes de qualquer deploy em produção (Railway, Vercel)
- Ao construir qualquer endpoint que recebe dados externos
- Ao configurar integração com Z-API, Supabase, Claude API ou Stripe
- Ao criar ou modificar qualquer sistema de autenticação
- Periodicamente — a cada fase concluída — para auditoria geral

---

## Camada 1 — Credenciais e segredos

### Regras absolutas — NUNCA violar

- **NUNCA commitar arquivos `.env`** — o `.gitignore` já protege, mas sempre confirmar antes do commit
- **NUNCA hardcodar API keys, tokens ou senhas no código** — sempre usar `process.env.NOME_DA_VARIAVEL`
- **NUNCA logar credenciais** — verificar se nenhum `console.log` imprime tokens ou senhas
- **NUNCA compartilhar chaves reais** em conversas, prints ou documentos

### Em produção (Railway e Vercel)

- Todas as variáveis do `.env.example` devem ser configuradas no painel do Railway/Vercel
- Nunca criar arquivo `.env` no servidor — usar sempre as variáveis de ambiente do painel
- Usar variáveis diferentes para desenvolvimento e produção (chaves separadas)

### Se uma credencial vazar

Agir imediatamente na seguinte ordem:
1. **Supabase** — Settings → API → Revogar e gerar nova chave
2. **Anthropic** — console.anthropic.com → API Keys → Deletar e criar nova
3. **Z-API** — Painel Z-API → Token → Regenerar
4. **Stripe/Asaas** — Painel → Desenvolvedores → Revogar chave
5. Atualizar as variáveis no Railway e Vercel imediatamente
6. Verificar logs para identificar se a chave foi usada indevidamente

---

## Camada 2 — Banco de dados (Supabase)

### Regras obrigatórias

- **RLS ativo em TODAS as tabelas** — sem exceção, configurar na criação
- **`client_id` em todas as queries** — nunca buscar dados sem filtrar por tenant
- **Usar `SUPABASE_SERVICE_ROLE_KEY` apenas no backend** — nunca expor no frontend
- **`SUPABASE_ANON_KEY` apenas para operações públicas** — login e cadastro inicial
- **Backups automáticos** — ativar no painel do Supabase (plano pago) ou fazer export semanal manual

### Política RLS padrão para toda tabela nova

```sql
-- Usuário só acessa dados do próprio tenant
CREATE POLICY "tenant_isolation" ON nome_da_tabela
  FOR ALL USING (client_id = auth.jwt() ->> 'client_id');
```

### Dados sensíveis

- Nunca armazenar senhas em texto puro — usar sempre hash (bcrypt)
- Números de telefone e e-mails são dados pessoais (LGPD) — tratar com cuidado
- Histórico de conversas contém dados pessoais — implementar prazo de retenção

---

## Camada 3 — Backend (Node.js + Express)

### Autenticação JWT

- Token JWT com expiração máxima de 24 horas
- Refresh token com expiração de 7 dias
- Validar token em TODAS as rotas protegidas via middleware
- Nunca confiar em dados que chegam sem autenticação

### Rate limiting — proteção contra ataques

Implementar em todas as rotas públicas:

```typescript
import rateLimit from 'express-rate-limit'

// Rotas de login — máximo 5 tentativas por 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas. Tente novamente em 15 minutos.'
})

// Rotas gerais — máximo 100 requisições por minuto
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
})
```

### Validação de dados de entrada

- Validar e sanitizar TODOS os dados que chegam via request
- Nunca confiar em dados enviados pelo cliente
- Usar biblioteca de validação (Zod ou Joi) em todos os endpoints

```typescript
import { z } from 'zod'

const leadSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+55\d{10,11}$/),
  intent: z.enum(['compra', 'aluguel', 'venda', 'info'])
})
```

### Proteção contra ataques comuns

- **SQL Injection** — usar sempre queries parametrizadas, nunca concatenar strings SQL
- **XSS** — sanitizar qualquer dado que vai para o HTML
- **CORS** — configurar para aceitar apenas origens conhecidas (seu domínio)

```typescript
import cors from 'cors'

app.use(cors({
  origin: [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL],
  credentials: true
}))
```

---

## Camada 4 — Webhook Z-API

Todo webhook recebido da Z-API deve ser validado antes de processar.
Um atacante poderia enviar requisições falsas fingindo ser a Z-API.

```typescript
// Validar token de autenticação do webhook
const validateWebhook = (req, res, next) => {
  const token = req.headers['x-api-token']
  if (token !== process.env.ZAPI_CLIENT_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}
```

---

## Camada 5 — Frontend (Next.js)

- **Nunca expor variáveis secretas no frontend** — apenas variáveis com prefixo `NEXT_PUBLIC_` vão para o browser
- **HTTPS obrigatório** — o Vercel ativa automaticamente, nunca desativar
- **Tokens JWT armazenados em cookies httpOnly** — nunca em localStorage
- **Logout limpa todos os cookies e tokens**

---

## Camada 6 — LGPD (Lei Geral de Proteção de Dados)

O ImobPro lida com dados pessoais de leads brasileiros. Obrigações legais:

- **Opt-in explícito** — o lead deve concordar antes de ter dados armazenados
- **Opt-out a qualquer momento** — "Digite SAIR para encerrar o atendimento"
- **Direito de exclusão** — o corretor pode deletar todos os dados de um lead
- **Direito de acesso** — o lead pode pedir quais dados estão armazenados
- **Prazo de retenção** — definir quanto tempo os dados ficam (sugestão: 2 anos)
- **Não compartilhar dados entre tenants** — garantido pelo RLS

Mensagem de opt-in obrigatória no início de toda conversa:
> "Olá! Sou o assistente virtual da [Imobiliária]. Para continuar, seus dados (nome e telefone) serão armazenados para atendimento. Digite SAIR a qualquer momento para encerrar."

---

## Checklist pré-deploy — OBRIGATÓRIO

Antes de qualquer deploy em produção, confirmar cada item:

**Credenciais**
- [ ] Nenhum arquivo `.env` commitado no GitHub
- [ ] Todas as variáveis configuradas no Railway e Vercel
- [ ] Nenhuma API key hardcodada no código
- [ ] Nenhum `console.log` imprimindo dados sensíveis

**Banco de dados**
- [ ] RLS ativo em todas as tabelas
- [ ] `client_id` presente em todas as queries
- [ ] Backups configurados

**Backend**
- [ ] Rate limiting ativo nas rotas públicas
- [ ] Validação de dados em todos os endpoints
- [ ] CORS configurado para domínios corretos
- [ ] Webhook Z-API validando token de autenticação
- [ ] JWT com expiração configurada

**Frontend**
- [ ] Nenhuma variável secreta com prefixo `NEXT_PUBLIC_`
- [ ] HTTPS ativo
- [ ] Tokens em cookies httpOnly

**LGPD**
- [ ] Mensagem de opt-in ativa no início das conversas
- [ ] Fluxo de opt-out funcionando
- [ ] Função de exclusão de dados implementada

---

## O que fazer se o sistema for atacado

1. **Revogar todas as credenciais imediatamente** — seguir ordem da Camada 1
2. **Verificar logs** — Railway e Supabase têm logs de acesso
3. **Identificar o vetor de ataque** — como entraram?
4. **Corrigir a vulnerabilidade** antes de reativar o sistema
5. **Notificar os clientes afetados** — obrigação legal pela LGPD
6. **Registrar o incidente** no CHANGELOG.md com data e ações tomadas

---

## Dependências de segurança a instalar

```bash
npm install helmet express-rate-limit zod bcryptjs jsonwebtoken cors
npm install -D @types/bcryptjs @types/jsonwebtoken @types/cors
```

- **helmet** — configura cabeçalhos HTTP de segurança automaticamente
- **express-rate-limit** — proteção contra flood de requisições
- **zod** — validação de dados de entrada
- **bcryptjs** — hash de senhas
- **jsonwebtoken** — geração e validação de JWT
- **cors** — controle de origens permitidas
