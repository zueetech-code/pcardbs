import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { startCommandTimeoutWorker } from "@/lib/commandtimeout"

import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Zuetech - UCCS",
  description: "Created with Zuetech",
  generator: "Zuetech.com",
  icons: {
    icon: "/icon.png",
  },
}
//startCommandTimeoutWorker()
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
