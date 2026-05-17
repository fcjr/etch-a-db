import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';

export type ControlsMode = 'canvas' | 'console';

type Ctx = {
  mode: ControlsMode;
  setMode: (m: ControlsMode) => void;
  // Ref kept in sync with mode, so non-reactive code (keyboard event
  // listeners, koota systems) can read the latest value without stale
  // closures.
  modeRef: MutableRefObject<ControlsMode>;
};

const ControlsModeContext = createContext<Ctx | null>(null);

export function ControlsModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ControlsMode>('console');
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  return (
    <ControlsModeContext.Provider value={{ mode, setMode, modeRef }}>
      {children}
    </ControlsModeContext.Provider>
  );
}

export function useControlsMode() {
  const ctx = useContext(ControlsModeContext);
  if (!ctx) throw new Error('useControlsMode must be inside ControlsModeProvider');
  return ctx;
}
