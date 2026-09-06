import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EvidenceGraph | Explainable Investigation Workspace',
  description: 'Synthetic evidence intelligence workspace for SIH26189.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
