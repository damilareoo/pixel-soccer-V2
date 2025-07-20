export function drawField(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw concrete background (Brazilian street soccer style)
  ctx.fillStyle = "#4a5568" // Concrete color
  ctx.fillRect(0, 0, width, height)

  // Draw field lines with Brazilian colors
  ctx.strokeStyle = "#FFFFFF"
  ctx.lineWidth = 2

  // Center line
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()

  // Center circle
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 30, 0, Math.PI * 2)
  ctx.stroke()

  // Draw goal areas
  ctx.strokeRect(0, height / 2 - 40, 20, 80)
  ctx.strokeRect(width - 20, height / 2 - 40, 20, 80)

  // Draw corner arcs
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, Math.PI / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(width, 0, 10, Math.PI / 2, Math.PI)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, height, 10, 0, -Math.PI / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(width, height, 10, -Math.PI / 2, -Math.PI)
  ctx.stroke()

  // Add Brazilian flair - yellow and green markings
  // Yellow penalty spots
  ctx.fillStyle = "#f1c40f"
  ctx.beginPath()
  ctx.arc(40, height / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(width - 40, height / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  // Green center spot
  ctx.fillStyle = "#2ecc71"
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  // Add some street texture - cracks in the concrete
  ctx.strokeStyle = "#2d3748"
  ctx.lineWidth = 1

  // Random cracks
  for (let i = 0; i < 10; i++) {
    const startX = Math.random() * width
    const startY = Math.random() * height

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + (Math.random() - 0.5) * 30, startY + (Math.random() - 0.5) * 30)
    ctx.stroke()
  }
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  isCircle = false,
) {
  ctx.fillStyle = color

  if (isCircle) {
    // Draw ball with Brazilian flag-inspired design
    ctx.beginPath()
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2)
    ctx.fill()

    // Add some details to the ball
    ctx.fillStyle = "#2ecc71" // Green
    ctx.beginPath()
    ctx.arc(x + width / 2, y + height / 2, width / 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#f1c40f" // Yellow
    ctx.beginPath()
    ctx.arc(x + width / 2, y + height / 2, width / 8, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Draw pixelated character with Brazilian-inspired colors
    ctx.fillRect(x, y, width, height)

    // Add details to make it look like a player
    ctx.fillStyle = "#000000"
    ctx.fillRect(x + 2, y + 2, 4, 4) // Left eye
    ctx.fillRect(x + width - 6, y + 2, 4, 4) // Right eye

    // Add jersey details
    if (color === "#3498db") {
      // Player (blue)
      // Yellow trim for player (Brazilian colors)
      ctx.fillStyle = "#f1c40f"
      ctx.fillRect(x, y + height - 4, width, 4) // Bottom trim
    } else {
      // CPU (red)
      // White trim for CPU
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(x, y + height - 4, width, 4) // Bottom trim
    }
  }
}
