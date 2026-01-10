import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { focusable?: boolean }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, focusable = true, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-in-out",
          focusable
            ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:bg-background focus:border-primary/50 focus:shadow-md focus:shadow-primary/10"
            : "focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-input focus:shadow-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }