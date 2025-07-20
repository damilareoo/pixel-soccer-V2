"use client"

import { useEffect, useRef, useState } from "react"
import useInput from "@/hooks/use-input"
import { drawField, drawSprite } from "@/lib/render-utils"
import { checkCollision, updateBallPhysics } from "@/lib/physics"
import { useSound } from "@/hooks/use-sound"

// Game constants
const GAME_WIDTH = 320
const GAME_HEIGHT = 240
const PLAYER_SPEED = 2.5
const BALL_SPEED = 1.8
const KICK_POWER = 5
const GAME_DURATION = 120 // 2 minutes in seconds

// Game entities
interface Entity {
  x: number
  y: number
  width: number
  height: number
  speedX: number
  speedY: number
}

interface GameCanvasProps {
  onScore: (isPlayer: boolean) => void
  onGameEnd: () => void
}

export default function GameCanvas({ onScore, onGameEnd }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [isGameActive, setIsGameActive] = useState(true)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  // Game entities
  const [player, setPlayer] = useState<Entity>({
    x: GAME_WIDTH / 4,
    y: GAME_HEIGHT / 2,
    width: 16,
    height: 16,
    speedX: 0,
    speedY: 0,
  })

  const [cpu, setCpu] = useState<Entity>({
    x: (GAME_WIDTH / 4) * 3,
    y: GAME_HEIGHT / 2,
    width: 16,
    height: 16,
    speedX: 0,
    speedY: 0,
  })

  const [ball, setBall] = useState<Entity>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    width: 8,
    height: 8,
    speedX: 0,
    speedY: 0,
  })

  // Goals
  const leftGoal = { x: 0, y: GAME_HEIGHT / 2 - 24, width: 8, height: 48 }
  const rightGoal = { x: GAME_WIDTH - 8, y: GAME_HEIGHT / 2 - 24, width: 8, height: 48 }

  // Input handling
  const { keys, touchInput } = useInput()

  // Sound effects
  const kickSound = useSound("/sounds/kick.mp3")
  const goalSound = useSound("/sounds/goal.mp3")
  const whistleSound = useSound("/sounds/whistle.mp3")

  // Create placeholder sounds using Web Audio API
  useEffect(() => {
    const createBeep = (frequency: number, duration: number) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = "sine"
        oscillator.frequency.value = frequency
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        gainNode.gain.value = 0.1
        oscillator.start()

        setTimeout(() => {
          oscillator.stop()
          audioContext.close()
        }, duration)
      } catch (error) {
        console.warn("Web Audio API error:", error)
      }
    }

    // Override kick and goal sounds with beeps if needed
    const originalKickPlay = kickSound.play
    kickSound.play = () => {
      try {
        originalKickPlay()
      } catch (e) {
        createBeep(440, 100) // A4 note, short duration
      }
    }

    const originalGoalPlay = goalSound.play
    goalSound.play = () => {
      try {
        originalGoalPlay()
      } catch (e) {
        createBeep(523.25, 300) // C5 note, longer duration
      }
    }

    const originalWhistlePlay = whistleSound.play
    whistleSound.play = () => {
      try {
        originalWhistlePlay()
      } catch (e) {
        createBeep(880, 500) // A5 note, longer duration
      }
    }
  }, [kickSound, goalSound, whistleSound])

  // Reset ball to center
  const resetBall = () => {
    setBall({
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      width: 8,
      height: 8,
      speedX: 0,
      speedY: 0,
    })
  }

  // Check for goals
  const checkGoals = () => {
    // Ball in left goal (CPU scores)
    if (ball.x < leftGoal.x + leftGoal.width && ball.y > leftGoal.y && ball.y < leftGoal.y + leftGoal.height) {
      goalSound.play()
      onScore(false)
      resetBall()
    }

    // Ball in right goal (Player scores)
    if (ball.x + ball.width > rightGoal.x && ball.y > rightGoal.y && ball.y < rightGoal.y + rightGoal.height) {
      goalSound.play()
      onScore(true)
      resetBall()
    }
  }

  // Update player position based on input
  const updatePlayerPosition = () => {
    let dx = 0
    let dy = 0

    // Keyboard controls
    if (keys.ArrowUp || keys.KeyW) dy -= PLAYER_SPEED
    if (keys.ArrowDown || keys.KeyS) dy += PLAYER_SPEED
    if (keys.ArrowLeft || keys.KeyA) dx -= PLAYER_SPEED
    if (keys.ArrowRight || keys.KeyD) dx += PLAYER_SPEED

    // Touch controls
    if (touchInput.active) {
      dx = touchInput.dx * PLAYER_SPEED
      dy = touchInput.dy * PLAYER_SPEED
    }

    // Update player position
    setPlayer((prev) => {
      const newX = Math.max(0, Math.min(GAME_WIDTH - prev.width, prev.x + dx))
      const newY = Math.max(0, Math.min(GAME_HEIGHT - prev.height, prev.y + dy))
      return { ...prev, x: newX, y: newY }
    })

    // Handle kick
    if (keys.Space || touchInput.action) {
      // Check if player is close to the ball
      if (checkCollision(player, ball, 20)) {
        kickSound.play()
        // Calculate kick direction from player to ball
        const dx = ball.x - player.x
        const dy = ball.y - player.y
        const magnitude = Math.sqrt(dx * dx + dy * dy) || 1
        const normalizedDx = dx / magnitude
        const normalizedDy = dy / magnitude

        setBall((prev) => ({
          ...prev,
          speedX: normalizedDx * KICK_POWER,
          speedY: normalizedDy * KICK_POWER,
        }))
      }
    }
  }

  // Update CPU AI
  const updateCpuAi = () => {
    setCpu((prev) => {
      // Simple AI: move toward the ball
      const dx = ball.x - prev.x
      const dy = ball.y - prev.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      let newX = prev.x
      let newY = prev.y

      if (distance > 5) {
        newX += (dx / distance) * (PLAYER_SPEED * 0.75)
        newY += (dy / distance) * (PLAYER_SPEED * 0.75)
      }

      // Keep CPU within bounds
      newX = Math.max(0, Math.min(GAME_WIDTH - prev.width, newX))
      newY = Math.max(0, Math.min(GAME_HEIGHT - prev.height, newY))

      return { ...prev, x: newX, y: newY }
    })

    // CPU kick logic
    if (checkCollision(cpu, ball, 20)) {
      // CPU has 3% chance to kick per frame when near ball
      if (Math.random() < 0.03) {
        kickSound.play()
        // Kick toward player's goal
        setBall((prev) => ({
          ...prev,
          speedX: -KICK_POWER,
          speedY: (Math.random() - 0.5) * KICK_POWER,
        }))
      }
    }
  }

  // Update game state
  const updateGame = (deltaTime: number) => {
    // Limit deltaTime to prevent physics issues on slow devices
    const limitedDeltaTime = Math.min(deltaTime, 3)

    updatePlayerPosition()
    updateCpuAi()

    // Update ball physics
    setBall((prev) => updateBallPhysics(prev, GAME_WIDTH, GAME_HEIGHT, limitedDeltaTime))

    // Check for collisions with players
    if (checkCollision(player, ball)) {
      setBall((prev) => {
        const dx = prev.x - player.x
        const dy = prev.y - player.y
        const magnitude = Math.sqrt(dx * dx + dy * dy) || 1 // Prevent division by zero
        const normalizedDx = dx / magnitude
        const normalizedDy = dy / magnitude

        return {
          ...prev,
          x: prev.x + normalizedDx * 5, // Push ball away from player
          y: prev.y + normalizedDy * 5,
          speedX: normalizedDx * BALL_SPEED * 2,
          speedY: normalizedDy * BALL_SPEED * 2,
        }
      })
    }

    if (checkCollision(cpu, ball)) {
      setBall((prev) => {
        const dx = prev.x - cpu.x
        const dy = prev.y - cpu.y
        const magnitude = Math.sqrt(dx * dx + dy * dy) || 1 // Prevent division by zero
        const normalizedDx = dx / magnitude
        const normalizedDy = dy / magnitude

        return {
          ...prev,
          x: prev.x + normalizedDx * 5, // Push ball away from CPU
          y: prev.y + normalizedDy * 5,
          speedX: normalizedDx * BALL_SPEED * 2,
          speedY: normalizedDy * BALL_SPEED * 2,
        }
      })
    }

    // Check for goals
    checkGoals()
  }

  // Render game
  const renderGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw field
    drawField(ctx, canvas.width, canvas.height)

    // Draw goals
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(leftGoal.x, leftGoal.y, leftGoal.width, leftGoal.height)
    ctx.fillRect(rightGoal.x, rightGoal.y, rightGoal.width, rightGoal.height)

    // Draw player
    drawSprite(ctx, player.x, player.y, player.width, player.height, "#3498db")

    // Draw CPU
    drawSprite(ctx, cpu.x, cpu.y, cpu.width, cpu.height, "#e74c3c")

    // Draw ball
    drawSprite(ctx, ball.x, ball.y, ball.width, ball.height, "#f1c40f", true)

    // Draw UI
    ctx.fillStyle = "#FFFFFF"
    ctx.font = '16px "Press Start 2P", monospace'
    ctx.textAlign = "center"

    // Format time as MM:SS
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

    ctx.fillText(timeString, canvas.width / 2, 20)
  }

  // Game loop
  const gameLoop = (timestamp: number) => {
    if (!isGameActive) return

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp
    }

    const deltaTime = (timestamp - lastTimeRef.current) / 16.67 // normalize to ~60fps
    lastTimeRef.current = timestamp

    updateGame(deltaTime)
    renderGame()

    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }

  // Start and stop game loop
  useEffect(() => {
    // Start game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop)

    // Clean up
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setIsGameActive(false)
    }
  }, [])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          whistleSound.play()
          // Schedule the state update for after the current render cycle
          setTimeout(() => {
            setIsGameActive(false)
            onGameEnd()
          }, 1000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onGameEnd, whistleSound])

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = GAME_WIDTH
      canvas.height = GAME_HEIGHT
    }
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700">
      <canvas
        ref={canvasRef}
        className="pixelated max-w-full max-h-full"
        style={{
          imageRendering: "pixelated",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  )
}
