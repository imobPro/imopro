# DESIGN.md — ImobPro

Sistema visual do painel ImobPro. Fonte da verdade para qualquer trabalho de UI no projeto. Atualizar este arquivo antes de mudar tokens; nunca o contrário.

---

## Filosofia

Aconchego profissional. O painel é uma ferramenta de trabalho diária do corretor — precisa transmitir competência sem frieza. A IA atende como gente, não como robô. Identidade própria, não cópia de WhatsApp nem dashboard SaaS genérico.

**Nunca:**
- Emojis em código, markup, copy, alt text. Use ícones Lucide quando precisar de glifo.
- Gradientes "purple to pink" ou outros padrões de saída de LLM (taste-skill banido).
- Bounce, elastic, springs exagerados. Easings de saída suave (`ease-out-quart`, `ease-out-expo`).
- Cinza puro (`#888`, `oklch(0.X 0 0)`). Todos os neutros têm tinta zinc/stone (chroma 0.005-0.012).
- Animar para decorar. Movimento serve propósito ou sai.

**Sempre:**
- Tom profissional, frases diretas, sem "Claro!" / "Ótimo!" / "Com certeza!" em copy.
- Mobile-first. A primeira demo abre no celular do corretor.
- WCAG AA mínimo (contraste 4.5:1 texto, 3:1 elementos interativos).
- Respeitar `prefers-reduced-motion`.

---

## Paleta

Definida em `frontend/src/app/globals.css` via `@theme inline` + `:root` + `.dark`. Valores em **OKLCH** para perceptual uniformity.

### Acento — âmbar dourado

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--primary` | `oklch(0.78 0.16 75)` | `oklch(0.80 0.16 75)` | Botões primários, score alto, badge ativo, ring de foco |
| `--primary-foreground` | `oklch(0.20 0.02 70)` | `oklch(0.18 0.02 70)` | Texto sobre âmbar (zinc-900 ≈ 7:1 contraste) |
| `--ring` | `--primary / 0.55` | `--primary / 0.6` | Halo de foco visível com transparência |

Reservar âmbar para: ação primária por superfície, score do lead 4-5, indicador de estado ativo, ícone do tab atual. Não usar em texto corrido nem decoração.

### Neutros — stone tintado (não cinza puro)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--background` | `oklch(0.995 0.002 75)` | `oklch(0.16 0.005 75)` | Fundo da página |
| `--foreground` | `oklch(0.18 0.008 75)` | `oklch(0.96 0.005 75)` | Texto principal |
| `--card` | `oklch(1 0 0)` | `oklch(0.215 0.006 75)` | Superfície elevada (cards, popovers) |
| `--muted` | `oklch(0.96 0.005 75)` | `oklch(0.27 0.008 75)` | Bolha do lead, hover, área secundária |
| `--muted-foreground` | `oklch(0.52 0.012 75)` | `oklch(0.72 0.012 75)` | Texto secundário, metadata |
| `--accent` | `oklch(0.96 0.008 75)` | `oklch(0.30 0.012 75)` | Hover de menu, item selecionado em listas |
| `--border` | `oklch(0.91 0.005 75)` | `oklch(1 0 0 / 12%)` | Linhas divisórias |
| `--input` | igual border | `oklch(1 0 0 / 16%)` | Borda de input |

### Sinalização

| Token | Valor | Uso |
|---|---|---|
| `--destructive` | `oklch(0.577 0.245 27.325)` light / `oklch(0.704 0.191 22.216)` dark | Erro, deletar, sentimento negativo crítico |

### Charts (gradient quente→frio)

`--chart-1` âmbar → `--chart-5` zinc escuro. Usar em `/metricas` quando houver série temporal.

---

## Tipografia

Pareada: sans para UI funcional, serifada display para títulos de identidade.

| Família | Token | Variável CSS | Uso |
|---|---|---|---|
| **Geist Sans** | `font-sans` | `--font-geist-sans` | UI inteira: botões, labels, navegação, body, tabela, listas |
| **Geist Mono** | `font-mono` | `--font-geist-mono` | Telefone, ID, timestamps tabular-nums, código inline |
| **Instrument Serif** | `font-display` | `--font-instrument-serif` | Heros, número grande das métricas, título de seção identitária, empty state |

Carregadas em `frontend/src/app/layout.tsx` via `next/font/google` com `display: "swap"` (sem FOIT).

### Escala (referência)

| Nível | Tailwind | Uso |
|---|---|---|
| Display XL | `text-6xl md:text-7xl font-display` (60-72) | Hero do login |
| Display L | `text-4xl md:text-5xl font-display` (36-48) | Empty state, título de seção principal |
| Display M | `text-3xl md:text-4xl font-display tabular-nums` (30-36) | Número de métrica grande |
| Heading | `text-xl font-semibold` (20) | Cabeçalho de página |
| Subhead | `text-base font-medium` (16) | Cards, agrupamentos |
| Body | `text-sm` (14) | Conteúdo, mensagens, descrições |
| Label | `text-xs` (12) | Metadata, footer, hint |
| Micro | `text-[10px]` ou `text-[11px]` | Timestamp em bolha, badge |

`tabular-nums` em qualquer número que muda (contagens, métricas, score, timestamps).

### Refinamento

