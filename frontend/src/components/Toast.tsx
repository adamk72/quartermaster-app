import { useToastStore } from '../stores/useToastStore'
import { X } from 'lucide-react'
import clsx from 'clsx'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg shadow-black/30 text-sm animate-[slideIn_0.2s_ease-out] border',
            t.type === 'error' && 'bg-wine border-wine/30 text-parchment',
            t.type === 'success' && 'bg-emerald-dim border-emerald/30 text-parchment',
            t.type === 'info' && 'bg-card border-border text-parchment',
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
