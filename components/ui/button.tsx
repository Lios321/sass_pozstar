import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform active:scale-[0.98] shadow-sm relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "btn-gradient text-primary-foreground",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground",
        outline:
          "border border-input bg-background backdrop-blur-sm",
        secondary:
          "gradient-secondary text-secondary-foreground",
        ghost: "",
        link: "text-primary underline-offset-4 transition-colors",
        gradient: "bg-gradient-to-r from-primary via-primary-light to-primary text-primary-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
      hoverable: {
        true: "hover:scale-[1.02] hover:shadow-md",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "default", hoverable: true, class: "hover:shadow-lg hover:shadow-primary/30" },
      { variant: "destructive", hoverable: true, class: "hover:from-destructive/90 hover:to-destructive/80 hover:shadow-lg hover:shadow-destructive/30" },
      { variant: "outline", hoverable: true, class: "hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-light" },
      { variant: "secondary", hoverable: true, class: "hover:shadow-lg hover:shadow-secondary/30" },
      { variant: "ghost", hoverable: true, class: "hover:bg-accent hover:text-accent-foreground hover:backdrop-blur-sm hover:shadow-light" },
      { variant: "link", hoverable: true, class: "hover:underline hover:text-primary/80" },
      { variant: "gradient", hoverable: true, class: "hover:from-primary-dark hover:via-primary hover:to-primary-light hover:shadow-xl hover:shadow-primary/40" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      hoverable: true,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, hoverable = true, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, hoverable, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }