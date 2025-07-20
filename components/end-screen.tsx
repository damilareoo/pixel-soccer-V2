"use client"

import { useEffect, useState } from "react"

interface EndScreenProps {
  playerScore: number
  cpuScore: number
  onRestart: () => void
}

export default function EndScreen({ playerScore, cpuScore, onRestart }: EndScreenProps) {
  const [blinking, setBlinking] = useState(true)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking((prev) => !prev)
    }, 500)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        onRestart()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      clearInterval(blinkInterval)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onRestart])

  const handleTouchStart = () => {
    onRestart()
  }

  const result = playerScore > cpuScore ? "VOCÊ VENCEU!" : playerScore < cpuScore ? "CPU VENCEU!" : "EMPATE!"

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
        <h1 className="text-2xl md:text-4xl font-bold text-yellow-400 mb-6 text-center text-shadow">FIM DE JOGO</h1>

        <div className="bg-black/40 p-4 rounded-lg mb-6">
          <div className="text-xl md:text-2xl text-white mb-4 text-center">
            <div className="flex justify-center items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-blue-400 font-bold">PLAYER</span>
                <span className="text-3xl font-bold">{playerScore}</span>
              </div>
              <span className="text-white text-2xl">-</span>
              <div className="flex flex-col items-center">
                <span className="text-red-400 font-bold">CPU</span>
                <span className="text-3xl font-bold">{cpuScore}</span>
              </div>
            </div>
          </div>

          <p className="font-bold text-center text-xl text-yellow-400">{result}</p>
        </div>

        <div className="w-24 h-24 mb-6 relative">
          <div className="absolute inset-0 bg-blue-600 rounded-full"></div>
          <div className="absolute inset-[15%] bg-yellow-400 rounded-full"></div>
          <div className="absolute inset-[40%] bg-green-600 rounded-full"></div>
        </div>

        <p className={`text-lg text-white mt-2 ${blinking ? "opacity-100" : "opacity-0"} text-shadow`}>
          TOQUE PARA JOGAR NOVAMENTE
        </p>
      </div>
    </div>
  )
}
