// Aumenta @types/pdfmake com `virtualfs.writeFileSync` — API interna do
// pdfmake em Node.js que @types/pdfmake só declara como browser-only via
// `addVirtualFileSystem`. Sem isso, popular o VFS antes de `addFonts()` exige
// cast unsafe. Usada em reports.pdf.ts.
//
// O `export {}` mantém o arquivo em modo módulo — necessário para que
// `declare module 'pdfmake'` AUMENTE @types/pdfmake em vez de substituir. A
// declaração do subpath `pdfmake/build/fonts/Roboto` (novo módulo, não
// aumento) mora em `pdfmake-fonts.d.ts` em modo ambient, porque declare-module
// só pode declarar novos módulos fora de contexto de módulo.

export {}

declare module 'pdfmake' {
  export const virtualfs: {
    writeFileSync(fileName: string, data: Buffer): void
  }
}