- Line-length em texto corrido: 45-75 caracteres.
- Line-height: `leading-snug` (1.375) em títulos, `leading-relaxed` (1.625) em parágrafos longos, default em UI.
- Sem widows/orphans em copy importante (login hero, empty states).
- `font-display` recebe `letter-spacing: -0.01em` por default (em `globals.css @layer base`).

---

## Espaçamento

Escala Tailwind padrão (4px base). Não introduzir valores fora dela.

| Uso | Tailwind |
|---|---|
| Gap entre ícone e texto | `gap-2` (8) |
| Espaçamento entre campos de form | `gap-5` (20) |
| Padding interno de card | `p-4 md:p-5` (16-20) |
| Margem entre seções | `space-y-6 md:space-y-8` (24-32) |
| Padding de página | `px-4 md:px-6 lg:px-8` |

Touch targets mobile: mínimo 44×44px (use `size-11` ou `h-11`). Botões em mobile preferem `h-10` ou `h-11`.

---

## Motion

Tokens em `globals.css` viram utilities Tailwind: `ease-out-quart`, `ease-out-expo`, `ease-out-back`, `duration-fast`, `duration-base`, `duration-slow`.

| Token | Valor | Uso |
|---|---|---|
| `--ease-out-quart` | `cubic-bezier(0.165, 0.84, 0.44, 1)` | Default — entrada/saída de elementos, mudança de estado |
| `--ease-out-expo` | `cubic-bezier(0.19, 1, 0.22, 1)` | Reveals, transições mais marcantes (filtro abrindo, modal) |
| `--ease-out-back` | `cubic-bezier(0.34, 1.2, 0.64, 1)` | Microbounce sutil em check/sucesso (overshoot leve, nunca elastic) |
| `--duration-fast` | `150ms` | Hover, focus, mudança de cor |
| `--duration-base` | `240ms` | Default — entrada de elemento, expand/collapse |
| `--duration-slow` | `360ms` | Stagger acumulado, transições de página |

### Quando animar

- Estado interativo (hover, focus, active): sempre, com `duration-fast`.
- Entrada de elemento novo (mensagem, card, lista): `duration-base`, `ease-out-quart`, fade + slide-in pequeno (8-12px).
- Stagger entre múltiplos itens: 40-60ms entre cada (CSS `animation-delay: calc(var(--i) * 50ms)`).
- Mudança de status / contagem: cor transition `duration-base`.

### Quando NÃO animar

- Layout properties (`width`, `height`, `top`) — usar `transform` e `opacity`. `tw-animate-css` já cuida.
- Mais de 2 propriedades simultâneas no mesmo elemento.
- Elementos críticos para tomada de decisão (badges de score, status do lead) — animar a *transição*, não o estado em si.
- Decoração ambiente (background pulsando, glow constante).

Respeitar `prefers-reduced-motion: reduce` está em `globals.css @layer base` — zera tudo automaticamente.

---

## Componentes — convenções

Stack: shadcn/ui + Base UI (`@base-ui/react`). Os primitivos estão em `frontend/src/components/ui/`. **Reescrever componente para mudar styling é antipattern** — ajuste via tokens e classes.

### Cards (`card.tsx`)
- Padding `p-4 md:p-5`, radius `rounded-lg` (`var(--radius)`)
- Hover de card clicável: `hover:shadow-md transition-shadow duration-base`

### Botões (`button.tsx`)
- Primary: `bg-primary text-primary-foreground` (âmbar)
- Outline: `border-input hover:bg-accent`
- Ghost: `hover:bg-accent hover:text-accent-foreground`
- Tamanhos: `sm` (h-9), default (h-10), `lg` (h-11)

### Badges (`badge.tsx`)
- Primary: `bg-primary/15 text-primary` (âmbar suave, não sólido)
- Secondary/muted: `bg-muted text-muted-foreground`
- Destructive: `bg-destructive/15 text-destructive`

### Inputs / Switches
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Switch ativo: `data-[state=checked]:bg-primary` com transition base

### Bolhas de chat (`message-bubble.tsx`)
- Assistente (IA): `bg-primary text-primary-foreground rounded-2xl rounded-br-sm`
- Lead (humano): `bg-muted text-foreground rounded-2xl rounded-bl-sm`
- Entrada: `animate-in fade-in slide-in-from-bottom-1 duration-240 ease-out-quart`

---

## Anti-pattern audit (rodar antes de commit)

```bash
# 1. Emojis em código
grep -rPn "[\x{1F300}-\x{1F9FF}\x{2600}-\x{27BF}]" frontend/src

# 2. Gradientes suspeitos de AI slop
grep -rn "from-purple\|to-pink\|from-blue.*to-purple\|gradient-to-br from-" frontend/src

# 3. Bounce / elastic banidos
grep -rn "animate-bounce\|ease-bounce\|ease-elastic" frontend/src

# 4. Cores hardcoded fora dos tokens
grep -rn "bg-\[#\|text-\[#\|border-\[#" frontend/src
```

Cada hit é candidato a remoção. Exceção: ícone real, asset 3rd party.

---

## Atualizando este documento

Mudou um token, escala ou convenção? Atualize `DESIGN.md` **na mesma sessão**. Documento desatualizado é pior que nenhum.
