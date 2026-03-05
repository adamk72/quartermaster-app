import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { DND_SKILLS } from '../constants'
import clsx from 'clsx'
import type { Skill, SkillReference } from '../types'

export function SkillsPage() {
  const { characters, fetchCharacters } = useInventoryStore()
  const [skills, setSkills] = useState<Skill[]>([])
  const [refs, setRefs] = useState<SkillReference[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="text-center text-parchment-muted py-8">Loading...</div>

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold text-parchment mb-6">Skill Matrix</h2>

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
                    const skill = getSkill(c.id, skillName)
                    const bonus = skill?.bonus ?? 0
                    const isMax = bonus > 0 && bonus === maxBonus
                    return (
                      <td key={c.id} className={clsx('text-center', isMax && 'font-bold text-emerald bg-emerald/10')}>
                        {bonus >= 0 ? `+${bonus}` : bonus}
                        {skill?.proficient && <span className="text-sky ml-1">P</span>}
                        {skill?.expertise && <span className="text-arcane ml-1">E</span>}
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
