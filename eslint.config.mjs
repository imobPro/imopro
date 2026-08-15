/**
 * ESLint — limites de complexidade.
 *
 * A regra `complexity` é nativa do ESLint: zero instalação extra.
 * O sonarjs adiciona complexidade COGNITIVA, que mede outra coisa e importa mais
 * pra você: ciclomática conta caminhos de execução, cognitiva mede o esforço de
 * um ser humano entender. Um switch de 15 casos tem ciclomática alta e cognitiva
 * baixa — é chato, mas legível. Três ifs aninhados é o contrário.
 *
 * Como você quer garantir que humanos ainda consigam manter o código,
 * a cognitiva é a métrica mais alinhada ao seu objetivo.
 *
 * Instalação:
 *   npm i -D eslint typescript-eslint eslint-plugin-sonarjs @eslint/js
 *
 * ─── COMO CALIBRAR (baseline com catraca) ─────────────────────────────────
 * Ligar isso num projeto existente gera centenas de erros de uma vez. A
 * tentação é afrouxar até parar de reclamar — e aí a métrica morre.
 *
 * Faça assim:
 *   1. Rode com os valores abaixo e veja quantos erros aparecem
 *   2. Se forem muitos, suba os limites até o seu pior arquivo passar
 *   3. Anote os números no CLAUDE.md como "baseline atual"
 *   4. Baixe UM ponto a cada sprint
 *
 * O que importa não é o número absoluto, é a direção. A catraca impede que
 * piore enquanto você melhora.
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  // Ignores globais: frontend tem seu próprio ESLint (Next.js);
  // migrations/docs/.claude não são código de produção.
  // vitest.config.ts é config de build (roda no Node, fora do tsconfig).
  // src/tests/load é k6 (runtime próprio, não Node).
  {
    ignores: [
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'frontend/**',
      'migrations/**',
      'docs/**',
      '.claude/**',
      'audit temporaria/**',
      'vitest.config.ts',
      'src/tests/load/**',
      '.dependency-cruiser.cjs',
      'eslint.config.mjs',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // projectService descobre o tsconfig automaticamente por arquivo.
        // allowDefaultProject cobre scripts e configs soltos na raiz que
        // não estão em nenhum tsconfig — sem eles o parser explode.
        projectService: {
          allowDefaultProject: ['*.js', '*.cjs', '*.mjs'],
        },
      },
    },
    plugins: { sonarjs },
    rules: {
      // ─── Complexidade — BASELINE 2026-08-15 ──────────────────────────
      // Limites ligeiramente acima do pior arquivo real (exceto
      // processWhatsAppJob, que está em quarentena — ver override abaixo).
      // Regra da catraca (CLAUDE.md): baixar um ponto por sprint, nunca subir.
      complexity: ['error', { max: 25 }],
      'sonarjs/cognitive-complexity': ['error', 20],

      // Sintomas que quase sempre acompanham complexidade alta
      'max-depth': ['error', 4],
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 5],
      'max-nested-callbacks': ['error', 3],

      // ─── Duplicação ──────────────────────────────────────────────────
      // Agente adora resolver o mesmo problema três vezes de jeitos diferentes.
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],

      // ─── TypeScript strict de verdade ────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      // Promise sem await é a origem silenciosa de metade dos bugs de fila
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Underscore prefix = intencionalmente não usado. Necessário para o
      // errorHandler do Express, que só é reconhecido como error middleware
      // com os 4 parâmetros — remover `_next` quebra o framework.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // ─── Fronteiras (reforça o dependency-cruiser dentro do editor) ──
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'O client do Supabase usa service_role e ignora RLS. Use tenantDb() ' +
                'de src/shared/database — ele aplica client_id obrigatoriamente.',
            },
          ],
        },
      ],
    },
  },

  // O repositório de banco é o único lugar que pode importar o Supabase
  {
    files: ['src/shared/database/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // QUARENTENA (baseline 2026-08-15) — whatsapp.worker.ts.
  // Números no momento do baseline (ver docs/divida-tecnica.md):
  //   - complexity:                   processWhatsAppJob = 56    (teto 25)
  //   - sonarjs/cognitive-complexity: processWhatsAppJob = 108   (teto 20)
  //   - max-params:                   alertCorretor      = 6     (teto 5)
  //   - max-lines-per-function:       processWhatsAppJob = 283   (teto 100)
  //   - max-depth:                    processWhatsAppJob = 5     (teto 4)
  //   - max-lines (arquivo):          469                        (teto 300)
  //   - cobertura de linhas:          3,77%
  // Função mais crítica e menos testada do sistema. Refatoração planejada em
  // docs/divida-tecnica.md — Sprint dedicado após primeiro cliente pagante.
  // NÃO ESTENDER esta função: qualquer código novo vai para função separada
  // chamada por ela; a assinatura de processWhatsAppJob não cresce.
  {
    files: ['src/modules/whatsapp/whatsapp.worker.ts'],
    rules: {
      complexity: 'off',
      'sonarjs/cognitive-complexity': 'off',
      'max-params': 'off',
      'max-lines-per-function': 'off',
      'max-depth': 'off',
      'max-lines': 'off',
    },
  },

  // Testes: função longa em teste é normal, não é dívida.
  // Mock e stub trabalham com valores dinâmicos por natureza. Estas regras
  // são desenhadas para código de produção e geram ruído em teste, escondendo
  // problema real no meio do volume.
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'src/tests/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-identical-functions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
);
