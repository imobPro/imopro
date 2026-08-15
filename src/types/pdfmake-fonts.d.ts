// Declara o subpath `pdfmake/build/fonts/Roboto` — bundle CJS de fontes que
// exporta { vfs, fonts } e não tem d.ts oficial em @types/pdfmake.
//
// Arquivo em modo ambient (sem imports/exports no topo) porque `declare
// module 'X'` só declara módulos NOVOS fora de contexto de módulo. O aumento
// de `pdfmake` com `virtualfs` mora em `pdfmake.d.ts` (modo módulo). Referência
// a TFontDictionary usa `import(...)` inline, que preserva o modo ambient.

declare module 'pdfmake/build/fonts/Roboto' {
  const fontContainer: {
    vfs: Record<string, { data: string }>
    fonts: import('pdfmake/interfaces').TFontDictionary
  }
  export default fontContainer
}
