"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "secondary"
  size?: "sm" | "md" | "lg" | "icon"
  hoverable?: boolean
}

const base =
  "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none"

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "btn-gradient text-white shadow-light hover:shadow-medium",
  ghost:
    "bg-transparent text-foreground hover:bg-accent/50 hover:shadow-light",
  outline:
    "bg-transparent border border-border text-foreground hover:bg-accent/30 hover:shadow-light",
  secondary:
    "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 hover:shadow-light",
}

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-lg",
  icon: "h-10 w-10 p-0",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", hoverable = true, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], hoverable ? "hover-lift" : "", className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
