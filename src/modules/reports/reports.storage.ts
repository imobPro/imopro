import { supabase } from '../../shared/database/supabase'

const BUCKET = 'reports'

export function buildReportPath(
  tenantId: string,
  agentId: string,
  periodType: 'weekly' | 'monthly',
  periodEnd: Date
): string {
  const dateStr = periodEnd.toISOString().slice(0, 10) // YYYY-MM-DD
  return `${tenantId}/${agentId}/${periodType}-${dateStr}.pdf`
}

export async function uploadReportPdf(filePath: string, buffer: Buffer): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw new Error(`[Reports] uploadReportPdf falhou: ${error.message}`)
}

export async function downloadReportPdf(filePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath)
  if (error) throw new Error(`[Reports] downloadReportPdf falhou: ${error.message}`)
  if (!data) throw new Error(`[Reports] downloadReportPdf retornou data vazio: ${filePath}`)
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
