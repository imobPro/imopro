import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HomeMark } from "@/components/brand/home-mark";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/precos"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          aria-label="ImobPro — início"
        >
          <HomeMark containerClassName="size-9 rounded-xl shadow-clay-card" />
          <span className="font-display text-xl font-semibold text-foreground">
            ImobPro
          </span>
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
            className={cn(buttonVariants({ variant: "swatch", size: "sm" }))}
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}
