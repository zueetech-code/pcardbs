import type React from "react"
import type { Metadata } from "next"

import { startCommandTimeoutWorker } from "@/lib/commandtimeout"

import "./globals.css"


export const metadata: Metadata = {
  title: "Zuetech-PCARDB",
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
