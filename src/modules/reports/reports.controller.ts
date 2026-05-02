import type { Request, Response } from 'express'
import { HttpError } from '../../shared/errors/http-error'
import { listReportsForAgent, getReportForAgent } from './reports.service'
import { downloadReportPdf } from './reports.storage'

export async function listReports(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, 'MISSING_AUTH', 'Não autenticado')

  const reports = await listReportsForAgent(req.auth.agentId)
  res.json({ reports })
}

export async function downloadReport(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, 'MISSING_AUTH', 'Não autenticado')

  const reportId = req.params.id
  if (typeof reportId !== 'string' || reportId.length === 0) {
    throw new HttpError(400, 'MISSING_REPORT_ID', 'reportId obrigatório')
  }

  const report = await getReportForAgent(req.auth.agentId, reportId)
  if (!report) throw new HttpError(404, 'REPORT_NOT_FOUND', 'Relatório não encontrado')

  const pdf = await downloadReportPdf(report.filePath)
  const filename = report.filePath.split('/').pop() ?? 'relatorio.pdf'

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(pdf)
}
