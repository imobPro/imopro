import { MessageSquare } from "lucide-react";

export const metadata = { title: "Caixa de entrada — ImobPro" };

export default function InboxPage() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center text-center gap-4 max-w-sm">
        <span
          aria-hidden
          className="inline-flex size-16 items-center justify-center rounded-2xl bg-matcha-300/30 text-matcha-800 dark:bg-matcha-300/10 dark:text-matcha-300"
        >
          <MessageSquare className="size-7" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display-tight text-2xl text-foreground">
            Selecione uma conversa
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha um lead na lista ao lado para abrir a conversa, ver
            histórico e responder.
          </p>
        </div>
      </div>
    </div>
  );
}
