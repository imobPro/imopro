import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InboxMockupBg } from "./_components/inbox-mockup-bg";

export const metadata = {
  title: "Preços — ImobPro",
  description:
    "Atendimento via WhatsApp com IA para imobiliárias. Comece com 7 dias grátis.",
};

type Plano = {
  id: "corretor" | "imobiliaria";
  nome: string;
  preco: string;
  subtitulo: string;
  beneficios: string[];
  destaque?: boolean;
};

const PLANOS: Plano[] = [
  {
    id: "corretor",
    nome: "Corretor",
    preco: "297",
    subtitulo: "Para o corretor que atende sozinho.",
    beneficios: [
      "IA atendendo seus leads 24/7",
      "Qualificação automática e funil organizado",
      "Transferência inteligente quando o lead esquentar",
      "Painel com inbox, leads, métricas e relatórios",
      "Suporte por e-mail",
    ],
  },
  {
    id: "imobiliaria",
    nome: "Imobiliária",
    preco: "597",
    subtitulo: "Para imobiliárias com vários corretores.",
    beneficios: [
      "Tudo do plano Corretor",
      "Múltiplos corretores no mesmo número de WhatsApp",
      "Distribuição inteligente de leads por corretor",
      "Relatórios mensais e semanais por corretor",
      "Suporte prioritário",
    ],
    destaque: true,
  },
];

export default function PrecosPage() {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <InboxMockupBg />
      <header className="relative flex flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-matcha-600 bg-matcha-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-matcha-800 dark:bg-matcha-300/15 dark:text-matcha-300">
          <Sparkles className="size-3.5" />
          7 dias grátis em todos os planos
        </span>
        <h1 className="font-display-tight text-4xl md:text-6xl text-foreground max-w-3xl">
          Atendimento via WhatsApp com IA, <span className="text-primary">do tamanho da sua imobiliária.</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-xl">
          A IA conversa com seus leads, qualifica e organiza o funil. Você
          recebe só quem está pronto para falar com um humano.
        </p>
      </header>

      <div className="relative mt-12 grid gap-6 md:grid-cols-2 md:mt-14">
        {PLANOS.map((plano) => {
          const featured = plano.destaque;
          return (
            <div
              key={plano.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-2xl border p-7 transition-all duration-base ease-out-quart",
                featured
                  ? "bg-matcha-800 text-white border-matcha-800 shadow-clay-card hover:-translate-y-1 hover:shadow-clay-hard"
                  : "bg-card border-border shadow-clay-card hover:-translate-y-1 hover:shadow-clay-soft",
              )}
            >
              {featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lemon-500 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
                  Mais popular
                </span>
              ) : null}

              <div className="flex flex-col gap-1">
                <p className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  featured ? "text-matcha-300" : "text-muted-foreground",
                )}>
                  {plano.nome}
                </p>
                <p className={cn(
                  "text-sm",
                  featured ? "text-matcha-300" : "text-muted-foreground",
                )}>
                  {plano.subtitulo}
                </p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  "font-display text-2xl font-semibold",
                  featured ? "text-white" : "text-foreground",
                )}>
                  R$
                </span>
                <span className={cn(
                  "font-display-tight text-6xl font-semibold tabular-nums",
                  featured ? "text-white" : "text-foreground",
                )}>
                  {plano.preco}
                </span>
                <span className={cn(
                  "text-base",
                  featured ? "text-matcha-300" : "text-muted-foreground",
                )}>
                  /mês
                </span>
              </div>

              <div className={cn(
                "border-t border-dashed pt-5",
                featured ? "border-white/20" : "border-border",
              )}>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {plano.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check className={cn(
                        "mt-0.5 size-4 shrink-0",
                        featured ? "text-matcha-300" : "text-primary",
                      )} />
                      <span className={featured ? "text-white" : "text-foreground"}>
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/cadastro?plano=${plano.id}`}
                className={cn(
                  buttonVariants({
                    variant: featured ? "clay-secondary" : "swatch",
                    size: "clay",
                  }),
                  "mt-auto w-full",
                )}
              >
                Começar trial de 7 dias
              </Link>
            </div>
          );
        })}
      </div>

      <p className="relative mt-12 text-center text-xs text-muted-foreground">
        Sem cartão de crédito durante o trial. Cancele a qualquer momento.
      </p>
    </div>
  );
}
