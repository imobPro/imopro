"use client";

import { useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/lead-enums";
import { TONE_DOT_CLASS } from "@/lib/domain/tone-styles";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types/database";
import { updateStatusAction } from "./actions";

type Props = {
  leadId: string;
  status: LeadStatus;
};

export function StatusSelector({ leadId, status }: Props) {
  const [pending, startTransition] = useTransition();
  const meta = STATUS_META[status];

  const handleChange = (next: string) => {
    if (next === status) return;
    startTransition(async () => {
      await updateStatusAction(leadId, next as LeadStatus);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            className="transition-colors duration-base ease-out-quart"
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full transition-colors duration-base",
                    TONE_DOT_CLASS[meta.tone],
                  )}
                />
                <span className="font-medium">{meta.label}</span>
              </>
            )}
            <ChevronDown />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={status} onValueChange={handleChange}>
          {STATUS_ORDER.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              <span
                aria-hidden
                className={cn(
                  "mr-2 inline-block size-2 rounded-full",
                  TONE_DOT_CLASS[STATUS_META[s].tone],
                )}
              />
              {STATUS_META[s].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
