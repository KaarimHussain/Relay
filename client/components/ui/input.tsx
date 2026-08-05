import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 placeholder:text-gray-400 font-medium outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors",
        className
      )}
      {...props}
    />
  )
}

export { Input }
