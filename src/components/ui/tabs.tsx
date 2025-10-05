"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TabsProps = {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: React.ReactNode
}

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>")
  }

  return context
}

function Tabs({ value, onValueChange, className, children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  )
}

type TabsListProps = React.ComponentProps<"div">

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex h-10 items-center gap-2", className)}
      {...props}
    />
  )
}

type TabsTriggerProps = React.ComponentProps<"button"> & {
  value: string
}

function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext()
  const isActive = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "data-[state=inactive]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

type TabsContentProps = React.ComponentProps<"div"> & {
  value: string
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: activeValue } = useTabsContext()

  if (activeValue !== value) {
    return null
  }

  return (
    <div
      role="tabpanel"
      data-state="active"
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
