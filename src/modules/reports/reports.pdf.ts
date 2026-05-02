import pdfmake from 'pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
// @ts-expect-error - subpath sem types em @types/pdfmake; é módulo CJS válido
import Roboto from 'pdfmake/build/fonts/Roboto'
import type { ReportMetrics } from './reports.types'
import type { LeadStatus } from '../leads/leads.types'

let fontsRegistered = false

function ensureFonts(): void {
  if (fontsRegistered) return
  // O bundle Roboto exporta { vfs, fonts }. Em Node.js o pdfmake não lê arquivos
  // do disco — temos que popular o virtualfs com os TTFs (em base64) antes de
  // registrar o mapa de fontes que aponta para esses nomes.
  const vfs = Roboto.vfs as Record<string, { data: string }>
  // pdfmake.virtualfs.writeFileSync existe em runtime mas não está em @types/pdfmake
  const virtualfs = (pdfmake as unknown as {
    virtualfs: { writeFileSync: (name: string, data: Buffer) => void }
  }).virtualfs
  for (const [filename, payload] of Object.entries(vfs)) {
    virtualfs.writeFileSync(filename, Buffer.from(payload.data, 'base64'))
  }
  pdfmake.addFonts(Roboto.fonts)
  fontsRegistered = true
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novos',
  em_conversa: 'Em conversa',
  qualificado: 'Qualificados',
  transferido: 'Transferidos',
  em_negociacao: 'Em negociação',
  fechado: 'Fechados',
  inativo: 'Inativos',
}

const FUNNEL_ORDER: LeadStatus[] = [
  'novo',
  'em_conversa',
  'qualificado',
  'transferido',
  'em_negociacao',
  'fechado',
  'inativo',
]

function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1).replace('.', ',')} h`
  const days = hours / 24
  return `${days.toFixed(1).replace('.', ',')} dias`
}

function formatPeriodLabel(metrics: ReportMetrics): string {
  const start = metrics.period.start.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  const end = new Date(metrics.period.end.getTime() - 1).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  return metrics.period.type === 'monthly'
    ? `Relatório mensal · ${start} a ${end}`
    : `Relatório semanal · ${start} a ${end}`
}

export async function renderReportPdf(metrics: ReportMetrics): Promise<Buffer> {
  ensureFonts()

  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const funnelRows = FUNNEL_ORDER.map((status) => [
    STATUS_LABELS[status],
    { text: String(metrics.funnel[status] ?? 0), alignment: 'right' as const },
  ])

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [48, 56, 48, 56] as [number, number, number, number],
    info: {
      title: `ImobPro · ${metrics.agentName} · ${formatPeriodLabel(metrics)}`,
      author: 'ImobPro',
    },
    content: [
      { text: metrics.realtyName, style: 'realty' },
      { text: formatPeriodLabel(metrics), style: 'period' },
      { text: `Corretor: ${metrics.agentName}`, style: 'agent' },

      { text: 'Resumo do período', style: 'sectionHeader' },
      { text: `${metrics.leadsCount} leads recebidos no período`, style: 'kpi' },

      { text: 'Funil de conversão (estado atual)', style: 'sectionHeader' },
      {
        table: {
          headerRows: 0,
          widths: ['*', 60],
          body: funnelRows,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#dddddd',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },

      { text: 'Tempos médios', style: 'sectionHeader' },
      {
        table: {
          headerRows: 0,
          widths: ['*', 120],
          body: [
            ['Até qualificação', { text: formatHours(metrics.avgQualificationHours), alignment: 'right' as const }],
            ['Até fechamento', { text: formatHours(metrics.avgClosingHours), alignment: 'right' as const }],
          ],
        },
        layout: 'noBorders',
      },
    ],
    footer: () => ({
      text: `Gerado em ${generatedAt} · ImobPro`,
      alignment: 'center' as const,
      fontSize: 8,
      color: '#888888',
      margin: [40, 20, 40, 0] as [number, number, number, number],
    }),
    styles: {
      realty: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
      period: { fontSize: 11, color: '#555555', margin: [0, 0, 0, 2] as [number, number, number, number] },
      agent: { fontSize: 11, color: '#555555', margin: [0, 0, 0, 24] as [number, number, number, number] },
      sectionHeader: {
        fontSize: 13,
        bold: true,
        margin: [0, 18, 0, 8] as [number, number, number, number],
        color: '#1f2937',
      },
      kpi: { fontSize: 22, bold: true, color: '#111827' },
    },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#111827' },
  }

  const buffer = await pdfmake.createPdf(docDefinition).getBuffer()
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
}
