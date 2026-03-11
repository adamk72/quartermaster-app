import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement>(onClickOutside: () => void) {
  const ref = useRef<T>(null)
  const callbackRef = useRef(onClickOutside)
  callbackRef.current = onClickOutside

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callbackRef.current()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return ref
}
