'use client'

import { useState, useEffect, ReactNode } from 'react'
import { HelpCircle, X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { HelpTooltipConfig } from '@/types/help'
import { helpService } from '@/services/help-service'

interface HelpTooltipProps {
  children: ReactNode
  tooltipId: string
  config: HelpTooltipConfig
  className?: string
  iconClassName?: string
  contentClassName?: string
}

export default function HelpTooltip({
  children,
  tooltipId,
  config,
  className = '',
  iconClassName = '',
  contentClassName = ''
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [shouldShow, setShouldShow] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if tooltip should be shown based on user preferences
    setShouldShow(helpService.shouldShowTooltip(tooltipId))
  }, [tooltipId])

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed(true)
    helpService.dismissTooltip(tooltipId)
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!dismissed && shouldShow) {
      setIsOpen(open)
    }
  }

  if (!shouldShow || dismissed) {
    return <>{children}</>
  }

  const trigger = config.trigger || 'hover'
  const placement = config.placement || 'top'
  const showArrow = config.showArrow !== false
  const interactive = config.interactive !== false

  return (
    <TooltipProvider delayDuration={config.delay || 200}>
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {children}
        <Tooltip open={isOpen} onOpenChange={handleOpenChange}>
          <TooltipTrigger asChild>
            <button
              className={`inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors ${iconClassName}`}
              onClick={(e) => {
                if (trigger === 'click') {
                  e.preventDefault()
                  handleOpenChange(!isOpen)
                }
              }}
              onFocus={() => {
                if (trigger === 'focus') {
                  handleOpenChange(true)
                }
              }}
              onBlur={() => {
                if (trigger === 'focus') {
                  handleOpenChange(false)
                }
              }}
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side={placement}
            className={`max-w-xs ${config.maxWidth ? `max-w-[${config.maxWidth}px]` : ''} ${contentClassName}`}
            sideOffset={5}
          >
            <div className="relative">
              {interactive && (
                <button
                  onClick={handleDismiss}
                  className="absolute top-0 right-0 p-1 hover:bg-gray-100 rounded"
                  aria-label="Dismiss tooltip"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
              <div className={`${interactive ? 'pr-6' : ''} text-sm`}>
                {config.content}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// Standalone tooltip for wrapping existing elements
export function HelpTooltipWrapper({
  children,
  tooltipId,
  content,
  placement = 'top',
  trigger = 'hover',
  className = ''
}: {
  children: ReactNode
  tooltipId: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'hover' | 'click' | 'focus'
  className?: string
}) {
  const [shouldShow, setShouldShow] = useState(true)

  useEffect(() => {
    setShouldShow(helpService.shouldShowTooltip(tooltipId))
  }, [tooltipId])

  if (!shouldShow) {
    return <>{children}</>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={className}>{children}</div>
        </TooltipTrigger>
        <TooltipContent side={placement}>
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}