import { ImageResponse } from "next/og"

// Image metadata
export const alt = "Pixelated street soccer game with players and buildings"
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

// Image generation
export default async function Image() {
  // Directly use the blob URL provided for the image
  const imageUrl =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pixel%20soccer%20OG-CI2YEvi55AEMdpYkKDJ43OYCb398iY.png"

  // Fetch the image data
  const imageResponse = await fetch(imageUrl)
  const imageData = await imageResponse.arrayBuffer()

  // Convert ArrayBuffer to base64 string
  const base64Image = `data:image/png;base64,${Buffer.from(imageData).toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        fontSize: 128,
        background: "black",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background image using base64 data URL */}
      <img
        src={base64Image || "/placeholder.svg"}
        alt="Pixel Soccer background"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.7)", // Slightly dim the background
        }}
      />
      {/* Overlay text */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          color: "#F7E26B", // uiText color from your palette
          fontFamily: '"Press Start 2P", monospace',
          textAlign: "center",
          textShadow: "4px 4px 0px rgba(0,0,0,0.8)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "80px", lineHeight: "1" }}>PIXEL SOCCER</span>
        <span style={{ fontSize: "40px", marginTop: "20px" }}>STREET SHOWDOWN</span>
      </div>
    </div>,
    {
      ...size,
      // You might need to load the font if it's not a system font
      // fonts: [
      //   {
      //     name: 'Press Start 2P',
      //     data: fontData, // Load your font data here
      //     style: 'normal',
      //     weight: 400,
      //   },
      // ],
    },
  )
}
