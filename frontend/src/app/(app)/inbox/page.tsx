import Link from "next/link";
import { Users } from "lucide-react";

export const metadata = { title: "Caixa de entrada — ImobPro" };

export default function InboxPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center min-h-[60dvh]">
      <Users className="size-10 text-muted-foreground" />
      <div className="space-y-1 max-w-sm">
        <h1 className="text-lg font-semibold">Sua caixa de entrada</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um lead na aba Leads para abrir a conversa.
        </p>
      </div>
      <Link
        href="/leads"
        className="text-sm text-primary hover:underline underline-offset-2"
      >
        Ir para Leads →
      </Link>
    </div>
  );
}
