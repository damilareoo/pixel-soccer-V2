"use client"

import { useEffect, useRef, useState } from "react"

// Game constants
const GAME_WIDTH = 320
const GAME_HEIGHT = 240
const PLAYER_SPEED = 3.5
const BALL_SPEED = 2.5
const KICK_POWER = 6
const GAME_DURATION = 120 // 2 minutes in seconds
const GOAL_WIDTH = 12
const GOAL_HEIGHT = 60

// Ball unstuck constants
const STUCK_THRESHOLD_SPEED = 0.1 // Ball speed below this is considered stuck
const STUCK_CORNER_DISTANCE = 20 // Distance from corner to consider it stuck
const STUCK_DURATION_MS = 500 // How long before we intervene (milliseconds)
const UNSTUCK_FORCE = 2 // Force to apply to unstuck the ball

// Retro Color Palette
const COLORS = {
  background: "#222034", // Dark background for overall app
  fieldGreenDark: "#306850",
  fieldGreenLight: "#306850", // Keeping it simple for retro
  lineWhite: "#E0E0E0",
  playerBlue: "#493C2B", // Darker, more retro blue
  cpuRed: "#854C30", // Darker, more retro red
  ballYellow: "#F7E26B", // Brighter yellow for ball
  uiText: "#F7E26B", // Yellow for UI text
  uiBackground: "#1A1C2C", // Dark blue/purple for UI elements
  goalWhite: "#E0E0E0",
  goalNet: "#A0A0A0",
  warningRed: "#D24B4B", // Retro red for warnings
}

// Add these new constants for touch controls
const TOUCH_CONTROLS_ENABLED = true

