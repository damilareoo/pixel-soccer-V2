"use client"

import { useEffect, useState } from "react"

interface StartScreenProps {
  onStart: () => void
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [blinking, setBlinking] = useState(true)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking((prev) => !prev)
    }, 500)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        onStart()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearInterval(blinkInterval)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onStart])

  const handleTouchStart = () => {
    onStart()
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-r from-green-600 to-green-700 p-4"
      onClick={handleTouchStart}
      onTouchStart={handleTouchStart}
    >
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 left-0 w-full h-8 bg-yellow-400"></div>
        <div className="absolute bottom-0 left-0 w-full h-8 bg-yellow-400"></div>
        <div className="absolute top-8 left-0 w-8 h-[calc(100%-16px)] bg-yellow-400"></div>
        <div className="absolute top-8 right-0 w-8 h-[calc(100%-16px)] bg-yellow-400"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-2xl md:text-4xl font-bold text-yellow-400 mb-4 text-center text-shadow">
          BRAZILIAN STREET SOCCER
        </h1>

        <div className="w-32 h-32 mb-6 relative">
          <div className="absolute inset-0 bg-blue-600 rounded-full"></div>
          <div className="absolute inset-[15%] bg-yellow-400 rounded-full"></div>
          <div className="absolute inset-[40%] bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">BR</span>
          </div>
        </div>

        <p className={`text-xl text-white mb-8 ${blinking ? "opacity-100" : "opacity-0"} text-shadow`}>
          TOQUE PARA COMEÇAR
        </p>

        <div className="text-sm text-white text-center bg-black/30 p-3 rounded-lg">
          <p className="mb-2 font-bold">Controls:</p>
          <p className="mb-1">WASD / Arrow Keys to move</p>
          <p>SPACE to kick | TAP to kick on mobile</p>
        </div>
      </div>
    </div>
  )
}
