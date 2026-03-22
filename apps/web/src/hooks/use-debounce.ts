import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(setDebounced, delay, value);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
