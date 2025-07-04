import * as React from 'react'
import { cn } from '@/lib/utils'

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'destructive' | 'success'
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      'relative w-full rounded-lg border p-4',
      {
        'bg-background text-foreground': variant === 'default',
        'border-destructive/50 text-destructive dark:border-destructive dark:text-destructive-foreground bg-destructive/10 dark:bg-destructive/20':
          variant === 'destructive',
        'border-success/50 text-success dark:border-success dark:text-success-foreground bg-success/10 dark:bg-success/20':
          variant === 'success',
      },
      className
    )}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription }
