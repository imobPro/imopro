import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    preco: "R$ 297",
    subtitulo: "Para o corretor que atende sozinho.",
    beneficios: [
      "IA atendendo seus leads 24/7",
      "Qualificação automática e funil organizado",
      "Transferência inteligente para você quando o lead esquentar",
      "Painel web com inbox, leads, métricas e relatórios",
      "Suporte por e-mail",
    ],
  },
  {
    id: "imobiliaria",
    nome: "Imobiliária",
    preco: "R$ 597",
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
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 md:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <Badge variant="secondary">7 dias grátis em todos os planos</Badge>
        <h1 className="font-display text-4xl md:text-6xl leading-tight text-foreground max-w-2xl">
          Atendimento via WhatsApp com IA, do tamanho da sua imobiliária.
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-lg">
          A IA conversa com seus leads, qualifica e organiza o funil. Você
          recebe só quem está pronto para falar com um humano.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2 md:mt-12">
        {PLANOS.map((plano) => (
          <Card
            key={plano.id}
            className={cn(
              "flex flex-col",
              plano.destaque && "ring-2 ring-primary",
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{plano.nome}</CardTitle>
                {plano.destaque ? (
                  <Badge variant="default">Mais popular</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{plano.subtitulo}</p>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-5">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-4xl text-foreground tabular-nums">
                  {plano.preco}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>

              <ul className="flex flex-col gap-2.5 text-sm">
                {plano.beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/cadastro?plano=${plano.id}`}
                className={cn(
                  buttonVariants({
                    variant: plano.destaque ? "default" : "outline",
                    size: "lg",
                  }),
                  "mt-auto w-full",
                )}
              >
                Começar trial de 7 dias
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Sem cartão de crédito durante o trial. Cancele a qualquer momento.
      </p>
    </div>
  );
}
