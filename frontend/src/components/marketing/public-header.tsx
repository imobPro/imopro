import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/precos"
          className="font-display text-xl text-foreground hover:opacity-80 transition-opacity"
        >
          ImobPro
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}
