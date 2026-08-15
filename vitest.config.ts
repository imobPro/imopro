/**
 * Vitest — cobertura de testes com threshold escalonado.
 *
 * Instalação:
 *   npm i -D vitest @vitest/coverage-v8
 *
 * ─── POR QUE NÃO 85% EM TUDO ──────────────────────────────────────────────
 * Um número único para o projeto inteiro tem um efeito perverso: o caminho mais
 * barato pra subir a média é testar o que é fácil. O agente escreve vinte testes
 * de formatação de data, a barra sobe pra 85%, e a função de qualificação de lead
 * continua sem teste nenhum.
 *
 * Média alta não significa que o que importa está coberto.
 *
 * Aqui a barra é por pasta, seguindo a matriz de risco do CLAUDE.md.
 * Módulo crítico não escapa se escondendo atrás da média do projeto.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'node_modules/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/**/index.ts',        // só re-exporta
        'src/**/types/**',
        'src/**/*.types.ts',
        'src/tests/**',           // helpers e setup dos testes
      ],

      thresholds: {
        // ─── Piso do projeto (baseline 2026-08-15) ────────────────────
        // Regra da catraca: baixar um ponto por sprint, nunca subir.
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,

        // ─── ALTO RISCO ───────────────────────────────────────────────
        // shared/database em 90 (está em 90,47 — mantém a barra alta).
        'src/shared/database/**': {
          lines: 90, functions: 90, branches: 80, statements: 90,
        },
        // PROPOSITALMENTE VERMELHO até termos testes de segurança:
        // módulo auth com cobertura 0% não pode ser baselinado. A barra
        // vai ficar em 95 e vamos escrever os testes — não baixar.
        'src/modules/auth/**': {
          lines: 95, functions: 95, branches: 90, statements: 95,
        },
        // PROPOSITALMENTE VERMELHO — leads é onde o dinheiro do cliente
        // aparece; 90 é o piso que o Sprint precisa cobrir.
        'src/modules/leads/**': {
          lines: 90, functions: 90, branches: 85, statements: 90,
        },

        // ─── BASELINE (arredondado para baixo em múltiplos de 5) ──────
        'src/modules/onboarding/**': {
          lines: 75, functions: 65, branches: 70, statements: 70,
        },
        'src/modules/ai-engine/**': {
          lines: 55, functions: 75, branches: 50, statements: 55,
        },
        'src/modules/billing/**': {
          lines: 55, functions: 55, branches: 70, statements: 55,
        },
        'src/modules/tenant-settings/**': {
          lines: 55, functions: 55, branches: 55, statements: 55,
        },
        'src/modules/agents/**': {
          lines: 30, functions: 20, branches: 45, statements: 25,
        },
        'src/modules/reports/**': {
          lines: 40, functions: 50, branches: 30, statements: 40,
        },
        'src/modules/whatsapp/**': {
          lines: 30, functions: 35, branches: 25, statements: 30,
        },
        'src/modules/sentiment/**': {
          lines: 15, functions: 0, branches: 0, statements: 10,
        },
      },
    },
  },
})

/**
 * ─── SOBRE O AGENTE QUE SE RECUSA A ESCREVER TESTE ────────────────────────
 *
 * Você notou certo: regra de TDD no CLAUDE.md não garante teste escrito.
 * Este arquivo é a razão pela qual isso deixa de importar — a barra é
 * verificada por máquina, não pela boa vontade do agente.
 *
 * Mas cuidado com o efeito colateral: sob pressão de threshold, o agente
 * escreve teste que executa a função sem verificar nada, só pra colorir a
 * linha de verde. Cobertura sobe, garantia não.
 *
 * Sintomas de teste-fantasma, que valem uma olhada de vez em quando:
 *   - `expect(resultado).toBeDefined()` como única asserção
 *   - Nenhum `expect` no corpo do teste
 *   - Mock de tudo, inclusive da função que está sendo testada
 *   - Teste que passa mesmo se você comentar o corpo da função
 *
 * O último é o teste do teste: comente o corpo de uma função crítica e rode.
 * Se continuar verde, aquele teste não está protegendo nada. É a versão
 * manual e barata do teste de mutação — sem instalar nada.
 */
