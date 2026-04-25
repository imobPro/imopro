import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "./theme-toggle";

export function MobileTopBar({ agentName }: { agentName: string }) {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between bg-background border-b px-4 h-12">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold leading-tight">ImobPro</span>
        <span className="text-[11px] text-muted-foreground leading-tight truncate">
          {agentName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sair"
            className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
