"use client"

import { useEffect, useRef, useState } from "react"

export function useSound(soundUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Create audio element
    try {
      audioRef.current = new Audio()
      audioRef.current.preload = "auto"

      // Handle successful loading
      audioRef.current.addEventListener("canplaythrough", () => {
        setIsLoaded(true)
      })

      // Handle loading errors
      audioRef.current.addEventListener("error", () => {
        console.warn(`Sound file not found: ${soundUrl}`)
        setIsLoaded(false)
      })

      // Set source after adding event listeners
      audioRef.current.src = soundUrl
    } catch (error) {
      console.warn("Audio creation failed:", error)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [soundUrl])

  const play = () => {
    if (audioRef.current && isLoaded) {
      // Reset audio to beginning if it's already playing
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((e) => {
        // Handle autoplay restrictions
        console.log("Audio playback failed:", e)
      })
    }
  }

  return { play }
}
