'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Table as TableIcon, Heading1, Heading2, Undo, Redo, Save, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useRef, useState } from 'react'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  placeholder?: string
  autoSaveInterval?: number
  minLength?: number
  maxLength?: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function RichTextEditor({ 
  content = '', 
  onChange, 
  onSave,
  placeholder = 'Start typing...',
  autoSaveInterval = 30000, // 30 seconds
  minLength = 0,
  maxLength = 10000
}: RichTextEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [validationError, setValidationError] = useState<string>('')
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const autoSaveTimer = useRef<NodeJS.Timeout>()
  const lastSavedContent = useRef(content)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      
      // Update counts
      setCharCount(text.length)
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
      
      // Validate content
      validateContent(text)
      
      // Call onChange
      onChange?.(html)
      
      // Schedule auto-save
      if (onSave && html !== lastSavedContent.current) {
        scheduleAutoSave(html)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
        'aria-label': placeholder,
        'role': 'textbox',
        'aria-multiline': 'true',
        'aria-describedby': validationError ? 'editor-error' : undefined,
      },
    },
  })

  // Validation function
  const validateContent = useCallback((text: string) => {
    if (minLength > 0 && text.length < minLength) {
      setValidationError(`Content must be at least ${minLength} characters long`)
      return false
    }
    if (maxLength > 0 && text.length > maxLength) {
      setValidationError(`Content must not exceed ${maxLength} characters`)
      return false
    }
    setValidationError('')
    return true
  }, [minLength, maxLength])

  const handleSave = useCallback(async (content?: string) => {
    if (!onSave || !editor) return
    
    const contentToSave = content || editor.getHTML()
    const text = editor.getText()
    
    if (!validateContent(text)) return
    
    setSaveStatus('saving')
    try {
      await onSave(contentToSave)
      lastSavedContent.current = contentToSave
      setSaveStatus('saved')
      
      // Reset to idle after showing saved status
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [onSave, editor, validateContent])

  // Auto-save functionality
  const scheduleAutoSave = useCallback((content: string) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }
    
    autoSaveTimer.current = setTimeout(() => {
      handleSave(content)
    }, autoSaveInterval)
  }, [autoSaveInterval, handleSave])

  // Manual save
  const handleManualSave = useCallback(() => {
    handleSave()
  }, [handleSave])

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [])

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== undefined) {
      // Only update if the content is different from current editor content
      const currentContent = editor.getHTML()
      if (currentContent !== content) {
        editor.commands.setContent(content)
        lastSavedContent.current = content
      }
    }
  }, [editor, content])

  // Initialize word/char count on mount and when content changes
  useEffect(() => {
    if (editor) {
      const text = editor.getText()
      setCharCount(text.length)
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
      validateContent(text)
    }
  }, [editor, content, validateContent])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden" role="group" aria-label="Rich text editor">
      {/* Toolbar */}
      <div 
        className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap gap-1 md:gap-2 overflow-x-auto" 
        role="toolbar" 
        aria-label="Formatting toolbar"
        aria-controls="editor-content"
      >
        {/* Text Formatting */}
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          aria-label="Bold (Ctrl+B)"
          title="Bold (Ctrl+B)"
          className="touch:min-h-[44px] touch:min-w-[44px]"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          aria-label="Italic (Ctrl+I)"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Headings */}
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading 1"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Link & Table */}
        <Button
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          size="sm"
          onClick={setLink}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={addTable}
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>

        {onSave && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {/* Manual Save Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              ) : saveStatus === 'saved' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : saveStatus === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
            
            {/* Save Status Text */}
            <span className="text-xs text-gray-500 ml-2">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Save failed'}
            </span>
          </>
        )}

        {/* Word/Character Count - Right side */}
        <div className="ml-auto flex items-center space-x-2 md:space-x-4 text-xs text-gray-500 min-w-0">
          <span className="hidden sm:inline">{wordCount} words</span>
          <span className={`whitespace-nowrap ${charCount > maxLength ? 'text-red-600' : ''}`}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2" id="editor-error" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700">{validationError}</span>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="min-h-[200px] touch-manipulation" id="editor-content">
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}