import { useState, useEffect } from 'react';

/**
 * useDebouncedSearch Hook
 * 
 * Custom React hook that provides debounced search functionality to improve
 * performance by reducing API calls during user typing.
 * 
 * Features:
 * - Configurable delay (default: 300ms)
 * - Automatic cleanup on unmount
 * - Optimized for search input fields
 * 
 * @param {string} initialValue - Initial search value
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {object} Object with value, setValue, and debouncedValue
 * 
 * @example
 * const { value, setValue, debouncedValue } = useDebouncedSearch("", 500);
 * 
 * @author EU MEP Watch Development Team
 * @since August 2025
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return {
    value,
    setValue,
    debouncedValue
  };
}