import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:justify-between md:px-6">
        <p>ImobPro · Atendimento via WhatsApp com IA para imobiliárias.</p>
        <nav className="flex items-center gap-4">
          <Link href="/precos" className="hover:text-foreground transition-colors">
            Preços
          </Link>
          <Link
            href="/privacidade"
            className="hover:text-foreground transition-colors"
          >
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-foreground transition-colors">
            Termos
          </Link>
        </nav>
      </div>
    </footer>
  );
}
