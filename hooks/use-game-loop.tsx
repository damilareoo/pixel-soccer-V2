"use client"

import { useEffect, useRef } from "react"

export default function useGameLoop(callback: (deltaTime: number) => void) {
  const requestRef = useRef<number>()
  const previousTimeRef = useRef<number>()
  const isRunningRef = useRef<boolean>(true)

  const animate = (time: number) => {
    if (!isRunningRef.current) return

    if (previousTimeRef.current !== undefined) {
      // Calculate delta time in milliseconds
      const deltaTimeMs = time - previousTimeRef.current

      // Convert to a normalized value (1.0 = 16.67ms, which is ~60fps)
      // Clamp to prevent huge jumps if the tab was inactive
      const deltaTime = Math.min(deltaTimeMs / 16.67, 3)

      callback(deltaTime)
    }

    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    isRunningRef.current = true
    requestRef.current = requestAnimationFrame(animate)

    // Handle visibility change to pause/resume the game loop
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause the game loop
        isRunningRef.current = false
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current)
        }
      } else {
        // Page is visible again, resume the game loop
        isRunningRef.current = true
        previousTimeRef.current = performance.now()
        requestRef.current = requestAnimationFrame(animate)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      isRunningRef.current = false
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])
}
