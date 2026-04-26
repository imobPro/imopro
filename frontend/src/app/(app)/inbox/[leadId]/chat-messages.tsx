"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { formatDayHeader } from "@/lib/domain/relative-time";
import type { ChatMessage } from "@/lib/types/database";
import { MessageBubble } from "./message-bubble";

type Props = {
  messages: ChatMessage[];
  expanded: boolean;
};

type DayGroup = {
  key: string;
  label: string;
  messages: ChatMessage[];
};

function groupByDay(messages: ChatMessage[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: formatDayHeader(d), messages: [] };
      groups.push(group);
    }
    group.messages.push(msg);
  }
  return groups;
}

export function ChatMessages({ messages, expanded }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const groups = useMemo(() => groupByDay(messages), [messages]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Sem mensagens ainda nessa conversa.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
      {!expanded && (
        <div className="flex justify-center pb-3">
          <Link
            href="?expanded=1"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            <ChevronUp className="size-3" />
            Ver mensagens anteriores
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex justify-center">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {group.label}
              </span>
            </div>
            {group.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
