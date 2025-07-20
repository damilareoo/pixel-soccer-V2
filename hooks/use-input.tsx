"use client"

import { useEffect, useState } from "react"

interface TouchInput {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  dx: number
  dy: number
  action: boolean
}

export default function useInput() {
  const [keys, setKeys] = useState<Record<string, boolean>>({})
  const [touchInput, setTouchInput] = useState<TouchInput>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    dx: 0,
    dy: 0,
    action: false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for game controls to avoid scrolling
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)
      ) {
        e.preventDefault()
      }
      setKeys((prev) => ({ ...prev, [e.code]: true }))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: false }))
    }

    // Touch controls for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return

      const touch = e.touches[0]
      setTouchInput({
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        dx: 0,
        dy: 0,
        action: false,
      })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      e.preventDefault() // Prevent scrolling while playing

      const touch = e.touches[0]
      setTouchInput((prev) => {
        // Calculate normalized direction vector
        const dx = (touch.clientX - prev.startX) / 30 // More sensitive
        const dy = (touch.clientY - prev.startY) / 30

        // Clamp values between -1 and 1
        const clampedDx = Math.max(-1, Math.min(1, dx))
        const clampedDy = Math.max(-1, Math.min(1, dy))

        return {
          ...prev,
          currentX: touch.clientX,
          currentY: touch.clientY,
          dx: clampedDx,
          dy: clampedDy,
        }
      })
    }

    const handleTouchEnd = () => {
      setTouchInput((prev) => ({
        ...prev,
        active: false,
        dx: 0,
        dy: 0,
      }))
    }

    // Single tap for action (kick)
    const handleTap = (e: TouchEvent) => {
      // Simple tap detection
      setTouchInput((prev) => ({
        ...prev,
        action: true,
      }))

      // Reset action after a short delay
      setTimeout(() => {
        setTouchInput((prev) => ({
          ...prev,
          action: false,
        }))
      }, 100)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd)
    window.addEventListener("touchend", handleTap)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("touchend", handleTap)
    }
  }, [])

  return { keys, touchInput }
}
