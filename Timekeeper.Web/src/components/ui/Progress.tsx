import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Progress bar component for displaying progress toward a goal.
 * @param value - Current progress value (unit-agnostic, e.g., minutes, hours, count)
 * @param max - Maximum/target value (same unit as value)
 * @returns A horizontal progress bar showing percentage completion
 */
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
    
    return (
      <div
        ref={ref}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
        {...props}
      >
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
