import { useEffect, useState } from 'react'
import { Skull, XCircle } from 'lucide-react'
import { useCritterStore } from '../stores/useCritterStore'
import { useCritterTemplateStore } from '../stores/useCritterTemplateStore'
import { useInventoryStore } from '../stores/useInventoryStore'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import { BlueprintDialog } from '../components/Critters/BlueprintDialog'
import { RosterSidebar } from '../components/Critters/RosterSidebar'
import { CritterCard } from '../components/Critters/CritterCard'
import type { CritterTemplate, Critter } from '../types'

export function CrittersPage() {
  const { critters, fetchCritters, summonCritter, updateCritter, deleteCritter, dismissAll } = useCritterStore()
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useCritterTemplateStore()
  const { characters, fetchCharacters } = useInventoryStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CritterTemplate | null>(null)

  useEffect(() => {
    fetchCritters()
    fetchTemplates()
    fetchCharacters()
  }, [fetchCritters, fetchTemplates, fetchCharacters])

  const handleSummon = async (templateId: number, characterId: string) => {
    try {
      await summonCritter({ template_id: templateId, character_id: characterId })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to summon critter')
    }
  }

  const handleSaveBlueprint = async (data: Partial<CritterTemplate>) => {
    try {
      if (data.id) {
        await updateTemplate(data.id, data)
      } else {
        await createTemplate(data)
      }
      setDialogOpen(false)
      setEditingTemplate(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save blueprint')
    }
  }

  const handleDeleteBlueprint = async (id: number) => {
    if (await confirm('Delete this blueprint? Existing critters will not be affected.')) {
      try {
        await deleteTemplate(id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete blueprint')
      }
    }
  }

  const handleDismiss = async (id: number) => {
    try {
      await deleteCritter(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to dismiss critter')
    }
  }

  const handleDismissAll = async () => {
    if (await confirm('Dismiss all active critters?')) {
      try {
        await dismissAll()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to dismiss all')
      }
    }
  }

  const handleUpdate = async (id: number, data: Partial<Critter>) => {
    try {
      await updateCritter(id, data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update critter')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skull className="w-7 h-7 text-parchment" />
          <h2 className="font-heading text-3xl font-bold text-parchment">Critters</h2>
        </div>
        {critters.length > 0 && (
          <button
            onClick={handleDismissAll}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover hover:text-parchment text-sm transition-colors"
          >
            <XCircle className="w-4 h-4" /> Dismiss All
          </button>
        )}
      </div>

      {/* Main layout: sidebar + grid */}
      <div className="flex gap-6 overflow-hidden">
        <RosterSidebar
          templates={templates}
          characters={characters}
          onSummon={handleSummon}
          onEdit={(template) => {
            setEditingTemplate(template)
            setDialogOpen(true)
          }}
          onDelete={handleDeleteBlueprint}
          onNew={() => {
            setEditingTemplate(null)
            setDialogOpen(true)
          }}
        />

        {/* Instance grid */}
        <div className="flex-1 min-w-0">
          {critters.length === 0 ? (
            <div className="text-center text-parchment-muted py-12">
              No critters summoned. Use the roster to summon one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {critters.map((critter) => (
                <CritterCard
                  key={critter.id}
                  critter={critter}
                  characters={characters}
                  onUpdate={handleUpdate}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Blueprint dialog */}
      {dialogOpen && (
        <BlueprintDialog
          template={editingTemplate}
          onSave={handleSaveBlueprint}
          onClose={() => {
            setDialogOpen(false)
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
