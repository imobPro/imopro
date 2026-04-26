import { FileText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAbsoluteTime } from "@/lib/domain/relative-time";
import type { ChatMessage } from "@/lib/types/database";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex w-full",
        isAssistant ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-sm",
          isAssistant
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        <MessageBody message={message} />
        <span
          className={cn(
            "text-[10px] tabular-nums self-end",
            isAssistant ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatAbsoluteTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case "image":
    case "sticker":
      return (
        <div className="flex flex-col gap-1">
          {message.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.media_url}
              alt={message.content || "Imagem enviada"}
              className="max-w-full rounded-lg"
            />
          )}
          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
      );

    case "audio":
      return (
        <div className="flex flex-col gap-1">
          {message.media_url && (
            <audio src={message.media_url} controls className="max-w-full" />
          )}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-xs italic opacity-90">
              {message.content}
            </p>
          )}
        </div>
      );

    case "document":
      return (
        <a
          href={message.media_url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 underline-offset-2 hover:underline"
        >
          <FileText className="size-4" />
          {message.content?.trim() || "Documento"}
        </a>
      );

    case "location":
      return (
        <div className="inline-flex items-center gap-2">
          <MapPin className="size-4" />
          <span>{message.content?.trim() || "Localização compartilhada"}</span>
        </div>
      );

    case "text":
    default:
      return (
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      );
  }
}
