"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none data-[variant=material]:rounded-none data-[variant=material]:p-0 data-[variant=material]:gap-0 data-[variant=material]:bg-transparent data-[variant=material]:border-b data-[variant=material]:border-border data-[variant=clay-pill]:gap-1 data-[variant=clay-pill]:p-1 data-[variant=clay-pill]:bg-background data-[variant=clay-pill]:border data-[variant=clay-pill]:border-border group-data-horizontal/tabs:data-[variant=material]:h-12 group-data-horizontal/tabs:data-[variant=clay-pill]:h-10",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        // Clay segmented pill — para topbar e filtros
        "clay-pill": "",
        // Material 3 underline — para tabs mobile (Android)
        material: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Estados base (default + line já existentes)
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        // Clay pill — active ganha shadow-clay-card
        "group-data-[variant=clay-pill]/tabs-list:rounded-md group-data-[variant=clay-pill]/tabs-list:data-active:bg-card group-data-[variant=clay-pill]/tabs-list:data-active:shadow-clay-card group-data-[variant=clay-pill]/tabs-list:data-active:text-foreground",
        // Material — transparent bg, indicador embaixo 3px rounded matcha
        "group-data-[variant=material]/tabs-list:rounded-none group-data-[variant=material]/tabs-list:px-4 group-data-[variant=material]/tabs-list:data-active:bg-transparent group-data-[variant=material]/tabs-list:data-active:text-primary group-data-[variant=material]/tabs-list:data-active:shadow-none",
        // Indicador underline universal — line e material usam after
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        // Indicador material: 3px arredondado em matcha, inset 4px nas laterais
        "group-data-[variant=material]/tabs-list:after:inset-x-4 group-data-[variant=material]/tabs-list:after:bottom-0 group-data-[variant=material]/tabs-list:after:h-[3px] group-data-[variant=material]/tabs-list:after:rounded-t-md group-data-[variant=material]/tabs-list:after:bg-primary group-data-[variant=material]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
