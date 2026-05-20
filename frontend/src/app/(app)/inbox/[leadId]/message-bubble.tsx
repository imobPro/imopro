"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, MapPin, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAbsoluteTime } from "@/lib/domain/relative-time";
import type { ChatMessage } from "@/lib/types/database";

export function MessageBubble({
  message,
  index = 0,
}: {
  message: ChatMessage;
  index?: number;
}) {
  const isAssistant = message.role === "assistant";
  const delay = Math.min(index, 12) * 40;

  return (
    <div
      className={cn(
        "flex w-full",
        isAssistant ? "justify-end" : "justify-start",
      )}
    >
      <div
        style={{ animationDelay: `${delay}ms` }}
        className={cn(
          "flex flex-col gap-1 max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
          "animate-in fade-in slide-in-from-bottom-1 ease-out-quart fill-mode-both",
          "duration-[var(--duration-base)]",
          isAssistant
            ? "bg-primary text-primary-foreground rounded-br-sm shadow-clay-card"
            : "bg-card border border-border text-foreground rounded-bl-sm shadow-clay-card",
        )}
      >
        <MessageBody message={message} isAssistant={isAssistant} />
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

function MessageBody({
  message,
  isAssistant,
}: {
  message: ChatMessage;
  isAssistant: boolean;
}) {
  switch (message.type) {
    case "image":
    case "sticker":
      return (
        <div className="flex flex-col gap-1.5">
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
        <div className="flex flex-col gap-1.5">
          {message.media_url && (
            <AudioPlayer src={message.media_url} isAssistant={isAssistant} />
          )}
          {message.content && (
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-xs italic",
                isAssistant ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
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
          className={cn(
            "inline-flex items-center gap-2 underline-offset-2 hover:underline",
            isAssistant ? "text-primary-foreground" : "text-primary",
          )}
        >
          <FileText className="size-4" />
          {message.content?.trim() || "Documento"}
        </a>
      );

    case "location":
      return (
        <div className="inline-flex items-center gap-2">
          <MapPin
            className={cn(
              "size-4",
              isAssistant ? "text-primary-foreground" : "text-primary",
            )}
          />
          <span>{message.content?.trim() || "Localização compartilhada"}</span>
        </div>
      );

    case "text":
    default:
      return (
        <p className="whitespace-pre-wrap break-words leading-snug">
          {message.content}
        </p>
      );
  }
}

function AudioPlayer({
  src,
  isAssistant,
}: {
  src: string;
  isAssistant: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrent(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrent(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar áudio" : "Tocar áudio"}
        className={cn(
          "inline-flex items-center justify-center size-8 shrink-0 rounded-full",
          "transition-transform duration-fast ease-out-quart",
          "hover:scale-105 active:scale-95",
          isAssistant
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground",
        )}
      >
        {playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5 translate-x-px" />
        )}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div
          className={cn(
            "flex-1 h-1 rounded-full overflow-hidden",
            isAssistant ? "bg-primary-foreground/30" : "bg-foreground/10",
          )}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-100 ease-linear",
              isAssistant ? "bg-primary-foreground" : "bg-primary",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span
          className={cn(
            "text-[10px] tabular-nums shrink-0",
            isAssistant ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatTime(duration ? (playing ? current : duration) : current)}
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
