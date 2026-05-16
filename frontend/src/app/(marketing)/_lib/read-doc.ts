import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Lê um arquivo markdown da pasta /docs (na raiz do repo).
 * `process.cwd()` retorna `frontend/` em runtime; subimos um nível.
 */
export async function readDoc(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "..", "docs", filename);
  return readFile(filePath, "utf-8");
}
