# SKILL.md — gerar-relatorio

## O que é esta skill

Esta skill implementa a geração de relatórios automáticos no ImobPro. Os relatórios consolidam dados de leads, sentimento e atendimento por tenant e são enviados mensalmente por e-mail em PDF.

Use esta skill ao construir o módulo de relatórios ou ao adicionar novas métricas a um relatório existente.

---

## Quando usar

- Ao implementar o módulo `/reports` pela primeira vez
- Ao adicionar uma nova métrica ao relatório mensal
- Ao ajustar o layout ou os dados do PDF gerado
- Ao configurar o envio automático por e-mail

---

## Regras obrigatórias — NUNCA violar

1. **Todo relatório deve ser filtrado por `client_id`** — nunca misturar dados de tenants
2. **Relatórios são gerados assincronamente** — nunca bloquear a request do usuário
3. **PDFs são armazenados no Supabase Storage** — nunca servir PDFs gerados em memória diretamente
4. **Envio de e-mail via fila BullMQ** — nunca enviar síncronamente no dia do agendamento
5. **Dados agregados, nunca raw** — o relatório mostra métricas, não conversas individuais (LGPD)
6. **Falha no envio de e-mail não pode derrubar o sistema** — tratar com retry na fila

---

## Como executar

### Passo 1 — Defina as métricas do relatório

Com base no PRD.md, o relatório mensal deve incluir:

**Métricas de volume**
- Total de leads recebidos no mês
- Total de conversas iniciadas
- Taxa de qualificação (leads qualificados / total)
- Tempo médio de primeira resposta (segundos)

**Funil de conversão**
- Novo → Em conversa → Qualificado → Transferido → Perdido
- Percentual em cada etapa

**Distribuição por intenção**
- Compra: X leads (Y%)
- Aluguel: X leads (Y%)
- Venda: X leads (Y%)
- Informação: X leads (Y%)

**Análise de sentimento agregada**
- Positivo: X% das conversas
- Neutro: X% das conversas
- Negativo: X% das conversas

**Destaques do período**
- Dia com mais leads recebidos
- Bairro mais demandado
- Horário de pico de atendimento

### Passo 2 — Implemente a query de agregação

```typescript
// reports.service.ts
async function aggregateMonthlyData(
  clientId: string,
  month: number,
  year: number
): Promise<ReportData> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  // Toda query DEVE filtrar por client_id
  const { data: leads } = await supabase
    .from('leads')
    .select('status, intent, created_at')
    .eq('client_id', clientId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  return buildReportData(leads)
}
```

### Passo 3 — Gere o PDF

Use uma biblioteca de geração de PDF. Estrutura recomendada do documento:

```
Página 1 — Capa
  Logo da imobiliária (se cadastrado)
  "Relatório de Atendimento — [Mês/Ano]"
  Nome da imobiliária
  Gerado em: [data]

Página 2 — Resumo executivo
  Total de leads | Taxa de qualificação | Tempo médio de resposta

Página 3 — Funil de conversão
  Gráfico de funil com as etapas e percentuais

Página 4 — Distribuição por intenção
  Gráfico de pizza ou barras

Página 5 — Sentimento das conversas
  Distribuição de sentimentos

Página 6 — Destaques e próximos passos
  Top 3 insights do período
```

### Passo 4 — Armazene o PDF no Supabase Storage

```typescript
async function storePdf(
  clientId: string,
  month: number,
  year: number,
  pdfBuffer: Buffer
): Promise<string> {
  const fileName = `reports/${clientId}/${year}-${String(month).padStart(2, '0')}.pdf`

  const { error } = await supabase.storage
    .from('reports')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (error) throw new Error(`Falha ao armazenar relatório: ${error.message}`)

  return fileName
}
```

### Passo 5 — Configure o agendamento mensal

O relatório deve ser gerado automaticamente no dia 1 de cada mês para todos os tenants ativos.

Use BullMQ com job recorrente:

```typescript
// reports.queue.ts
await reportQueue.add(
  'generate-monthly-reports',
  {},
  {
    repeat: { pattern: '0 6 1 * *' }, // dia 1 de cada mês às 6h
    jobId: 'monthly-report-recurring'
  }
)
```

O worker deve:
1. Buscar todos os tenants ativos
2. Para cada tenant, enfileirar um job individual de geração
3. Cada job gera o PDF, armazena e enfileira o envio por e-mail

### Passo 6 — Envie por e-mail

```typescript
// Estrutura do e-mail
const emailPayload = {
  to: tenant.email,
  subject: `Relatório de Atendimento — ${monthName}/${year} | ImobPro`,
  body: `
    Olá, ${tenant.name}!

    Seu relatório mensal de atendimento está pronto.
    
    Resumo rápido:
    - ${data.totalLeads} leads recebidos
    - ${data.qualificationRate}% de taxa de qualificação
    - Bairro mais demandado: ${data.topNeighborhood}

    O relatório completo está em anexo e também disponível no seu painel.
  `,
  attachment: { filename: `relatorio-${month}-${year}.pdf`, path: pdfStoragePath }
}
```

### Passo 7 — Exponha no painel web

O corretor deve poder:
- Ver a lista de relatórios anteriores no painel
- Fazer download de qualquer relatório passado
- Endpoint: `GET /api/reports/:clientId` — lista os relatórios disponíveis
- Endpoint: `GET /api/reports/:clientId/:reportId/download` — gera URL temporária de download

---

## Checklist de entrega

- [ ] Todas as queries filtradas por `client_id`
- [ ] Geração assíncrona via BullMQ (nunca síncrona)
- [ ] PDF armazenado no Supabase Storage
- [ ] Job recorrente configurado (dia 1 de cada mês)
- [ ] E-mail com retry em caso de falha
- [ ] Relatórios disponíveis para download no painel
- [ ] Dados agregados — sem exposição de conversas individuais
- [ ] CHANGELOG.md atualizado

---

## Exemplo de abertura

> "Vou implementar o módulo de relatórios. Antes de começar, preciso confirmar com você: além das métricas do PRD, tem alguma informação específica que você sabe que os corretores sempre pedem nos primeiros meses de uso?"
