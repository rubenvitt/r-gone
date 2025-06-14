'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import HelpCenter from './HelpCenter'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface HeaderProps {
  onNavigate?: (view: string, itemId?: string) => void
}

export default function Header({ onNavigate }: HeaderProps) {
  const [showHelpCenter, setShowHelpCenter] = useState(false)

  return (
    <>
      <header className="bg-blue-500 text-white py-4">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">If I&apos;m Gone</h1>
            <div className="flex-1 max-w-md mx-8">
              <GlobalSearch onNavigate={onNavigate} />
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelpCenter(true)}
                className="text-white hover:text-blue-100 hover:bg-blue-600"
              >
                <HelpCircle className="h-5 w-5 mr-2" />
                Help
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Help Center Dialog */}
      <Dialog open={showHelpCenter} onOpenChange={setShowHelpCenter}>
        <DialogContent className="max-w-7xl h-[80vh] p-0">
          <HelpCenter onClose={() => setShowHelpCenter(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}