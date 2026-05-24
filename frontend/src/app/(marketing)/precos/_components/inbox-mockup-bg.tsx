import { cn } from "@/lib/utils";

type MockConversation = {
  initials: string;
  avatar: string;
  name: string;
  snippet: string;
  time: string;
  unread?: boolean;
  badge?: "quente" | "qualificado";
};

const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    initials: "MS",
    avatar: "bg-slushie-500 text-foreground",
    name: "Mariana Soares",
    snippet: "Posso agendar a visita pra sábado de manhã?",
    time: "agora",
    unread: true,
    badge: "quente",
  },
  {
    initials: "RC",
    avatar: "bg-matcha-300 text-matcha-800",
    name: "Ricardo Carvalho",
    snippet: "Preciso vender meu apartamento em Icaraí.",
    time: "3 min",
    unread: true,
  },
  {
    initials: "PA",
    avatar: "bg-lemon-400 text-foreground",
    name: "Patrícia Andrade",
    snippet: "Qual o valor do aluguel daquele 2 quartos?",
    time: "12 min",
    badge: "qualificado",
  },
  {
    initials: "FB",
    avatar: "bg-ube-300 text-ube-800",
    name: "Felipe Barbosa",
    snippet: "Topo conhecer outras opções no mesmo bairro.",
    time: "28 min",
  },
  {
    initials: "JR",
    avatar: "bg-pomegranate-400 text-white",
    name: "Juliana Rocha",
    snippet: "Obrigada, vou falar com meu marido e te retorno.",
    time: "1 h",
  },
  {
    initials: "DL",
    avatar: "bg-slushie-500 text-foreground",
    name: "Diogo Lima",
    snippet: "Tem documentação pronta pro financiamento?",
    time: "2 h",
    badge: "qualificado",
  },
  {
    initials: "CN",
    avatar: "bg-matcha-300 text-matcha-800",
    name: "Camila Nogueira",
    snippet: "Achei a região perfeita, queria ver de tarde.",
    time: "4 h",
  },
  {
    initials: "EM",
    avatar: "bg-lemon-400 text-foreground",
    name: "Eduardo Martins",
    snippet: "Recebi o link, vou conferir os detalhes.",
    time: "ontem",
  },
  {
    initials: "TS",
    avatar: "bg-ube-300 text-ube-800",
    name: "Tatiana Souza",
    snippet: "Fechei com outra imobiliária, obrigada pelo contato.",
    time: "ontem",
  },
  {
    initials: "BG",
    avatar: "bg-pomegranate-400 text-white",
    name: "Bruno Garcia",
    snippet: "Posso pagar uma entrada maior pra reduzir parcela.",
    time: "2 d",
  },
];

export function InboxMockupBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-0 h-full w-full max-w-md -translate-x-1/2 scale-110 opacity-50 blur-2xl dark:opacity-25">
        <div className="flex h-full w-full flex-col border-x border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-foreground/30" />
              <div className="h-3 w-6 rounded bg-muted-foreground/40" />
            </div>
            <div className="h-10 rounded-lg border border-border bg-background" />
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              <div className="h-7 flex-1 rounded-md bg-card shadow-clay-card" />
              <div className="h-7 flex-1 rounded-md" />
              <div className="h-7 flex-1 rounded-md" />
            </div>
          </div>

          <ul className="flex-1">
            {MOCK_CONVERSATIONS.map((c, i) => (
              <li
                key={i}
                className="relative flex items-start gap-3 border-b border-border/60 px-4 py-3"
              >
                <span
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                    c.avatar,
                  )}
                >
                  {c.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        c.unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                      )}
                    >
                      {c.name}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] tabular-nums",
                        c.unread ? "font-medium text-primary" : "text-muted-foreground",
                      )}
                    >
                      {c.time}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs",
                      c.unread ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.snippet}
                  </p>
                  {c.badge ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-4 rounded-full px-1.5 text-[10px] font-medium text-foreground",
                          c.badge === "quente"
                            ? "bg-pomegranate-400/40"
                            : "bg-matcha-300/40",
                        )}
                      >
                        {c.badge === "quente" ? "Quente" : "Qualificado"}
                      </span>
                    </div>
                  ) : null}
                </div>
                {c.unread ? (
                  <span className="self-center size-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background" />
    </div>
  );
}
