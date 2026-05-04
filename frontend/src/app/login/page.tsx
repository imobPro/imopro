import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — ImobPro",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4 overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_115%,oklch(0.78_0.16_75/0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 dark:[background:radial-gradient(60%_50%_at_50%_115%,oklch(0.80_0.16_75/0.10),transparent_70%)]"
      />

      <div className="w-full max-w-sm flex flex-col items-stretch gap-6 animate-in fade-in slide-in-from-bottom-2 duration-slow ease-out-quart">
        <header className="text-center flex flex-col gap-1">
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-foreground">
            ImobPro
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre com o e-mail cadastrado da sua imobiliária.
          </p>
        </header>

        <Card>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
