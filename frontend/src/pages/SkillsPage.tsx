import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { DND_SKILLS } from '../constants'
import clsx from 'clsx'
import type { Skill, SkillReference } from '../types'

type DraftSkill = { bonus: number; proficient: boolean; expertise: boolean }

export function SkillsPage() {
  const { characters, fetchCharacters } = useInventoryStore()
  const [skills, setSkills] = useState<Skill[]>([])
  const [refs, setRefs] = useState<SkillReference[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Map<string, DraftSkill>>(new Map())

  useEffect(() => {
    fetchCharacters()
    Promise.all([
      api.get<Skill[]>('/skills'),
      api.get<SkillReference[]>('/skills/reference'),
    ]).then(([skillData, refData]) => {
      setSkills(skillData)
      setRefs(refData)
      setLoading(false)
    })
  }, [fetchCharacters])

  const getSkill = (charId: string, skillName: string) =>
    skills.find((s) => s.character_id === charId && s.skill_name === skillName)

  const getRef = (skillName: string) =>
    refs.find((r) => r.skill_name === skillName)

  const getMaxBonus = (skillName: string) =>
    Math.max(0, ...skills.filter((s) => s.skill_name === skillName).map((s) => s.bonus))

  const initDraft = () => {
    const d = new Map<string, DraftSkill>()
    for (const c of characters) {
      for (const skillName of DND_SKILLS) {
        const skill = getSkill(c.id, skillName)
        d.set(`${c.id}_${skillName}`, {
          bonus: skill?.bonus ?? 0,
          proficient: skill?.proficient ?? false,
          expertise: skill?.expertise ?? false,
        })
      }
    }
    return d
  }

  const getDraft = (charId: string, skillName: string) =>
    draft.get(`${charId}_${skillName}`)

  const updateDraft = (charId: string, skillName: string, updates: Partial<DraftSkill>) => {
    setDraft((prev) => {
      const next = new Map(prev)
      const key = `${charId}_${skillName}`
      const current = next.get(key) ?? { bonus: 0, proficient: false, expertise: false }
      next.set(key, { ...current, ...updates })
      return next
    })
  }

  const cycleProficiency = (charId: string, skillName: string) => {
    const d = getDraft(charId, skillName)
    if (!d) return
    if (!d.proficient && !d.expertise) {
      updateDraft(charId, skillName, { proficient: true, expertise: false })
    } else if (d.proficient && !d.expertise) {
      updateDraft(charId, skillName, { proficient: false, expertise: true })
    } else {
      updateDraft(charId, skillName, { proficient: false, expertise: false })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const byChar = new Map<string, { skill_name: string; bonus: number; proficient: boolean; expertise: boolean }[]>()
      for (const [key, val] of draft) {
        const idx = key.indexOf('_')
        const charId = key.slice(0, idx)
        const skillName = key.slice(idx + 1)
        if (!byChar.has(charId)) byChar.set(charId, [])
        byChar.get(charId)!.push({ skill_name: skillName, ...val })
      }
      await Promise.all(
        Array.from(byChar.entries()).map(([charId, skills]) =>
          api.put(`/skills/${charId}`, skills)
        )
      )
      const freshSkills = await api.get<Skill[]>('/skills')
      setSkills(freshSkills)
      setEditing(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save skills')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center text-parchment-muted py-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">Skill Matrix</h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              className="px-4 py-1.5 text-sm rounded-lg border border-border text-parchment-muted hover:bg-surface"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-1.5 text-sm rounded-lg bg-sky text-white font-semibold hover:bg-sky/80 disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        ) : (
          <button
            className="px-4 py-1.5 text-sm rounded-lg border border-border text-parchment-muted hover:bg-surface"
            onClick={() => { setDraft(initDraft()); setEditing(true) }}
          >
            Edit
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface z-10">Skill</th>
              <th className="text-center" title="Number Proficient">NumP</th>
              <th className="text-center" title="Ability Modifier">Mod</th>
              {characters.map((c) => (
                <th key={c.id} className="text-center">{c.name}</th>
              ))}
              <th>Best Person/Combo</th>
            </tr>
          </thead>
          <tbody>
            {DND_SKILLS.map((skillName) => {
              const maxBonus = getMaxBonus(skillName)
              const ref = getRef(skillName)
              return (
                <tr key={skillName}>
                  <td className="font-heading font-semibold sticky left-0 bg-card z-10">{skillName}</td>
                  <td className="text-center text-parchment-muted">{ref?.num_proficient ?? '--'}</td>
                  <td className="text-center text-parchment-muted uppercase text-xs">{ref?.modifier ?? '--'}</td>
                  {characters.map((c) => {
                    if (editing) {
                      const d = getDraft(c.id, skillName)
                      const bonus = d?.bonus ?? 0
                      const prof = d?.proficient ?? false
                      const exp = d?.expertise ?? false
                      return (
                        <td key={c.id} className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="flex flex-col items-center">
                              <button
                                className="text-[10px] text-parchment-muted hover:text-parchment leading-none px-1"
                                onClick={() => updateDraft(c.id, skillName, { bonus: bonus + 1 })}
                              >
                                &#9650;
                              </button>
                              <span className="text-sm min-w-[28px] text-center">
                                {bonus >= 0 ? `+${bonus}` : bonus}
                              </span>
                              <button
                                className="text-[10px] text-parchment-muted hover:text-parchment leading-none px-1"
                                onClick={() => updateDraft(c.id, skillName, { bonus: bonus - 1 })}
                              >
                                &#9660;
                              </button>
                            </div>
                            <button
                              className={clsx(
                                'rounded px-1.5 py-0.5 text-[10px] font-bold min-w-[20px] text-center',
                                exp ? 'bg-arcane text-white' :
                                prof ? 'bg-sky text-white' :
                                'bg-surface text-parchment-muted'
                              )}
                              onClick={() => cycleProficiency(c.id, skillName)}
                            >
                              {exp ? 'E' : prof ? 'P' : '–'}
                            </button>
                          </div>
                        </td>
                      )
                    }
                    const skill = getSkill(c.id, skillName)
                    const bonus = skill?.bonus ?? 0
                    const isMax = bonus > 0 && bonus === maxBonus
                    return (
                      <td key={c.id} className={clsx('text-center', isMax && 'font-bold text-emerald bg-emerald/10')}>
                        {bonus >= 0 ? `+${bonus}` : bonus}
                        {skill?.expertise ? <span className="text-arcane ml-1">E</span> : skill?.proficient ? <span className="text-sky ml-1">P</span> : null}
                      </td>
                    )
                  })}
                  <td className="text-parchment-dim text-xs whitespace-nowrap">{ref?.best_combo ?? '--'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-parchment-muted mt-4">
        <span className="text-sky font-medium">P</span> = Proficient,{' '}
        <span className="text-arcane font-medium">E</span> = Expertise,{' '}
        <span className="text-emerald font-bold">Green</span> = Highest in party
      </p>
    </div>
  )
}
