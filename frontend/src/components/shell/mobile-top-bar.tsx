import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";

export function MobileTopBar({ agentName }: { agentName: string }) {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b px-4 h-12">
      <div className="flex flex-col min-w-0">
        <span className="font-display text-lg leading-none text-foreground">
          ImobPro
        </span>
        <span className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
          {agentName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sair"
            className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-fast"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
