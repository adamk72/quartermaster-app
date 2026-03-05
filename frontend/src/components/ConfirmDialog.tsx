import { useConfirmStore } from '../stores/useConfirmStore'

export function ConfirmDialog() {
  const { message, respond } = useConfirmStore()

  if (!message) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
        <p className="text-gray-900">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => respond(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => respond(true)}
            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
            autoFocus
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
