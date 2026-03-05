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

  if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Skill Matrix</h2>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium sticky left-0 bg-gray-50">Skill</th>
              <th className="px-3 py-3 text-center font-medium" title="Number Proficient">NumP</th>
              <th className="px-3 py-3 text-center font-medium" title="Ability Modifier">Mod</th>
              {characters.map((c) => (
                <th key={c.id} className="px-4 py-3 text-center font-medium">{c.name}</th>
              ))}
              <th className="px-4 py-3 text-left font-medium">Best Person/Combo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {DND_SKILLS.map((skillName) => {
              const maxBonus = getMaxBonus(skillName)
              const ref = getRef(skillName)
              return (
                <tr key={skillName}>
                  <td className="px-4 py-2 font-medium sticky left-0 bg-white">{skillName}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{ref?.num_proficient ?? '--'}</td>
                  <td className="px-3 py-2 text-center text-gray-500 uppercase text-xs">{ref?.modifier ?? '--'}</td>
                  {characters.map((c) => {
                    const skill = getSkill(c.id, skillName)
                    const bonus = skill?.bonus ?? 0
                    const isMax = bonus > 0 && bonus === maxBonus
                    return (
                      <td key={c.id} className={clsx('px-4 py-2 text-center', isMax && 'font-bold text-green-700 bg-green-50')}>
                        {bonus >= 0 ? `+${bonus}` : bonus}
                        {skill?.proficient && <span className="text-blue-500 ml-1">P</span>}
                        {skill?.expertise && <span className="text-purple-500 ml-1">E</span>}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-gray-600 text-xs whitespace-nowrap">{ref?.best_combo ?? '--'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        <span className="text-blue-500 font-medium">P</span> = Proficient,{' '}
        <span className="text-purple-500 font-medium">E</span> = Expertise,{' '}
        <span className="text-green-700 font-bold">Green</span> = Highest in party
      </p>
    </div>
  )
}
