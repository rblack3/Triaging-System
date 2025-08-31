import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Triaging System',
  description: 'A simple triaging system for customer-business-vendor communication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <main>{children}</main>
      </body>
    </html>
  )
}
