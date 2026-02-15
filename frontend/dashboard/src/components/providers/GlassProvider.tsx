'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface GlassContextValue {
  registerBlurSurface: () => boolean;
  unregisterBlurSurface: () => void;
  blurCount: number;
  maxBlurSurfaces: number;
}

const GlassContext = createContext<GlassContextValue | null>(null);

interface GlassProviderProps {
  children: ReactNode;
  maxBlurSurfaces?: number;
}

/**
 * GlassProvider
 *
 * Context provider that enforces a budget for backdrop-filter usage.
 * This is critical for performance on corporate laptops with integrated graphics.
 *
 * Usage:
 * - Wrap your app with <GlassProvider maxBlurSurfaces={3}>
 * - Components with blur effect call registerBlurSurface()
 * - If budget is exceeded, registerBlurSurface() returns false
 * - Component should fallback to solid background
 */
export function GlassProvider({ children, maxBlurSurfaces = 3 }: GlassProviderProps) {
  const [blurCount, setBlurCount] = useState(0);

  const registerBlurSurface = useCallback(() => {
    let allowed = false;

    setBlurCount((prev) => {
      if (prev >= maxBlurSurfaces) {
        console.warn(
          `[GlassProvider] Backdrop-filter budget exceeded (${maxBlurSurfaces}/${maxBlurSurfaces}). Falling back to solid background.`
        );
        allowed = false;
        return prev;
      }

      allowed = true;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[GlassProvider] Blur surface registered (${prev + 1}/${maxBlurSurfaces})`);
      }

      return prev + 1;
    });

    return allowed;
  }, [maxBlurSurfaces]);

  const unregisterBlurSurface = useCallback(() => {
    setBlurCount((prev) => {
      const newCount = Math.max(0, prev - 1);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[GlassProvider] Blur surface unregistered (${newCount}/${maxBlurSurfaces})`);
      }

      return newCount;
    });
  }, [maxBlurSurfaces]);

  return (
    <GlassContext.Provider
      value={{
        registerBlurSurface,
        unregisterBlurSurface,
        blurCount,
        maxBlurSurfaces,
      }}
    >
      {children}
    </GlassContext.Provider>
  );
}

/**
 * useGlass hook
 *
 * Access the glass context to register/unregister blur surfaces
 *
 * @throws Error if used outside GlassProvider
 */
export function useGlass() {
  const context = useContext(GlassContext);

  if (!context) {
    throw new Error('useGlass must be used within a GlassProvider');
  }

  return context;
}
