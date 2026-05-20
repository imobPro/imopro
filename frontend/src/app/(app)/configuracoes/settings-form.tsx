"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  isVisible,
  VISIBILITY_SECTIONS,
  type AgentVisibility,
  type TenantSettings,
  type VisibilitySection,
} from "@/lib/queries/settings";
import {
  updateMyPhoneAction,
  updateTenantSettingsAction,
  updateVisibilityAction,
} from "./actions";

type Props = {
  tenant: TenantSettings;
  visibility: AgentVisibility;
  myPhone: string;
};

const SECTION_LABELS: Record<VisibilitySection, string> = {
  identity: "Nome do agente",
  brand: "Nome da imobiliária",
  welcome: "Tom da imobiliária",
  hours: "Horário de atendimento",
  out_of_hours_msg: "Mensagem fora do horário",
  active_toggle: "Ligar e desligar o agente",
  my_phone: "Meu telefone (handoff)",
};

export function SettingsForm({ tenant, visibility, myPhone }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "ok" | "error"; message: string } | null
  >(null);

  const [agentName, setAgentName] = useState(tenant.agentName);
  const [realtyName, setRealtyName] = useState(tenant.realtyName);
  const [welcomeMessage, setWelcomeMessage] = useState(
    tenant.welcomeMessage ?? "",
  );
  const [hoursStart, setHoursStart] = useState(tenant.businessHoursStart);
  const [hoursEnd, setHoursEnd] = useState(tenant.businessHoursEnd);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState(
    tenant.outOfHoursMessage ?? "",
  );
  const [agentActive, setAgentActive] = useState(tenant.agentActive);
  const [phone, setPhone] = useState(myPhone);
  const [vis, setVis] = useState<AgentVisibility>(visibility);

  function flash(result: { ok: true } | { ok: false; error: string }) {
    if (result.ok) {
      setFeedback({ type: "ok", message: "Alterações salvas." });
    } else {
      setFeedback({ type: "error", message: result.error });
    }
  }

  function toggleVisibility(key: VisibilitySection, next: boolean) {
    const updated = { ...vis, [key]: next };
    setVis(updated);
    startTransition(async () => {
      const result = await updateVisibilityAction({ [key]: next });
      flash(result);
    });
  }

  function onSave() {
    startTransition(async () => {
      const result = await updateTenantSettingsAction({
        agentName,
        realtyName,
        welcomeMessage: welcomeMessage.trim() === "" ? null : welcomeMessage,
        businessHoursStart: hoursStart,
        businessHoursEnd: hoursEnd,
        outOfHoursMessage:
          outOfHoursMessage.trim() === "" ? null : outOfHoursMessage,
        agentActive,
      });

      if (result.ok && phone.trim() !== "" && phone !== myPhone) {
        const phoneResult = await updateMyPhoneAction(phone);
        flash(phoneResult);
        return;
      }

      flash(result);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Painel de visibilidade — preferência pessoal por agent */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-clay-card">
        <h2 className="text-sm font-semibold">O que mostrar nesta tela</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Esconda seções que você não usa. A escolha vale só para você.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {VISIBILITY_SECTIONS.map((key) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
            >
              <span className="text-sm">{SECTION_LABELS[key]}</span>
              <Switch
                checked={isVisible(vis, key)}
                onCheckedChange={(next) => toggleVisibility(key, next)}
                disabled={isPending}
              />
            </li>
          ))}
        </ul>
      </section>

      {isVisible(vis, "identity") && (
        <Section
          title="Nome do agente"
          description="Como o agente se apresenta nas conversas. Ex.: Júlia."
        >
          <Input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            maxLength={80}
          />
        </Section>
      )}

      {isVisible(vis, "brand") && (
        <Section
          title="Nome da imobiliária"
          description="Nome que aparece na apresentação ao lead."
        >
          <Input
            value={realtyName}
            onChange={(e) => setRealtyName(e.target.value)}
            maxLength={80}
          />
        </Section>
      )}

      {isVisible(vis, "welcome") && (
        <Section
          title="Tom da imobiliária"
          description="Texto curto sobre o jeito da sua marca falar. Não é enviado ao lead — entra como referência para a IA."
        >
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Ex.: Atendimento direto e prático. Foco em escutar o lead antes de oferecer."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {welcomeMessage.length}/500
          </p>
        </Section>
      )}

      {isVisible(vis, "hours") && (
        <Section
          title="Horário de atendimento"
          description="Vale de segunda a sexta. Sábado e domingo o agente fica fechado."
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="hours-start">Abre</Label>
              <Input
                id="hours-start"
                type="number"
                min={0}
                max={23}
                value={hoursStart}
                onChange={(e) => setHoursStart(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="hours-end">Fecha</Label>
              <Input
                id="hours-end"
                type="number"
                min={1}
                max={24}
                value={hoursEnd}
                onChange={(e) => setHoursEnd(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              horas (formato 24h)
            </span>
          </div>
        </Section>
      )}

      {isVisible(vis, "out_of_hours_msg") && (
        <Section
          title="Mensagem fora do horário"
          description="Resposta automática quando o lead manda mensagem antes ou depois do horário. Deixe em branco para usar o texto padrão."
        >
          <textarea
            value={outOfHoursMessage}
            onChange={(e) => setOutOfHoursMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder="Deixe em branco para usar o texto padrão."
          />
        </Section>
      )}

      {isVisible(vis, "active_toggle") && (
        <Section
          title="Agente ativo"
          description="Quando desligado, a IA para de responder. Mensagens novas continuam aparecendo na caixa de entrada para você responder no painel."
        >
          <div className="flex items-center gap-3">
            <Switch
              checked={agentActive}
              onCheckedChange={setAgentActive}
              disabled={isPending}
            />
            <span className="text-sm text-muted-foreground">
              {agentActive ? "Ligado" : "Desligado"}
            </span>
          </div>
        </Section>
      )}

      {isVisible(vis, "my_phone") && (
        <Section
          title="Meu telefone (handoff)"
          description="Número que recebe os alertas quando a IA transfere um lead. Apenas você (este corretor) usa este campo."
        >
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="55 21 9XXXX-XXXX"
            inputMode="tel"
          />
        </Section>
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <p
          className={
            feedback?.type === "ok"
              ? "text-xs text-primary font-medium"
              : feedback?.type === "error"
                ? "text-xs text-pomegranate-400 font-medium"
                : "text-xs text-muted-foreground"
          }
        >
          {feedback?.message ?? "Alterações são salvas ao clicar em Salvar."}
        </p>
        <Button variant="swatch" size="clay" onClick={onSave} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-clay-card">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
