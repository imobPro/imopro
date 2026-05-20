"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { signupAction } from "./actions";

type Step = 1 | 2 | 3;
type OperationMode = "shared" | "individual";

type WizardData = {
  fullName: string;
  email: string;
  password: string;
  operationMode: OperationMode;
  realtyName: string;
  phone: string;
  acceptedTerms: boolean;
};

const INITIAL_DATA: WizardData = {
  fullName: "",
  email: "",
  password: "",
  operationMode: "individual",
  realtyName: "",
  phone: "",
  acceptedTerms: false,
};

const FIELD_INPUT_CLASS = "h-11 rounded-lg shadow-clay-card";
const FIELD_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wider text-muted-foreground";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

type Props = { planoHint: "corretor" | "imobiliaria" };

export function SignupWizard({ planoHint }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardData>(() => ({
    ...INITIAL_DATA,
    operationMode: planoHint === "imobiliaria" ? "shared" : "individual",
  }));
  const [pending, startTransition] = useTransition();

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1(): string | null {
    if (data.fullName.trim().length < 2) return "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      return "Informe um e-mail válido.";
    if (data.password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    return null;
  }

  function validateStep2(): string | null {
    if (data.operationMode === "shared" && data.realtyName.trim().length < 2)
      return "Informe o nome da imobiliária.";
    const phoneDigits = digitsOnly(data.phone);
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13))
      return "Telefone inválido. Use o formato 55DDXXXXXXXXX.";
    return null;
  }

  function handleNext() {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 3));
  }

  function handleBack() {
    setStep((s) => (s === 3 ? 2 : s === 2 ? 1 : 1));
  }

  function handleSubmit() {
    if (!data.acceptedTerms) {
      toast.error("Você precisa aceitar os Termos e a Política de Privacidade.");
      return;
    }

    startTransition(async () => {
      const phoneDigits = digitsOnly(data.phone);
      const result = await signupAction({
        operationMode: data.operationMode,
        fullName: data.fullName.trim(),
        realtyName:
          data.operationMode === "shared" ? data.realtyName.trim() : undefined,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        phone: phoneDigits || undefined,
        acceptedTerms: true,
      });

      if (!result.ok) {
        if (result.code === "EMAIL_IN_USE") {
          toast.error("Este e-mail já está cadastrado. Tente fazer login.");
          setStep(1);
        } else {
          toast.error(result.message || "Não foi possível criar sua conta.");
        }
        return;
      }

      // Sessão: o backend criou o user via admin API, mas o navegador ainda
      // não tem cookie. Faz login com a senha que o cliente acabou de definir.
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (signInError) {
        toast.error(
          "Conta criada, mas não conseguimos te logar agora. Entre manualmente.",
        );
        router.push("/login");
        return;
      }

      // Dispara o e-mail de confirmação. Falha aqui é silenciada — o cliente
      // pode reenviar pela tela /verificar-email.
      await supabase.auth.resend({
        type: "signup",
        email: data.email.trim().toLowerCase(),
      });

      router.push("/verificar-email");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator step={step} />

      {step === 1 ? (
        <Step1
          data={data}
          update={update}
          onNext={handleNext}
          pending={pending}
        />
      ) : null}

      {step === 2 ? (
        <Step2
          data={data}
          update={update}
          onNext={handleNext}
          onBack={handleBack}
          pending={pending}
        />
      ) : null}

      {step === 3 ? (
        <Step3
          data={data}
          update={update}
          onSubmit={handleSubmit}
          onBack={handleBack}
          pending={pending}
        />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-base ease-out-quart",
            n <= step ? "bg-primary" : "bg-muted",
          )}
          aria-label={`Passo ${n}${n === step ? " (atual)" : ""}`}
        />
      ))}
    </div>
  );
}

type StepProps = {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
};

