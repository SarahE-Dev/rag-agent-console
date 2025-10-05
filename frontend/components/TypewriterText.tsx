'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TypewriterTextProps {
  text: string
  speed?: number
  delay?: number
  className?: string
  onComplete?: () => void
}

export function TypewriterText({
  text,
  speed = 20,
  delay = 0,
  className = '',
  onComplete
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        setCurrentIndex(0)
        setDisplayText('')
        setIsComplete(false)
      }, delay)
      return () => clearTimeout(delayTimer)
    } else {
      setCurrentIndex(0)
      setDisplayText('')
      setIsComplete(false)
    }
  }, [text, delay])

  useEffect(() => {
    if (currentIndex < text.length && !isComplete) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else if (currentIndex >= text.length && !isComplete) {
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentIndex, text, speed, isComplete, onComplete])

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-neon-cyan">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-neon-cyan">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-neon-cyan">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-foreground/90">{children}</li>,
          code: ({ children }) => (
            <code className="bg-card/50 px-1 py-0.5 rounded text-sm font-mono text-neon-pink">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-card/30 p-3 rounded-md mb-2 overflow-x-auto border border-border/50">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-neon-cyan pl-4 italic text-foreground/80 mb-2">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-bold text-neon-cyan">{children}</strong>,
          em: ({ children }) => <em className="italic text-neon-pink">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-neon-purple underline hover:text-neon-pink transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {displayText}
      </ReactMarkdown>
      {!isComplete && (
        <span className="inline-block w-2 h-4 bg-neon-cyan ml-1 animate-pulse"></span>
      )}
    </div>
  )
}
