import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "btn-clay-primary text-white",
        primary:
          "btn-clay-primary text-white",
        secondary:
          "btn-clay-secondary text-gray-800",
        ai:
          "btn-clay-ai text-white",
        outline:
          "bg-white border border-gray-200/90 text-gray-700 shadow-xs hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:bg-gray-100 rounded-xl",
        ghost:
          "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 rounded-xl active:bg-gray-200/60",
        destructive:
          "bg-red-500 hover:bg-red-600 text-white border border-red-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),_0_2px_4px_rgba(220,38,38,0.2)] rounded-xl",
        link: "text-indigo-600 underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs md:text-sm rounded-xl gap-2",
        xs: "h-6 px-2 text-[11px] rounded-lg gap-1 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3 text-xs rounded-xl gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-sm rounded-xl gap-2 [&_svg:not([class*='size-'])]:size-4.5 font-semibold",
        icon: "size-9 rounded-xl flex items-center justify-center",
        "icon-xs": "size-6 rounded-lg flex items-center justify-center [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-xl flex items-center justify-center",
        "icon-lg": "size-10 rounded-xl flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
