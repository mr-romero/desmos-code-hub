
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
    
    const handleResize = React.useCallback(() => {
      if (!textareaRef.current || !autoResize) return
      
      // Reset height to get the correct scrollHeight
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }, [autoResize])
    
    React.useEffect(() => {
      if (autoResize) {
        handleResize()
        // Add event listener for content changes
        window.addEventListener('resize', handleResize)
      }
      
      return () => {
        if (autoResize) {
          window.removeEventListener('resize', handleResize)
        }
      }
    }, [autoResize, handleResize])
    
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }
    
    const handleInput = React.useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        handleResize()
      }
      if (props.onInput) {
        props.onInput(e)
      }
    }, [autoResize, handleResize, props])
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={combinedRef}
        onInput={handleInput}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
