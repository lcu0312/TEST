import { useState, useEffect } from 'react';
import { generateStorageKey } from '../utils';

export function useUserStorage<T>(
  userId: string | null,
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (!userId) {
      setValue(defaultValue);
      return;
    }

    const storageKey = generateStorageKey(userId, key);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        setValue(JSON.parse(stored));
      } catch {
        setValue(defaultValue);
      }
    } else {
      setValue(defaultValue);
    }
  }, [userId, key]);

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    const actualValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;
    setValue(actualValue);
    if (userId) {
      const storageKey = generateStorageKey(userId, key);
      localStorage.setItem(storageKey, JSON.stringify(actualValue));
    }
  };

  return [value, setStoredValue];
}
