import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner 
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-card border-border text-foreground',
          title: 'text-foreground',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          closeButton: 'bg-muted text-muted-foreground',
          error: 'bg-destructive text-destructive-foreground border-destructive',
          success: 'bg-green-600 text-white border-green-700',
          warning: 'bg-orange-600 text-white border-orange-700',
          info: 'bg-blue-600 text-white border-blue-700',
        },
      }}
      richColors
    />
  )
}
