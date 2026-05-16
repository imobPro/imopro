import { Card, CardContent } from "@/components/ui/card";
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
    <div className="mx-auto w-full max-w-md px-4 py-10 md:py-14">
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-3xl md:text-4xl leading-tight text-foreground">
          Crie sua conta
        </h1>
        <p className="text-sm text-muted-foreground">
          7 dias grátis. Sem cartão. Cancele quando quiser.
        </p>
      </header>

      <Card>
        <CardContent>
          <SignupWizard planoHint={hint} />
        </CardContent>
      </Card>
    </div>
  );
}
