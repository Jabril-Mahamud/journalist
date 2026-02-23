'use client'

import * as React from 'react'

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  const setValue = React.useCallback(
    (value: T) => {
      try {
        setStoredValue(value)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(value))
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  return [storedValue, setValue]
}