function Step1({
  data,
  update,
  onNext,
  pending,
}: StepProps & { onNext: () => void; pending: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName" className={FIELD_LABEL_CLASS}>
          Nome completo
        </Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          value={data.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className={FIELD_INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className={FIELD_LABEL_CLASS}>
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          className={FIELD_INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className={FIELD_LABEL_CLASS}>
          Senha
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={data.password}
          onChange={(e) => update("password", e.target.value)}
          className={FIELD_INPUT_CLASS}
        />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>

      <Button
        type="submit"
        variant="swatch"
        size="clay"
        disabled={pending}
        className="mt-2"
      >
        Continuar
      </Button>
    </form>
  );
}

function Step2({
  data,
  update,
  onNext,
  onBack,
  pending,
}: StepProps & { onNext: () => void; onBack: () => void; pending: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label className={FIELD_LABEL_CLASS}>Como você atende?</Label>
        <div className="flex flex-col gap-2">
          <ModeOption
            checked={data.operationMode === "individual"}
            onChange={() => update("operationMode", "individual")}
            title="Sou corretor individual"
            description="Atendo pelo meu número pessoal de WhatsApp."
          />
          <ModeOption
            checked={data.operationMode === "shared"}
            onChange={() => update("operationMode", "shared")}
            title="Represento uma imobiliária"
            description="Vários corretores atendem pelo mesmo número."
          />
        </div>
      </div>

      {data.operationMode === "shared" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="realtyName" className={FIELD_LABEL_CLASS}>
            Nome da imobiliária
          </Label>
          <Input
            id="realtyName"
            name="realtyName"
            required
            value={data.realtyName}
            onChange={(e) => update("realtyName", e.target.value)}
            className={FIELD_INPUT_CLASS}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone" className={FIELD_LABEL_CLASS}>
          Seu WhatsApp{" "}
          <span className="text-muted-foreground normal-case tracking-normal">(opcional)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          inputMode="tel"
          placeholder="55DDXXXXXXXXX"
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={FIELD_INPUT_CLASS}
        />
        <p className="text-xs text-muted-foreground">
          Usado pra te notificar quando um lead esquentar. Você pode preencher
          depois.
        </p>
      </div>

      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="clay-secondary"
          size="clay"
          onClick={onBack}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          type="submit"
          variant="swatch"
          size="clay"
          disabled={pending}
          className="flex-1"
        >
          Continuar
        </Button>
      </div>
    </form>
  );
}

function ModeOption({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-fast ease-out-quart",
        checked
          ? "border-primary bg-matcha-300/20 dark:bg-matcha-300/10 shadow-clay-card"
          : "border-border hover:border-border-dashed hover:bg-muted/40",
      )}
    >
      <input
        type="radio"
        name="operationMode"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 accent-primary"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function Step3({
  data,
  update,
  onSubmit,
  onBack,
  pending,
}: StepProps & {
  onSubmit: () => void;
  onBack: () => void;
  pending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <ReviewItem label="Nome" value={data.fullName} />
          <ReviewItem label="E-mail" value={data.email} />
          <ReviewItem
            label="Modo"
            value={
              data.operationMode === "shared"
                ? "Imobiliária"
                : "Corretor individual"
            }
          />
          {data.operationMode === "shared" ? (
            <ReviewItem label="Imobiliária" value={data.realtyName} />
          ) : null}
          {data.phone ? (
            <ReviewItem label="WhatsApp" value={data.phone} />
          ) : null}
        </dl>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={data.acceptedTerms}
          onChange={(e) => update("acceptedTerms", e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
          required
        />
        <span className="text-muted-foreground leading-relaxed">
          Li e aceito os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="text-primary hover:underline"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="text-primary hover:underline"
          >
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="clay-secondary"
          size="clay"
          onClick={onBack}
          disabled={pending}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          type="submit"
          variant="swatch"
          size="clay"
          disabled={pending}
          className="flex-1"
        >
          {pending ? "Criando..." : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="text-xs text-foreground text-right truncate">{value}</dd>
    </div>
  );
}
