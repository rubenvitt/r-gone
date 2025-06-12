'use client'

import { useState, useMemo } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { Eye, Code, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'


interface MarkdownRendererProps {
  content: string
  className?: string
  allowRaw?: boolean
  enableCopy?: boolean
}

export default function MarkdownRenderer({ 
  content, 
  className = '', 
  allowRaw = true,
  enableCopy = true
}: MarkdownRendererProps) {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered')
  const [copySuccess, setCopySuccess] = useState(false)

  // Configure marked renderer
  const markedOptions = useMemo(() => ({
    breaks: true,
    gfm: true
  }), [])

  // Render markdown to HTML
  const renderedHtml = useMemo(() => {
    if (!content || viewMode === 'raw') return ''
    
    try {
      // Parse markdown to HTML with options
      const rawHtml = marked.parse(content, markedOptions)
      
      // Apply syntax highlighting to code blocks
      const htmlWithHighlighting = rawHtml.replace(
        /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
        (match, lang, code) => {
          const decodedCode = code
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
          
          if (lang && hljs.getLanguage(lang)) {
            try {
              const highlighted = hljs.highlight(decodedCode, { language: lang }).value
              return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`
            } catch (err) {
              console.warn('Error highlighting code:', err)
            }
          }
          const autoHighlighted = hljs.highlightAuto(decodedCode).value
          return `<pre><code class="hljs">${autoHighlighted}</code></pre>`
        }
      )
      
      // Also handle plain code blocks without language specification
      const finalHtml = htmlWithHighlighting.replace(
        /<pre><code(?![^>]*class="language-)>([\s\S]*?)<\/code><\/pre>/g,
        (match, code) => {
          const decodedCode = code
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
          
          const highlighted = hljs.highlightAuto(decodedCode).value
          return `<pre><code class="hljs">${highlighted}</code></pre>`
        }
      )
      
      // Sanitize HTML to prevent XSS
      const cleanHtml = DOMPurify.sanitize(finalHtml, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 'del',
          'ul', 'ol', 'li',
          'blockquote',
          'pre', 'code',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'a', 'img',
          'hr',
          'div', 'span'
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'alt', 'src',
          'class', 'id',
          'target', 'rel'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      })
      
      return cleanHtml
    } catch (error) {
      console.error('Error rendering markdown:', error)
      return '<p>Error rendering markdown content</p>'
    }
  }, [content, viewMode, markedOptions])

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'rendered' ? 'raw' : 'rendered')
  }

  if (!content) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No content to display</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {viewMode === 'rendered' ? 'Rendered Markdown' : 'Raw Markdown'}
          </span>
          {viewMode === 'rendered' && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Formatted
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {enableCopy && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={copySuccess ? 'bg-green-50 text-green-700' : ''}
            >
              <Copy className="h-4 w-4 mr-1" />
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          )}
          {allowRaw && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
            >
              {viewMode === 'rendered' ? (
                <>
                  <Code className="h-4 w-4 mr-1" />
                  Raw
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Rendered
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-32">
        {viewMode === 'rendered' ? (
          <div 
            className="prose prose-sm max-w-none markdown-content"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 rounded border p-4 overflow-auto max-h-96">
            {content}
          </pre>
        )}
      </div>

      {/* Markdown-specific styling */}
      <style jsx>{`
        .markdown-content {
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        
        .markdown-content h1 {
          font-size: 1.875rem;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        
        .markdown-content h2 {
          font-size: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.25rem;
        }
        
        .markdown-content h3 {
          font-size: 1.25rem;
        }
        
        .markdown-content h4 {
          font-size: 1.125rem;
        }
        
        .markdown-content h5,
        .markdown-content h6 {
          font-size: 1rem;
        }
        
        .markdown-content p {
          margin-bottom: 1rem;
        }
        
        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        
        .markdown-content li {
          margin-bottom: 0.25rem;
        }
        
        .markdown-content blockquote {
          border-left: 4px solid #e5e7eb;
          margin: 1rem 0;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
        }
        
        .markdown-content pre {
          background-color: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .markdown-content code {
          background-color: #f1f5f9;
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-size: 0.875rem;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        }
        
        .markdown-content pre code {
          background-color: transparent;
          border-radius: 0;
          padding: 0;
        }
        
        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        
        .markdown-content th,
        .markdown-content td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          text-align: left;
        }
        
        .markdown-content th {
          background-color: #f8fafc;
          font-weight: 600;
        }
        
        .markdown-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        
        .markdown-content a:hover {
          color: #1d4ed8;
        }
        
        .markdown-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem 0;
        }
        
        .markdown-content hr {
          border: none;
          height: 1px;
          background-color: #e5e7eb;
          margin: 2rem 0;
        }
        
        /* Syntax highlighting adjustments */
        .markdown-content .hljs {
          background: #f8fafc !important;
          color: #1f2937;
        }
        
        .markdown-content .hljs-comment,
        .markdown-content .hljs-quote {
          color: #6b7280;
          font-style: italic;
        }
        
        .markdown-content .hljs-keyword,
        .markdown-content .hljs-selector-tag,
        .markdown-content .hljs-subst {
          color: #dc2626;
          font-weight: bold;
        }
        
        .markdown-content .hljs-number,
        .markdown-content .hljs-literal,
        .markdown-content .hljs-variable,
        .markdown-content .hljs-template-variable,
        .markdown-content .hljs-tag .hljs-attr {
          color: #059669;
        }
        
        .markdown-content .hljs-string,
        .markdown-content .hljs-doctag {
          color: #0891b2;
        }
        
        .markdown-content .hljs-title,
        .markdown-content .hljs-section,
        .markdown-content .hljs-selector-id {
          color: #7c3aed;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}