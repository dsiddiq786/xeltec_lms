
import { useState } from 'react';

/**
 * Hook to manage complex object state with dirty checking
 */
export function useDirtyState<T>(initialState: T) {
    const [state, setState] = useState<T>(initialState);
    const [isDirty, setIsDirty] = useState(false);

    const update = (newState: T) => {
        setState(newState);
        setIsDirty(true);
    };

    const reset = (newState: T) => {
        setState(newState);
        setIsDirty(false);
    };

    return [state, update, isDirty, reset] as const;
}
