import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 cyber-card p-8 border-gradient max-w-md">
        <div className="text-6xl font-bold text-gradient">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground font-mono">
          NEURAL LINK BROKEN
        </h1>
        <p className="text-muted-foreground font-mono">
          The requested neural pathway does not exist in the matrix.
        </p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-neon-cyan to-neon-purple text-black font-bold hover:scale-105 transition-all duration-300 shadow-neon-cyan">
            RETURN TO MATRIX
          </Button>
        </Link>
      </div>
    </div>
  )
}

