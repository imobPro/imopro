import { Mail, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { email: string | null };

const UPGRADE_MESSAGE = (clientEmail: string | null) =>
  `Olá! Quero ativar minha assinatura do ImobPro.${
    clientEmail ? ` Conta: ${clientEmail}.` : ""
  }`;

export function UpgradeCta({ email }: Props) {
  const whatsappRaw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  const message = UPGRADE_MESSAGE(email);
  const hasWhatsapp = Boolean(whatsappRaw);
  const hasEmail = Boolean(supportEmail);

  if (!hasWhatsapp && !hasEmail) {
    return (
      <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        Em breve disponibilizaremos a ativação online. Por enquanto, entre em
        contato com a equipe ImobPro para liberar sua assinatura.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {hasWhatsapp ? (
        <a
          href={`https://wa.me/${whatsappRaw}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "default" }), "flex-1")}
        >
          <MessageCircle className="size-4" />
          Falar no WhatsApp
        </a>
      ) : null}

      {hasEmail ? (
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent("Ativar assinatura ImobPro")}&body=${encodeURIComponent(message)}`}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
        >
          <Mail className="size-4" />
          Enviar e-mail
        </a>
      ) : null}
    </div>
  );
}
