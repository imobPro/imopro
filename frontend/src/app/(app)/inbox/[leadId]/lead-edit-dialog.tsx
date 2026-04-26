"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROFILE_META } from "@/lib/domain/lead-enums";
import type { LeadProfile, LeadWithConversation } from "@/lib/types/database";
import { updateLeadProfileAction } from "./actions";

const PROFILE_OPTIONS: LeadProfile[] = [
  "comprador",
  "inquilino",
  "vendedor",
  "captacao",
  "investidor",
  "indicador",
];

export function LeadEditDialog({ lead }: { lead: LeadWithConversation }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateLeadProfileAction(lead.id, formData);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Editar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>
            Ajuste as informações capturadas pela IA quando precisar.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-name">Nome</Label>
            <Input
              id="lead-name"
              name="name"
              defaultValue={lead.name ?? ""}
              placeholder="Nome do lead"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-region">Região / bairro</Label>
            <Input
              id="lead-region"
              name="region"
              defaultValue={lead.region ?? ""}
              placeholder="Ex.: Icaraí, Niterói"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-profile">Perfil</Label>
            <select
              id="lead-profile"
              name="profile"
              defaultValue={lead.profile ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Não definido</option>
              {PROFILE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PROFILE_META[p].label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