// Brazilian Soccer Game Component
function BrazilianSoccerGame({
  gameStarted,
  setGameStarted,
}: {
  gameStarted: boolean
  setGameStarted: (started: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number | null>(null)

  // Game state
  const [score, setScore] = useState({ player: 0, cpu: 0 })
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [gameOver, setGameOver] = useState(false)
  const [goalFlash, setGoalFlash] = useState(false) // State for "GOAL!" text

  // Ref to hold the latest score for the game loop
  const scoreRef = useRef(score)
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  // Ref to hold the latest time left for the game loop
  const timeLeftRef = useRef(timeLeft)
  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  // Ref to track if the ball is stuck
  const ballStuckTimerRef = useRef<number | null>(null)

  // Game objects using refs to avoid re-renders
  // Adjusted initial Y positions to account for the new top UI bar
  const playerRef = useRef({ x: 80, y: 140, width: 16, height: 16 })
  const cpuRef = useRef({ x: 240, y: 140, width: 16, height: 16 })
  const ballRef = useRef({ x: 160, y: 140, width: 8, height: 8, speedX: 0, speedY: 0 })

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

  // Add state for device detection
  const [isMobile, setIsMobile] = useState(false)
  const [showTouchControls, setShowTouchControls] = useState(false)

  // Add refs for touch controls
  const touchJoystickRef = useRef<HTMLDivElement>(null)
  const kickButtonRef = useRef<HTMLDivElement>(null)

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      setIsMobile(isMobileDevice)
      setShowTouchControls(isMobileDevice && TOUCH_CONTROLS_ENABLED)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Sound effect function
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

  // Start the game
  const startGame = () => {
    playSound("whistle")
    setGameStarted(true)
    setGameOver(false)
    setScore({ player: 0, cpu: 0 })
    setTimeLeft(GAME_DURATION)

    // Reset positions
    playerRef.current = { x: 80, y: 140, width: 16, height: 16 }
    cpuRef.current = { x: 240, y: 140, width: 16, height: 16 }
    resetBall()

    // Start game loop if not already running
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(gameLoop)
    }
  }

  // End the game
  const endGame = () => {
    playSound("whistle")
    setGameOver(true)
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for game controls to avoid scrolling
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)
      ) {
        e.preventDefault()
      }

      // Start game with space
      if (e.code === "Space" && (!gameStarted || gameOver)) {
        startGame()
        return
      }

      keysRef.current[e.code] = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameStarted, gameOver])

  // Handle touch input
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!gameStarted || gameOver) {
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
      if (e.touches.length === 0 || !gameStarted || gameOver) return
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

      // Tap to kick
      touchRef.current.action = true
      setTimeout(() => {
        touchRef.current.action = false
      }, 100)
    }

    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [gameStarted, gameOver])

  // Handle click to start
  useEffect(() => {
    const handleClick = () => {
      if (!gameStarted || gameOver) {
        startGame()
      }
    }

    window.addEventListener("click", handleClick)

    return () => {
      window.removeEventListener("click", handleClick)
    }
  }, [gameStarted, gameOver])

  // Timer effect
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1
        timeLeftRef.current = newTime // Update ref immediately
        if (newTime <= 0) {
          clearInterval(timer)
          endGame()
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameOver])

  // Add a resize handler to ensure pixel-perfect rendering on all devices
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Get the container dimensions
      const container = canvas.parentElement
      if (!container) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      // Calculate the maximum size while maintaining aspect ratio
      const aspectRatio = GAME_WIDTH / GAME_HEIGHT
      let width = containerWidth
      let height = width / aspectRatio

      if (height > containerHeight) {
        height = containerHeight
        width = height * aspectRatio
      }

      // Set canvas display size (CSS pixels)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Set canvas render size (actual pixels)
      canvas.width = GAME_WIDTH
      canvas.height = GAME_HEIGHT
    }

    // Initial resize
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [gameStarted, gameOver])

  // Improved resize handler for better responsiveness
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Get the container dimensions
      const container = canvas.parentElement
      if (!container) return

      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      // Calculate the maximum size while maintaining aspect ratio
      const aspectRatio = GAME_WIDTH / GAME_HEIGHT
      let width = containerWidth
      let height = width / aspectRatio

      if (height > containerHeight) {
        height = containerHeight
        width = height * aspectRatio
      }

      // Set canvas display size (CSS pixels)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Set canvas render size (actual pixels)
      canvas.width = GAME_WIDTH
      canvas.height = GAME_HEIGHT

      // Update touch controls position if they exist
      if (showTouchControls) {
        if (touchJoystickRef.current) {
          touchJoystickRef.current.style.left = `${width * 0.15}px`
          touchJoystickRef.current.style.bottom = `${height * 0.15}px`
        }

        if (kickButtonRef.current) {
          kickButtonRef.current.style.right = `${width * 0.15}px`
          kickButtonRef.current.style.bottom = `${height * 0.15}px`
        }
      }
    }

    // Initial resize
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [gameStarted, gameOver, showTouchControls])

  // Enhanced touch input handling for better mobile experience
  useEffect(() => {
    if (!isMobile) return

    let joystickActive = false
    let kickActive = false
    let joystickStartX = 0
    let joystickStartY = 0

    const handleJoystickStart = (e: TouchEvent) => {
      if (!gameStarted || gameOver) {
        startGame()
        return
      }

      joystickActive = true
      const touch = e.touches[0]
      joystickStartX = touch.clientX
      joystickStartY = touch.clientY

      touchRef.current = {
        ...touchRef.current,
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        dx: 0,
        dy: 0,
      }

      e.preventDefault()
    }

    const handleJoystickMove = (e: TouchEvent) => {
      if (!joystickActive || !gameStarted || gameOver) return

      const touch = e.touches[0]

      // Calculate normalized direction vector
      const dx = (touch.clientX - joystickStartX) / 50 // More sensitive
      const dy = (touch.clientY - joystickStartY) / 50

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

      e.preventDefault()
    }

    const handleJoystickEnd = () => {
      joystickActive = false
      touchRef.current = {
        ...touchRef.current,
        active: false,
        dx: 0,
        dy: 0,
      }
    }

    const handleKickStart = (e: TouchEvent) => {
      if (!gameStarted || gameOver) {
        startGame()
        return
      }

      kickActive = true
      touchRef.current.action = true
      e.preventDefault()
    }

    const handleKickEnd = () => {
      kickActive = false
      setTimeout(() => {
        touchRef.current.action = false
      }, 100)
    }

    // Add touch controls event listeners if they exist
    if (touchJoystickRef.current) {
      touchJoystickRef.current.addEventListener("touchstart", handleJoystickStart)
      touchJoystickRef.current.addEventListener("touchmove", handleJoystickMove, { passive: false })
      touchJoystickRef.current.addEventListener("touchend", handleJoystickEnd)
    }

    if (kickButtonRef.current) {
      kickButtonRef.current.addEventListener("touchstart", handleKickStart)
      kickButtonRef.current.addEventListener("touchend", handleKickEnd)
    }

    return () => {
      if (touchJoystickRef.current) {
        touchJoystickRef.current.removeEventListener("touchstart", handleJoystickStart)
        touchJoystickRef.current.removeEventListener("touchmove", handleJoystickMove)
        touchJoystickRef.current.removeEventListener("touchend", handleJoystickEnd)
      }

      if (kickButtonRef.current) {
        kickButtonRef.current.removeEventListener("touchstart", handleKickStart)
        kickButtonRef.current.removeEventListener("touchend", handleKickEnd)
      }
    }
  }, [isMobile, gameStarted, gameOver, touchJoystickRef.current, kickButtonRef.current])

  // Draw field
  const drawField = (ctx: CanvasRenderingContext2D) => {
    // Draw field with grass pattern
    const patternCanvas = document.createElement("canvas")
    patternCanvas.width = 16
    patternCanvas.height = 16
    const patternCtx = patternCanvas.getContext("2d")

    if (patternCtx) {
      patternCtx.fillStyle = COLORS.fieldGreenDark
      patternCtx.fillRect(0, 0, 16, 16)

      patternCtx.fillStyle = COLORS.fieldGreenLight
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(Math.random() * 16)
        const y = Math.floor(Math.random() * 16)
        patternCtx.fillRect(x, y, 2, 2)
      }
    }
    const grassPattern = ctx.createPattern(patternCanvas, "repeat")

    if (grassPattern) {
      ctx.fillStyle = grassPattern
    } else {
      ctx.fillStyle = COLORS.fieldGreenDark
    }
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Draw field markings
    ctx.strokeStyle = COLORS.lineWhite
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

    // Center spot
    ctx.fillStyle = COLORS.lineWhite
    ctx.beginPath()
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Penalty areas (simplified for retro look)
    ctx.strokeRect(0, GAME_HEIGHT / 2 - 50, 40, 100)
    ctx.strokeRect(GAME_WIDTH - 40, GAME_HEIGHT / 2 - 50, 40, 100)

    // Penalty spots
    ctx.beginPath()
    ctx.arc(30, GAME_HEIGHT / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(GAME_WIDTH - 30, GAME_HEIGHT / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Corner arcs (simplified)
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(GAME_WIDTH, 0, 10, Math.PI / 2, Math.PI)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, GAME_HEIGHT, 10, 0, -Math.PI / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(GAME_WIDTH, GAME_HEIGHT, 10, -Math.PI / 2, -Math.PI)
    ctx.stroke()

    // Draw goals
    ctx.fillStyle = COLORS.goalWhite
    ctx.strokeStyle = COLORS.goalNet
    ctx.lineWidth = 1

    // Left goal
    ctx.fillRect(0, GAME_HEIGHT / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT)
    ctx.strokeRect(0, GAME_HEIGHT / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT)

    // Right goal
    ctx.fillRect(GAME_WIDTH - GOAL_WIDTH, GAME_HEIGHT / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT)
    ctx.strokeRect(GAME_WIDTH - GOAL_WIDTH, GAME_HEIGHT / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT)

    // Add goal nets (simple pixel pattern)
    ctx.fillStyle = COLORS.goalNet
    const netSpacing = 4 // Smaller spacing for more pixelated net
    for (let y = GAME_HEIGHT / 2 - GOAL_HEIGHT / 2; y < GAME_HEIGHT / 2 + GOAL_HEIGHT / 2; y += netSpacing) {
      for (let x = 0; x < GOAL_WIDTH; x += netSpacing) {
        ctx.fillRect(x, y, 1, 1) // Left goal net
        ctx.fillRect(GAME_WIDTH - GOAL_WIDTH + x, y, 1, 1) // Right goal net
      }
    }
  }

  // Draw sprite (player or ball)
  const drawSprite = (
    ctx: CanvasRenderingContext2D,
    entity: typeof playerRef.current,
    color: string,
    isCircle = false,
  ) => {
    ctx.fillStyle = color

    if (isCircle) {
      // Draw ball with retro details
      ctx.beginPath()
      ctx.arc(entity.x + entity.width / 2, entity.y + entity.height / 2, entity.width / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.uiBackground // Dark color for seams
      ctx.fillRect(entity.x + 2, entity.y + 2, 1, 1)
      ctx.fillRect(entity.x + entity.width - 3, entity.y + 2, 1, 1)
      ctx.fillRect(entity.x + 2, entity.y + entity.height - 3, 1, 1)
      ctx.fillRect(entity.x + entity.width - 3, entity.y + entity.height - 3, 1, 1)
    } else {
      // Draw pixelated character
      ctx.fillRect(entity.x, entity.y, entity.width, entity.height)

      // Add details to make it look like a player
      ctx.fillStyle = COLORS.lineWhite
      ctx.fillRect(entity.x + 2, entity.y + 2, 2, 2) // Left eye
      ctx.fillRect(entity.x + entity.width - 4, entity.y + 2, 2, 2) // Right eye
      ctx.fillRect(entity.x + 4, entity.y + entity.height - 4, 8, 2) // Mouth/Shirt detail
    }
  }

  // Draw game UI (scoreboard, timer)
  const drawGameUI = (ctx: CanvasRenderingContext2D) => {
    const UI_TOP_OFFSET = 8 // Padding from the top of the canvas
    const SCOREBOARD_HEIGHT = 24
    const TIMER_HEIGHT = 20
    const UI_ELEMENT_GAP = 4 // Gap between scoreboard and timer

    // Player score
    ctx.fillStyle = COLORS.playerBlue
    ctx.font = "16px 'Press Start 2P', monospace"
    ctx.textAlign = "left"
    ctx.fillText(`P1: ${scoreRef.current.player}`, 10, UI_TOP_OFFSET + 18)

    // CPU score
    ctx.fillStyle = COLORS.cpuRed
    ctx.textAlign = "right"
    ctx.fillText(`CPU: ${scoreRef.current.cpu}`, GAME_WIDTH - 10, UI_TOP_OFFSET + 18)

    // Draw timer with more prominence
    const TIMER_Y_POSITION = UI_TOP_OFFSET + SCOREBOARD_HEIGHT + UI_ELEMENT_GAP

    // Timer text
    const minutes = Math.floor(timeLeftRef.current / 60)
    const seconds = timeLeftRef.current % 60
    const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`
    ctx.fillStyle = timeLeftRef.current <= 30 ? COLORS.warningRed : COLORS.uiText
    ctx.font = "16px 'Press Start 2P', monospace"
    ctx.textAlign = "center"
    ctx.fillText(timeString, GAME_WIDTH / 2, TIMER_Y_POSITION + 15)

    // Add a pulsing effect when time is running out
    if (timeLeftRef.current <= 10 && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = COLORS.warningRed
      ctx.globalAlpha = 0.3
      ctx.globalAlpha = 1.0
    }

    // "GOAL!" flash text
    if (goalFlash) {
      ctx.fillStyle = COLORS.warningRed // Use a vibrant color for "GOAL!"
      ctx.font = "bold 40px 'Press Start 2P', monospace"
      ctx.textAlign = "center"
      ctx.fillText("GOAL!", GAME_WIDTH / 2, GAME_HEIGHT / 2)
    }
  }

  // Game loop
  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let lastFrameTime = 0
    const targetFPS = 60
    const frameInterval = 1000 / targetFPS

    const gameLoopInner = (timestamp: number) => {
      const deltaTime = timestamp - lastFrameTime
      if (deltaTime < frameInterval) {
        requestRef.current = requestAnimationFrame(gameLoopInner)
        return
      }
      const speedMultiplier = deltaTime / frameInterval
      lastFrameTime = timestamp - (deltaTime % frameInterval)

      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      drawField(ctx) // Draw field background and lines

      // Update player position based on input
      const player = playerRef.current
      const keys = keysRef.current
      const touch = touchRef.current

      let dx = 0
      let dy = 0

      // Keyboard controls
      if (keys.ArrowUp || keys.KeyW) dy -= PLAYER_SPEED * speedMultiplier
      if (keys.ArrowDown || keys.KeyS) dy += PLAYER_SPEED * speedMultiplier
      if (keys.ArrowLeft || keys.KeyA) dx -= PLAYER_SPEED * speedMultiplier
      if (keys.ArrowRight || keys.KeyD) dx += PLAYER_SPEED * speedMultiplier

      // Touch controls
      if (touch.active) {
        dx = touch.dx * PLAYER_SPEED * speedMultiplier
        dy = touch.dy * PLAYER_SPEED * speedMultiplier
      }

      // Update player position
      player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x + dx))
      player.y = Math.max(0, Math.min(GAME_HEIGHT - player.height, player.y + dy))

      // Simple CPU AI - follow the ball but not too aggressively
      const cpu = cpuRef.current
      const ball = ballRef.current

      const cpuToBallX = ball.x - cpu.x
      const cpuToBallY = ball.y - cpu.y
      const cpuToBallDist = Math.sqrt(cpuToBallX * cpuToBallX + cpuToBallY * cpuToBallY)

      if (cpuToBallDist > 5) {
        const cpuSpeed = PLAYER_SPEED * 0.6
        const aggressionFactor = ball.x > GAME_WIDTH / 2 ? 1 : 0.5

        const cpuDx = (cpuToBallX / cpuToBallDist) * cpuSpeed * aggressionFactor * speedMultiplier
        const cpuDy = (cpuToBallY / cpuToBallDist) * cpuSpeed * aggressionFactor * speedMultiplier

        cpu.x = Math.max(GAME_WIDTH / 2 - 20, Math.min(GAME_WIDTH - cpu.width, cpu.x + cpuDx))
        cpu.y = Math.max(0, Math.min(GAME_HEIGHT - cpu.height, cpu.y + cpuDy))
      }

      // Update ball position with speed multiplier for consistent physics
      ball.x += ball.speedX * speedMultiplier
      ball.y += ball.speedY * speedMultiplier

      // Ball friction
      ball.speedX *= Math.pow(0.98, speedMultiplier)
      ball.speedY *= Math.pow(0.98, speedMultiplier)

      // Stop ball if it's moving very slowly
      if (Math.abs(ball.speedX) < 0.01) ball.speedX = 0
      if (Math.abs(ball.speedY) < 0.01) ball.speedY = 0

      // Ball collision with walls
      if (ball.y < 0 || ball.y + ball.height > GAME_HEIGHT) {
        ball.speedY = -ball.speedY * 0.8
        ball.y = ball.y < 0 ? 0 : GAME_HEIGHT - ball.height
      }

      // Check for goals - left goal (CPU scores)
      if (
        ball.x < GOAL_WIDTH &&
        ball.y > GAME_HEIGHT / 2 - GOAL_HEIGHT / 2 &&
        ball.y < GAME_HEIGHT / 2 + GOAL_HEIGHT / 2
      ) {
        playSound("goal")
        setScore((prev) => {
          const newScore = { ...prev, cpu: prev.cpu + 1 }
          scoreRef.current = newScore // Update ref immediately
          return newScore
        })
        setGoalFlash(true)
        setTimeout(() => setGoalFlash(false), 1000) // Show "GOAL!" for 1 second
        resetBall()
      }

      // Check for goals - right goal (Player scores)
      if (
        ball.x + ball.width > GAME_WIDTH - GOAL_WIDTH &&
        ball.y > GAME_HEIGHT / 2 - GOAL_HEIGHT / 2 &&
        ball.y < GAME_HEIGHT / 2 + GOAL_HEIGHT / 2
      ) {
        playSound("goal")
        setScore((prev) => {
          const newScore = { ...prev, player: prev.player + 1 }
          scoreRef.current = newScore // Update ref immediately
          return newScore
        })
        setGoalFlash(true)
        setTimeout(() => setGoalFlash(false), 1000) // Show "GOAL!" for 1 second
        resetBall()
      }

      // Ball collision with walls (sides)
      if (
        (ball.x < 0 && (ball.y < GAME_HEIGHT / 2 - GOAL_HEIGHT / 2 || ball.y > GAME_HEIGHT / 2 + GOAL_HEIGHT / 2)) ||
        (ball.x + ball.width > GAME_WIDTH &&
          (ball.y < GAME_HEIGHT / 2 - GOAL_HEIGHT / 2 || ball.y > GAME_HEIGHT / 2 + GOAL_HEIGHT / 2))
      ) {
        ball.speedX = -ball.speedX * 0.8
        ball.x = ball.x < 0 ? 0 : GAME_WIDTH - ball.width
      }

      // Ball collision with player
      if (
        ball.x < player.x + player.width &&
        ball.x + ball.width > player.x &&
        ball.y < player.y + player.height &&
        ball.y + ball.height > player.y
      ) {
        playSound("kick")

        const dx = ball.x + ball.width / 2 - (player.x + player.width / 2)
        const dy = ball.y + ball.height / 2 - (player.y + player.height / 2)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        ball.speedX = (dx / dist) * BALL_SPEED * 2
        ball.speedY = (dy / dist) * BALL_SPEED * 2

        if (dx > 0) {
          ball.x = player.x + player.width + 1
        } else {
          ball.x = player.x - ball.width - 1
        }
      }

      // Ball collision with CPU
      if (
        ball.x < cpu.x + cpu.width &&
        ball.x + ball.width > cpu.x &&
        ball.y < cpu.y + cpu.height &&
        ball.y + ball.height > cpu.y
      ) {
        playSound("kick")

        const dx = ball.x + ball.width / 2 - (cpu.x + cpu.width / 2)
        const dy = ball.y + ball.height / 2 - (cpu.y + cpu.height / 2)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        ball.speedX = (dx / dist) * BALL_SPEED * 2
        ball.speedY = (dy / dist) * BALL_SPEED * 2

        if (dx > 0) {
          ball.x = cpu.x + cpu.width + 1
        } else {
          ball.x = cpu.x - ball.width - 1
        }
      }

      // Kick the ball - improved mechanics
      if (keysRef.current.Space || touchRef.current.action) {
        const dx = ball.x + ball.width / 2 - (player.x + player.width / 2)
        const dy = ball.y + ball.height / 2 - (player.y + player.height / 2)
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 40) {
          playSound("kick")

          let kickDx = dx / dist
          const kickDy = dy / dist

          if (player.x < GAME_WIDTH / 2) {
            kickDx = (kickDx + 0.3) / 1.3
          }

          ball.speedX = kickDx * KICK_POWER
          ball.speedY = kickDy * KICK_POWER

          ball.speedY += (Math.random() - 0.5) * 2
        }
      }

      // Ball unstuck mechanism
      const isBallSlow = Math.abs(ball.speedX) < STUCK_THRESHOLD_SPEED && Math.abs(ball.speedY) < STUCK_THRESHOLD_SPEED
      const isBallInCorner =
        (ball.x < STUCK_CORNER_DISTANCE && ball.y < STUCK_CORNER_DISTANCE) || // Top-left
        (ball.x + ball.width > GAME_WIDTH - STUCK_CORNER_DISTANCE && ball.y < STUCK_CORNER_DISTANCE) || // Top-right
        (ball.x < STUCK_CORNER_DISTANCE && ball.y + ball.height > GAME_HEIGHT - STUCK_CORNER_DISTANCE) || // Bottom-left
        (ball.x + ball.width > GAME_WIDTH - STUCK_CORNER_DISTANCE &&
          ball.y + ball.height > GAME_HEIGHT - STUCK_CORNER_DISTANCE) // Bottom-right

      if (isBallSlow && isBallInCorner) {
        if (ballStuckTimerRef.current === null) {
          ballStuckTimerRef.current = timestamp
        } else if (timestamp - ballStuckTimerRef.current > STUCK_DURATION_MS) {
          // Apply force to push ball towards center
          const centerX = GAME_WIDTH / 2
          const centerY = GAME_HEIGHT / 2
          const dxToCenter = centerX - ball.x
          const dyToCenter = centerY - ball.y
          const distToCenter = Math.sqrt(dxToCenter * dxToCenter + dyToCenter * dyToCenter) || 1

          ball.speedX = (dxToCenter / distToCenter) * UNSTUCK_FORCE
          ball.speedY = (dyToCenter / distToCenter) * UNSTUCK_FORCE

          ballStuckTimerRef.current = null // Reset timer
        }
      } else {
        ballStuckTimerRef.current = null // Reset timer if not stuck
      }

      // Draw player (retro blue)
      drawSprite(ctx, player, COLORS.playerBlue)

      // Draw CPU (retro red)
      drawSprite(ctx, cpu, COLORS.cpuRed)

      // Draw ball (retro yellow with simple black seams)
      drawSprite(ctx, ball, COLORS.ballYellow, true)

      // Draw UI
      drawGameUI(ctx)

      requestRef.current = requestAnimationFrame(gameLoopInner)
    }

    requestRef.current = requestAnimationFrame(gameLoopInner)

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }

  // Main component render
  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="pixelated w-full h-full"
        style={{
          imageRendering: "pixelated",
          objectFit: "contain",
          backgroundColor: COLORS.background, // Use retro background color
        }}
      />

      {/* Touch controls for mobile */}
      {showTouchControls && gameStarted && !gameOver && (
        <>
          <div
            ref={touchJoystickRef}
            className="touch-button"
            style={{
              left: "15%",
              bottom: "15%",
              width: "70px",
              height: "70px",
              opacity: 0.7,
              backgroundColor: COLORS.uiBackground, // Retro UI background
              borderColor: COLORS.uiText, // Retro UI border
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.uiText} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8l0 8M8 12l8 0" />
            </svg>
          </div>

          <div
            ref={kickButtonRef}
            className="touch-button"
            style={{
              right: "15%",
              bottom: "15%",
              width: "70px",
              height: "70px",
              opacity: 0.7,
              backgroundColor: COLORS.uiBackground, // Retro UI background
              borderColor: COLORS.uiText, // Retro UI border
            }}
          >
            <span className="text-lg" style={{ color: COLORS.uiText }}>
              KICK
            </span>
          </div>
        </>
      )}

      {/* Start Screen */}
      {!gameStarted && !gameOver && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 touch-control"
          style={{ backgroundColor: COLORS.fieldGreenDark }} // Retro green background
          onClick={startGame}
          onTouchStart={startGame}
        >
          {/* Simplified retro background elements */}
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-8" style={{ backgroundColor: COLORS.uiText }}></div>
            <div className="absolute bottom-0 left-0 w-full h-8" style={{ backgroundColor: COLORS.uiText }}></div>
            <div
              className="absolute top-8 left-0 w-8 h-[calc(100%-16px)]"
              style={{ backgroundColor: COLORS.uiText }}
            ></div>
            <div
              className="absolute top-8 right-0 w-8 h-[calc(100%-16px)]"
              style={{ backgroundColor: COLORS.uiText }}
            ></div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Simplified retro ball icon */}
            <div
              className="w-24 sm:w-32 h-24 sm:h-32 rounded-full mb-4 sm:mb-6 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: COLORS.ballYellow }}
            >
              <div
                className="w-16 sm:w-24 h-16 sm:h-24 rounded-full flex items-center justify-center"
                style={{ backgroundColor: COLORS.uiBackground }}
              >
                <div
                  className="w-10 sm:w-16 h-10 sm:h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: COLORS.fieldGreenDark }}
                >
                  <span className="font-bold text-base sm:text-xl" style={{ color: COLORS.uiText }}>
                    BR
                  </span>
                </div>
              </div>
            </div>

            <p
              className="text-base sm:text-xl mb-2 sm:mb-4 animate-pulse font-bold"
              style={{ color: COLORS.uiText, fontFamily: "'Press Start 2P', monospace" }}
            >
              {isMobile ? "TAP TO START" : "PRESS START"}
            </p>

            <div
              className="p-2 sm:p-4 rounded-lg text-sm sm:text-base"
              style={{
                backgroundColor: COLORS.uiBackground,
                color: COLORS.uiText,
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              <p className="mb-1 font-bold">CONTROLS:</p>
              {isMobile ? (
                <p>DRAG LEFT TO MOVE • TAP RIGHT TO KICK</p>
              ) : (
                <>
                  <p className="mb-1">WASD/ARROWS: MOVE</p>
                  <p>SPACE: KICK</p>
                </>
              )}
              <p className="mt-2" style={{ color: COLORS.warningRed }}>
                2 MINUTE MATCH
              </p>
            </div>
          </div>
        </div>
      )}

      {/* End Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-4 touch-control"
          style={{ backgroundColor: COLORS.fieldGreenDark }} // Retro green background
          onClick={startGame}
          onTouchStart={startGame}
        >
          {/* Simplified retro background elements */}
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-8" style={{ backgroundColor: COLORS.uiText }}></div>
            <div className="absolute bottom-0 left-0 w-full h-8" style={{ backgroundColor: COLORS.uiText }}></div>
            <div
              className="absolute top-8 left-0 w-8 h-[calc(100%-16px)]"
              style={{ backgroundColor: COLORS.uiText }}
            ></div>
            <div
              className="absolute top-8 right-0 w-8 h-[calc(100%-16px)]"
              style={{ backgroundColor: COLORS.uiText }}
            ></div>
          </div>

          <h1
            className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4"
            style={{ color: COLORS.uiText, fontFamily: "'Press Start 2P', monospace" }}
          >
            GAME OVER!
          </h1>

          <div
            className="p-4 sm:p-6 rounded-lg mb-4 sm:mb-6 shadow-lg max-w-xs sm:max-w-sm"
            style={{
              backgroundColor: COLORS.uiBackground,
              color: COLORS.uiText,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            <h2 className="text-lg sm:text-2xl mb-2 sm:mb-4 text-center">FINAL SCORE</h2>
            <div className="flex justify-center items-center gap-4 sm:gap-8">
              <div className="text-center">
                <div
                  className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-1 sm:mb-2 flex items-center justify-center"
                  style={{ backgroundColor: COLORS.playerBlue }}
                >
                  <span className="font-bold" style={{ color: COLORS.uiText }}>
                    P1
                  </span>
                </div>
                <p className="font-bold text-sm sm:text-base">PLAYER</p>
                <p className="text-xl sm:text-3xl font-bold">{score.player}</p>
              </div>
              <span className="text-xl sm:text-3xl">-</span>
              <div className="text-center">
                <div
                  className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-1 sm:mb-2 flex items-center justify-center"
                  style={{ backgroundColor: COLORS.cpuRed }}
                >
                  <span className="font-bold" style={{ color: COLORS.uiText }}>
                    CPU
                  </span>
                </div>
                <p className="font-bold text-sm sm:text-base">CPU</p>
                <p className="text-xl sm:text-3xl font-bold">{score.cpu}</p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">
                {score.player > score.cpu ? "YOU WIN!" : score.player < score.cpu ? "CPU WINS!" : "DRAW!"}
              </p>
              <p className="text-xs sm:text-sm opacity-80">
                {score.player > score.cpu
                  ? "CONGRATULATIONS!"
                  : score.player < score.cpu
                    ? "BETTER LUCK NEXT TIME!"
                    : "AN EVEN MATCH!"}
              </p>
            </div>
          </div>

          <p
            className="text-base sm:text-xl mb-2 animate-pulse font-bold"
            style={{ color: COLORS.uiText, fontFamily: "'Press Start 2P', monospace" }}
          >
            {isMobile ? "TAP TO PLAY AGAIN" : "PRESS START TO PLAY AGAIN"}
          </p>
        </div>
      )}

      {/* Orientation warning for landscape on small devices */}
      <div className="orientation-warning" style={{ backgroundColor: COLORS.uiBackground, color: COLORS.uiText }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={COLORS.uiText} strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
        <h2 className="text-xl font-bold mt-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          ROTATE DEVICE
        </h2>
        <p className="mt-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          FOR BEST EXPERIENCE, USE PORTRAIT MODE
        </p>
      </div>
    </div>
  )
}

// Replace the main container with a more responsive layout
export default function Home() {
  const [gameStarted, setGameStarted] = useState(false)

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: COLORS.background }} // Overall app background
    >
      <h1
        className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4 text-shadow-sm"
        style={{ color: COLORS.uiText, fontFamily: "'Press Start 2P', monospace" }}
      >
        PIXEL SOCCER
      </h1>

      <div
        className="relative w-full max-w-2xl aspect-[4/3] bg-black rounded-lg overflow-hidden shadow-2xl border-2 sm:border-4"
        style={{ borderColor: COLORS.uiText }}
      >
        <BrazilianSoccerGame gameStarted={gameStarted} setGameStarted={setGameStarted} />
      </div>

      <div
        className="mt-2 sm:mt-4 text-center text-xs sm:text-sm md:text-base max-w-md"
        style={{ color: COLORS.uiText, fontFamily: "'Press Start 2P', monospace" }}
      >
        <p className="font-bold mb-1">CONTROLS:</p>
        <p className="text-xs sm:text-sm">
          <span className="hidden sm:inline">DESKTOP: WASD/ARROWS TO MOVE, SPACE TO KICK | </span>
          <span>MOBILE: DRAG TO MOVE, TAP TO KICK</span>
        </p>
      </div>
    </main>
  )
}
