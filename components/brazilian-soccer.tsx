"use client"

import { useEffect, useRef, useState } from "react"

// Game states
type GameState = "start" | "playing" | "end"

// Game constants
const GAME_WIDTH = 320
const GAME_HEIGHT = 240
const PLAYER_SPEED = 3
const BALL_SPEED = 2
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

export default function BrazilianSoccer() {
  // Game canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  // Game state
  const [gameState, setGameState] = useState<GameState>("start")
  const [playerScore, setPlayerScore] = useState(0)
  const [cpuScore, setCpuScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)

  // Game entities - using refs for better performance
  const playerRef = useRef<Entity>({
    x: GAME_WIDTH / 4,
    y: GAME_HEIGHT / 2,
    width: 16,
    height: 16,
    speedX: 0,
    speedY: 0,
  })

  const cpuRef = useRef<Entity>({
    x: (GAME_WIDTH / 4) * 3,
    y: GAME_HEIGHT / 2,
    width: 16,
    height: 16,
    speedX: 0,
    speedY: 0,
  })

  const ballRef = useRef<Entity>({
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

  // Input state
  const keysRef = useRef<Record<string, boolean>>({})
  const touchRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    dx: 0,
    dy: 0,
    action: false,
  })

  // Sound effects
  const playSound = (type: "kick" | "goal" | "whistle") => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "sine"

      // Different sounds for different actions
      switch (type) {
        case "kick":
          oscillator.frequency.value = 440 // A4
          gainNode.gain.value = 0.1
          setTimeout(() => oscillator.stop(), 100)
          break
        case "goal":
          oscillator.frequency.value = 523.25 // C5
          gainNode.gain.value = 0.2
          setTimeout(() => oscillator.stop(), 300)
          break
        case "whistle":
          oscillator.frequency.value = 880 // A5
          gainNode.gain.value = 0.15
          setTimeout(() => oscillator.stop(), 500)
          break
      }

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.start()

      setTimeout(() => {
        audioContext.close().catch((e) => console.warn("Error closing audio context:", e))
      }, 1000)
    } catch (error) {
      console.warn("Web Audio API error:", error)
    }
  }

  // Reset ball to center
  const resetBall = () => {
    ballRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      width: 8,
      height: 8,
      speedX: 0,
      speedY: 0,
    }
  }

  // Start game
  const startGame = () => {
    playSound("whistle")
    setGameState("playing")
    setPlayerScore(0)
    setCpuScore(0)
    setTimeLeft(GAME_DURATION)

    // Reset positions
    playerRef.current = {
      x: GAME_WIDTH / 4,
      y: GAME_HEIGHT / 2,
      width: 16,
      height: 16,
      speedX: 0,
      speedY: 0,
    }

    cpuRef.current = {
      x: (GAME_WIDTH / 4) * 3,
      y: GAME_HEIGHT / 2,
      width: 16,
      height: 16,
      speedX: 0,
      speedY: 0,
    }

    resetBall()

    // Start game loop if not already running
    if (!gameLoopRef.current) {
      lastTimeRef.current = performance.now()
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
  }

  // End game
  const endGame = () => {
    playSound("whistle")
    setGameState("end")
  }

  // Check for collision between two entities
  const checkCollision = (entity1: Entity, entity2: Entity, padding = 0): boolean => {
    // For the ball (which is circular), use circle-rectangle collision
    const isCircle = entity2.width === 8 && entity2.height === 8

    if (isCircle) {
      // Circle-rectangle collision
      const circleX = entity2.x + entity2.width / 2
      const circleY = entity2.y + entity2.height / 2
      const circleRadius = entity2.width / 2 + padding

      // Find closest point on rectangle to circle
      const closestX = Math.max(entity1.x, Math.min(circleX, entity1.x + entity1.width))
      const closestY = Math.max(entity1.y, Math.min(circleY, entity1.y + entity1.height))

      // Calculate distance between closest point and circle center
      const distanceX = circleX - closestX
      const distanceY = circleY - closestY
      const distanceSquared = distanceX * distanceX + distanceY * distanceY

      return distanceSquared < circleRadius * circleRadius
    } else {
      // Rectangle-rectangle collision
      return (
        entity1.x < entity2.x + entity2.width + padding &&
        entity1.x + entity1.width + padding > entity2.x &&
        entity1.y < entity2.y + entity2.height + padding &&
        entity1.y + entity1.height + padding > entity2.y
      )
    }
  }

  // Update ball physics
  const updateBallPhysics = (deltaTime: number) => {
    const ball = ballRef.current

    // Apply friction
    const friction = 0.98
    ball.speedX *= friction
    ball.speedY *= friction

    // Update position
    ball.x += ball.speedX * deltaTime
    ball.y += ball.speedY * deltaTime

    // Bounce off walls
    if (ball.x < 0 || ball.x + ball.width > GAME_WIDTH) {
      // Don't bounce if in goal area (handled by goal detection)
      const inGoalArea = ball.y > GAME_HEIGHT / 2 - 24 && ball.y < GAME_HEIGHT / 2 + 24

      if (!inGoalArea) {
        ball.speedX = -ball.speedX * 0.8
        ball.x = ball.x < 0 ? 0 : GAME_WIDTH - ball.width
      }
    }

    if (ball.y < 0 || ball.y + ball.height > GAME_HEIGHT) {
      ball.speedY = -ball.speedY * 0.8
      ball.y = ball.y < 0 ? 0 : GAME_HEIGHT - ball.height
    }

    // Stop ball if it's moving very slowly
    if (Math.abs(ball.speedX) < 0.01) ball.speedX = 0
    if (Math.abs(ball.speedY) < 0.01) ball.speedY = 0

    // Ensure the ball doesn't get stuck at the edge
    if (ball.x <= 0 && ball.speedX <= 0) ball.speedX = 0.1
    if (ball.x >= GAME_WIDTH - ball.width && ball.speedX >= 0) ball.speedX = -0.1
    if (ball.y <= 0 && ball.speedY <= 0) ball.speedY = 0.1
    if (ball.y >= GAME_HEIGHT - ball.height && ball.speedY >= 0) ball.speedY = -0.1
  }

  // Check for goals
  const checkGoals = () => {
    const ball = ballRef.current

    // Ball in left goal (CPU scores)
    if (ball.x < leftGoal.x + leftGoal.width && ball.y > leftGoal.y && ball.y < leftGoal.y + leftGoal.height) {
      playSound("goal")
      setCpuScore((prev) => prev + 1)
      resetBall()
    }

    // Ball in right goal (Player scores)
    if (ball.x + ball.width > rightGoal.x && ball.y > rightGoal.y && ball.y < rightGoal.y + rightGoal.height) {
      playSound("goal")
      setPlayerScore((prev) => prev + 1)
      resetBall()
    }
  }

  // Update player position based on input
  const updatePlayerPosition = (deltaTime: number) => {
    const player = playerRef.current
    const keys = keysRef.current
    const touch = touchRef.current

    let dx = 0
    let dy = 0

    // Keyboard controls
    if (keys.ArrowUp || keys.KeyW) dy -= PLAYER_SPEED
    if (keys.ArrowDown || keys.KeyS) dy += PLAYER_SPEED
    if (keys.ArrowLeft || keys.KeyA) dx -= PLAYER_SPEED
    if (keys.ArrowRight || keys.KeyD) dx += PLAYER_SPEED

    // Touch controls
    if (touch.active) {
      dx = touch.dx * PLAYER_SPEED
      dy = touch.dy * PLAYER_SPEED
    }

    // Update player position
    player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x + dx * deltaTime))
    player.y = Math.max(0, Math.min(GAME_HEIGHT - player.height, player.y + dy * deltaTime))

    // Handle kick
    if (keys.Space || touch.action) {
      // Check if player is close to the ball
      if (checkCollision(player, ballRef.current, 20)) {
        playSound("kick")
        // Calculate kick direction from player to ball
        const dx = ballRef.current.x - player.x
        const dy = ballRef.current.y - player.y
        const magnitude = Math.sqrt(dx * dx + dy * dy) || 1
        const normalizedDx = dx / magnitude
        const normalizedDy = dy / magnitude

        ballRef.current.speedX = normalizedDx * KICK_POWER
        ballRef.current.speedY = normalizedDy * KICK_POWER
      }
    }
  }

  // Update CPU AI
  const updateCpuAi = (deltaTime: number) => {
    const cpu = cpuRef.current
    const ball = ballRef.current

    // Simple AI: move toward the ball
    const dx = ball.x - cpu.x
    const dy = ball.y - cpu.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 5) {
      const moveX = (dx / distance) * PLAYER_SPEED * 0.75 * deltaTime
      const moveY = (dy / distance) * PLAYER_SPEED * 0.75 * deltaTime

      // Keep CPU within bounds
      cpu.x = Math.max(0, Math.min(GAME_WIDTH - cpu.width, cpu.x + moveX))
      cpu.y = Math.max(0, Math.min(GAME_HEIGHT - cpu.height, cpu.y + moveY))
    }

    // CPU kick logic
    if (checkCollision(cpu, ball, 20)) {
      // CPU has 1% chance to kick per frame when near ball
      if (Math.random() < 0.01) {
        playSound("kick")
        // Kick toward player's goal
        ball.speedX = -KICK_POWER
        ball.speedY = (Math.random() - 0.5) * KICK_POWER
      }
    }
  }

  // Check for collisions between players and ball
  const handleCollisions = () => {
    const player = playerRef.current
    const cpu = cpuRef.current
    const ball = ballRef.current

    // Player-ball collision
    if (checkCollision(player, ball)) {
      const dx = ball.x - player.x
      const dy = ball.y - player.y
      const magnitude = Math.sqrt(dx * dx + dy * dy) || 1
      const normalizedDx = dx / magnitude
      const normalizedDy = dy / magnitude

      // Push ball away from player
      ball.x += normalizedDx * 5
      ball.y += normalizedDy * 5
      ball.speedX = normalizedDx * BALL_SPEED * 2
      ball.speedY = normalizedDy * BALL_SPEED * 2
    }

    // CPU-ball collision
    if (checkCollision(cpu, ball)) {
      const dx = ball.x - cpu.x
      const dy = ball.y - cpu.y
      const magnitude = Math.sqrt(dx * dx + dy * dy) || 1
      const normalizedDx = dx / magnitude
      const normalizedDy = dy / magnitude

      // Push ball away from CPU
      ball.x += normalizedDx * 5
      ball.y += normalizedDy * 5
      ball.speedX = normalizedDx * BALL_SPEED * 2
      ball.speedY = normalizedDy * BALL_SPEED * 2
    }
  }

  // Draw field
  const drawField = (ctx: CanvasRenderingContext2D) => {
    // Draw concrete background (Brazilian street soccer style)
    ctx.fillStyle = "#4a5568" // Concrete color
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Draw field lines with Brazilian colors
    ctx.strokeStyle = "#FFFFFF"
    ctx.lineWidth = 2

    // Center line
    ctx.beginPath()
    ctx.moveTo(GAME_WIDTH / 2, 0)
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT)
    ctx.stroke()

    // Center circle
    ctx.beginPath()
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 30, 0, Math.PI * 2)
    ctx.stroke()

    // Draw goal areas
    ctx.strokeRect(0, GAME_HEIGHT / 2 - 40, 20, 80)
    ctx.strokeRect(GAME_WIDTH - 20, GAME_HEIGHT / 2 - 40, 20, 80)

    // Draw goals
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(leftGoal.x, leftGoal.y, leftGoal.width, leftGoal.height)
    ctx.fillRect(rightGoal.x, rightGoal.y, rightGoal.width, rightGoal.height)

    // Add Brazilian flair - yellow and green markings
    // Yellow penalty spots
    ctx.fillStyle = "#f1c40f"
    ctx.beginPath()
    ctx.arc(40, GAME_HEIGHT / 2, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(GAME_WIDTH - 40, GAME_HEIGHT / 2, 4, 0, Math.PI * 2)
    ctx.fill()

    // Green center spot
    ctx.fillStyle = "#2ecc71"
    ctx.beginPath()
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw sprite (player or ball)
  const drawSprite = (ctx: CanvasRenderingContext2D, entity: Entity, color: string, isCircle = false) => {
    ctx.fillStyle = color

    if (isCircle) {
      // Draw ball with Brazilian flag-inspired design
      ctx.beginPath()
      ctx.arc(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.width / 2, 0, Math.PI * 2)
      ctx.fill()

      // Add some details to the ball
      ctx.fillStyle = "#2ecc71" // Green
      ctx.beginPath()
      ctx.arc(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.width / 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#f1c40f" // Yellow
      ctx.beginPath()
      ctx.arc(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.width / 8, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Draw pixelated character
      ctx.fillRect(entity.x, entity.y, entity.width, entity.height)

      // Add details to make it look like a player
      ctx.fillStyle = "#000000"
      ctx.fillRect(entity.x + 2, entity.y + 2, 4, 4) // Left eye
      ctx.fillRect(entity.x + entity.width - 6, entity.y + 2, 4, 4) // Right eye

      // Add jersey details
      if (color === "#3498db") {
        // Player (blue)
        // Yellow trim for player (Brazilian colors)
        ctx.fillStyle = "#f1c40f"
        ctx.fillRect(entity.x, entity.y + entity.height - 4, entity.width, 4) // Bottom trim
      } else {
        // CPU (red)
        // White trim for CPU
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(entity.x, entity.y + entity.height - 4, entity.width, 4) // Bottom trim
      }
    }
  }

  // Draw UI
  const drawUI = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "16px monospace"
    ctx.textAlign = "center"

    // Format time as MM:SS
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

    ctx.fillText(timeString, GAME_WIDTH / 2, 20)

    // Draw score
    ctx.textAlign = "left"
    ctx.fillText(`Player: ${playerScore}`, 10, 20)

    ctx.textAlign = "right"
    ctx.fillText(`CPU: ${cpuScore}`, GAME_WIDTH - 10, 20)
  }

  // Draw start screen
  const drawStartScreen = (ctx: CanvasRenderingContext2D) => {
    // Background
    ctx.fillStyle = "#2ecc71" // Green background
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Brazilian flag-inspired design
    ctx.fillStyle = "#f1c40f" // Yellow
    ctx.beginPath()
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40)
    ctx.lineTo(GAME_WIDTH / 2 + 80, GAME_HEIGHT / 2)
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40)
    ctx.lineTo(GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2)
    ctx.closePath()
    ctx.fill()

    // Blue circle
    ctx.fillStyle = "#3498db"
    ctx.beginPath()
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 25, 0, Math.PI * 2)
    ctx.fill()

    // Title
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 16px monospace"
    ctx.textAlign = "center"
    ctx.fillText("BRAZILIAN STREET SOCCER", GAME_WIDTH / 2, 50)

    // Instructions
    ctx.font = "12px monospace"
    ctx.fillText("PRESS SPACE OR CLICK TO START", GAME_WIDTH / 2, GAME_HEIGHT - 50)

    // Controls
    ctx.font = "10px monospace"
    ctx.fillText("ARROWS/WASD: MOVE, SPACE: KICK", GAME_WIDTH / 2, GAME_HEIGHT - 30)
  }

  // Draw end screen
  const drawEndScreen = (ctx: CanvasRenderingContext2D) => {
    // Background
    ctx.fillStyle = "#2ecc71" // Green background
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Brazilian flag-inspired design
    ctx.fillStyle = "#f1c40f" // Yellow
    ctx.beginPath()
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40)
    ctx.lineTo(GAME_WIDTH / 2 + 80, GAME_HEIGHT / 2)
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40)
    ctx.lineTo(GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2)
    ctx.closePath()
    ctx.fill()

    // Title
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 16px monospace"
    ctx.textAlign = "center"
    ctx.fillText("GAME OVER", GAME_WIDTH / 2, 50)

    // Score
    ctx.fillText(`PLAYER: ${playerScore} - CPU: ${cpuScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10)

    // Result
    const result = playerScore > cpuScore ? "YOU WIN!" : playerScore < cpuScore ? "CPU WINS!" : "DRAW!"

    ctx.font = "bold 14px monospace"
    ctx.fillText(result, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20)

    // Instructions
    ctx.font = "12px monospace"
    ctx.fillText("PRESS SPACE OR CLICK TO RESTART", GAME_WIDTH / 2, GAME_HEIGHT - 30)
  }

  // Main render function
  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render based on game state
    if (gameState === "start") {
      drawStartScreen(ctx)
    } else if (gameState === "playing") {
      drawField(ctx)
      drawSprite(ctx, playerRef.current, "#3498db")
      drawSprite(ctx, cpuRef.current, "#e74c3c")
      drawSprite(ctx, ballRef.current, "#f1c40f", true)
      drawUI(ctx)
    } else if (gameState === "end") {
      drawEndScreen(ctx)
    }
  }

  // Game loop
  const gameLoop = (timestamp: number) => {
    if (gameState !== "playing") {
      render()
      gameLoopRef.current = requestAnimationFrame(gameLoop)
      return
    }

    // Calculate delta time
    const deltaTime = (timestamp - lastTimeRef.current) / 16.67 // normalize to ~60fps
    lastTimeRef.current = timestamp

    // Update game state
    updatePlayerPosition(deltaTime)
    updateCpuAi(deltaTime)
    updateBallPhysics(deltaTime)
    handleCollisions()
    checkGoals()

    // Render
    render()

    // Continue loop
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }

  // Set up input handlers
  useEffect(() => {
    // Keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for game controls to avoid scrolling
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)
      ) {
        e.preventDefault()
      }

      keysRef.current[e.code] = true

      // Start game with space
      if (e.code === "Space" && (gameState === "start" || gameState === "end")) {
        startGame()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false
    }

    // Touch input
    const handleTouchStart = (e: TouchEvent) => {
      if (gameState === "start" || gameState === "end") {
        startGame()
        return
      }

      if (e.touches.length === 0) return

      const touch = e.touches[0]
      touchRef.current = {
        ...touchRef.current,
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0 || gameState !== "playing") return
      e.preventDefault() // Prevent scrolling while playing

      const touch = e.touches[0]

      // Calculate normalized direction vector
      const dx = (touch.clientX - touchRef.current.startX) / 30
      const dy = (touch.clientY - touchRef.current.startY) / 30

      // Clamp values between -1 and 1
      const clampedDx = Math.max(-1, Math.min(1, dx))
      const clampedDy = Math.max(-1, Math.min(1, dy))

      touchRef.current = {
        ...touchRef.current,
        currentX: touch.clientX,
        currentY: touch.clientY,
        dx: clampedDx,
        dy: clampedDy,
      }
    }

    const handleTouchEnd = () => {
      touchRef.current = {
        ...touchRef.current,
        active: false,
        dx: 0,
        dy: 0,
      }
    }

    // Tap for kick
    const handleTap = () => {
      if (gameState !== "playing") return

      touchRef.current = {
        ...touchRef.current,
        action: true,
      }

      // Reset action after a short delay
      setTimeout(() => {
        touchRef.current = {
          ...touchRef.current,
          action: false,
        }
      }, 100)
    }

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd)
    window.addEventListener("touchend", handleTap)
    window.addEventListener("click", handleTap)

    // Clean up
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("touchend", handleTap)
      window.removeEventListener("click", handleTap)

      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState])

  // Timer effect
  useEffect(() => {
    if (gameState !== "playing") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = GAME_WIDTH
      canvas.height = GAME_HEIGHT

      // Start initial render
      const ctx = canvas.getContext("2d")
      if (ctx) {
        drawStartScreen(ctx)
      }
    }

    // Start game loop
    lastTimeRef.current = performance.now()
    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
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
