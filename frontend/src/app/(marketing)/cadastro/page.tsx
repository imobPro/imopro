import { SignupWizard } from "./signup-wizard";

export const metadata = {
  title: "Criar conta — ImobPro",
};

type SearchParams = Promise<{ plano?: string }>;

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { plano } = await searchParams;
  const hint = plano === "imobiliaria" ? "imobiliaria" : "corretor";

  return (
    <div className="relative mx-auto w-full max-w-md px-4 py-10 md:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_115%,oklch(0.52_0.13_156/0.10),transparent_70%)]"
      />
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display-tight text-3xl md:text-4xl text-foreground">
          Crie sua conta
        </h1>
        <p className="text-sm text-muted-foreground">
          7 dias grátis. Sem cartão. Cancele quando quiser.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-clay-card">
        <SignupWizard planoHint={hint} />
      </div>
    </div>
  );
}
