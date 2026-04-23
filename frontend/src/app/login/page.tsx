import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — ImobPro",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">ImobPro</CardTitle>
          <p className="text-sm text-muted-foreground">
            Entre com o e-mail cadastrado da sua imobiliária.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
