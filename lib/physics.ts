interface Entity {
  x: number
  y: number
  width: number
  height: number
  speedX: number
  speedY: number
}

// Fix the ball physics to make it more responsive and prevent getting stuck
export function updateBallPhysics(ball: Entity, gameWidth: number, gameHeight: number, deltaTime: number): Entity {
  // Apply friction - less friction for smoother movement
  const friction = 0.98

  // Update position based on speed
  let newX = ball.x + ball.speedX * deltaTime
  let newY = ball.y + ball.speedY * deltaTime

  let newSpeedX = ball.speedX * friction
  let newSpeedY = ball.speedY * friction

  // Bounce off walls
  if (newX < 0 || newX + ball.width > gameWidth) {
    // Don't bounce if in goal area (handled by goal detection)
    const inGoalArea = newY > gameHeight / 2 - 24 && newY < gameHeight / 2 + 24

    if (!inGoalArea) {
      newSpeedX = -newSpeedX * 0.8
      newX = newX < 0 ? 0 : gameWidth - ball.width
    }
  }

  if (newY < 0 || newY + ball.height > gameHeight) {
    newSpeedY = -newSpeedY * 0.8
    newY = newY < 0 ? 0 : gameHeight - ball.height
  }

  // Stop ball if it's moving very slowly
  if (Math.abs(newSpeedX) < 0.01) newSpeedX = 0
  if (Math.abs(newSpeedY) < 0.01) newSpeedY = 0

  // Ensure the ball doesn't get stuck at the edge
  if (newX <= 0 && newSpeedX <= 0) newSpeedX = 0.1
  if (newX >= gameWidth - ball.width && newSpeedX >= 0) newSpeedX = -0.1
  if (newY <= 0 && newSpeedY <= 0) newSpeedY = 0.1
  if (newY >= gameHeight - ball.height && newSpeedY >= 0) newSpeedY = -0.1

  return {
    ...ball,
    x: newX,
    y: newY,
    speedX: newSpeedX,
    speedY: newSpeedY,
  }
}

// Improve collision detection to be more accurate
export function checkCollision(entity1: Entity, entity2: Entity, padding = 0): boolean {
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
