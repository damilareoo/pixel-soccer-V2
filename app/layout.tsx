import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Pixel Soccer", // Updated title
  description: "Experience classic pixelated soccer!", // Updated description
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://retro-soccer-showdown.vercel.app/" />
        <meta property="og:title" content="Pixel Soccer" />
        <meta property="og:description" content="Experience classic pixelated soccer!" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://retro-soccer-showdown.vercel.app/" />
        <meta name="twitter:title" content="Pixel Soccer" />
        <meta name="twitter:description" content="Experience classic pixelated soccer!" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
