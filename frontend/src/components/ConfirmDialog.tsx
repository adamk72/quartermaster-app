import { useConfirmStore } from '../stores/useConfirmStore'

export function ConfirmDialog() {
  const { message, respond } = useConfirmStore()

  if (!message) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90] p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-sm space-y-4 animate-[slideIn_0.2s_ease-out]">
        <p className="text-parchment font-heading text-lg">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => respond(false)}
            className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover hover:text-parchment transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => respond(true)}
            className="px-4 py-2 text-parchment bg-wine rounded-lg hover:bg-wine-dim transition-colors"
            autoFocus
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
