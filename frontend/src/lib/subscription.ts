export type SubscriptionStatus = "trial" | "expired" | "active" | "canceled";

export type SubscriptionView = {
  tenantId: string;
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialMessageCount: number;
  trialMessageLimit: number;
  trialMessagesRemaining: number;
  trialDaysRemaining: number;
  trialStarted: boolean;
  planId: string | null;
  subscribedAt: string | null;
  canceledAt: string | null;
  accessAllowed: boolean;
};

export type SubscriptionResponse = { subscription: SubscriptionView };

export type BannerVariant = "hidden" | "neutral" | "warning" | "danger";

export type BannerCopy = {
  variant: BannerVariant;
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

export function toBannerVariant(sub: SubscriptionView): BannerCopy {
  if (sub.status === "active") {
    return { variant: "hidden", message: "", ctaLabel: "", ctaHref: "" };
  }

  if (sub.status === "canceled") {
    return {
      variant: "danger",
      message: "Sua assinatura foi cancelada. Ative novamente para voltar a responder.",
      ctaLabel: "Ver assinatura",
      ctaHref: "/configuracoes/assinatura",
    };
  }

  if (sub.status === "expired" || sub.trialDaysRemaining <= 0) {
    return {
      variant: "danger",
      message: "Seu trial encerrou. Ative sua assinatura para continuar respondendo.",
      ctaLabel: "Ativar agora",
      ctaHref: "/configuracoes/assinatura",
    };
  }

  if (!sub.trialStarted) {
    return {
      variant: "neutral",
      message: "Conecte seu WhatsApp e seus 7 dias de trial começam a contar.",
      ctaLabel: "Conectar agora",
      ctaHref: "/conectar-whatsapp",
    };
  }

  const dias = pluralize(sub.trialDaysRemaining, "dia", "dias");
  const msgs = pluralize(sub.trialMessagesRemaining, "mensagem", "mensagens");
  const baseMsg = `Trial: ${sub.trialDaysRemaining} ${dias} e ${sub.trialMessagesRemaining} ${msgs} restantes.`;

  if (sub.trialDaysRemaining <= 3) {
    return {
      variant: "warning",
      message: baseMsg,
      ctaLabel: "Ver assinatura",
      ctaHref: "/configuracoes/assinatura",
    };
  }

  return {
    variant: "neutral",
    message: baseMsg,
    ctaLabel: "Ver assinatura",
    ctaHref: "/configuracoes/assinatura",
  };
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
