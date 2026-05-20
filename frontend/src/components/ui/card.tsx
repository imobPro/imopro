import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card relative flex flex-col gap-4 overflow-hidden bg-card py-4 text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      variant: {
        default: "rounded-xl ring-1 ring-foreground/10",
        clay:
          "rounded-2xl border border-border shadow-clay-card transition-all duration-base ease-out-quart hover:-rotate-1 hover:-translate-y-0.5 hover:shadow-clay-soft",
        flat: "rounded-xl border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const ACCENT_STRIPE: Record<string, string> = {
  matcha: "bg-matcha-600",
  slushie: "bg-slushie-500",
  lemon: "bg-lemon-500",
  ube: "bg-ube-300",
  pomegranate: "bg-pomegranate-400",
  dragonfruit: "bg-dragonfruit",
  blueberry: "bg-blueberry-800",
}

type CardAccent = keyof typeof ACCENT_STRIPE

type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    size?: "default" | "sm"
    accent?: CardAccent
  }

function Card({
  className,
  size = "default",
  variant = "default",
  accent,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-accent={accent}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    >
      {accent ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-0 inset-x-0 h-1 z-10",
            ACCENT_STRIPE[accent],
          )}
        />
      ) : null}
      {children}
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
