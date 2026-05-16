import { redirect } from "next/navigation";
import { fetchBackend } from "@/lib/backend";
import { Card, CardContent } from "@/components/ui/card";
import { QrDisplay } from "./qr-display";
import type { ConnectionState } from "./actions";

export const metadata = {
  title: "Conectar WhatsApp — ImobPro",
};

export default async function ConectarWhatsappPage() {
  const result = await fetchBackend<ConnectionState>(
    "/api/onboarding/connection",
  );

  // E-mail não confirmado: backend retornou 403. O (onboarding) layout não
  // exige confirmação, então tratamos aqui.
  if (!result.ok && result.error.code === "EMAIL_NOT_CONFIRMED") {
    redirect("/verificar-email");
  }

  // Já conectado: pula direto pro painel.
  if (result.ok && result.data.zapiStatus === "connected") {
    redirect("/inbox");
  }

  const initial: ConnectionState = result.ok
    ? result.data
    : { zapiStatus: "not_provisioned", qrCode: null };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-display text-3xl md:text-4xl leading-tight text-foreground">
          Conecte seu WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">
          Escaneie o QR code abaixo com o WhatsApp do número que vai atender os
          leads.
        </p>
      </header>

      <Card>
        <CardContent>
          <QrDisplay
            initialStatus={initial.zapiStatus}
            initialQrCode={initial.qrCode}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Seus 7 dias de trial começam quando a conexão for confirmada.
      </p>
    </div>
  );
}
