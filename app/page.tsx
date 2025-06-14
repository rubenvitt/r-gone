'use client'

import { useState, useEffect } from 'react'
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import EncryptedEditor from "@/components/ui/EncryptedEditor";
import FileManager from "@/components/ui/FileManager";
import BackupManager from "@/components/ui/BackupManager";
import EmergencyAccessManager from "@/components/ui/EmergencyAccessManager";
import DeadManSwitchManager from "@/components/ui/DeadManSwitchManager";
import { AccountRecoveryManager } from "@/components/ui/AccountRecoveryManager";
import ContactDirectory from "@/components/ui/ContactDirectory";
import DigitalAssetInventory from "@/components/ui/DigitalAssetInventory";
import MessagesLibraryWrapper from "@/components/ui/MessagesLibraryWrapper";
import Dashboard from "@/components/ui/Dashboard";
import AuthGuard from "@/components/ui/AuthGuard";
import { Button } from "@/components/ui/button";
import { ComplianceReportingDashboard } from "@/components/ui/ComplianceReportingDashboard";
import TriggerEvaluationManager from "@/components/ui/TriggerEvaluationManager";
import LegalDocumentManager from "@/components/ui/LegalDocumentManager";
import { PlusCircle, FolderOpen, Shield, AlertTriangle, Clock, LogOut, KeyRound, Users, Package, BarChart3, MessageSquare, FileCheck, Zap, Gavel } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ContactDirectory as ContactDirectoryType, DigitalAssetInventory as DigitalAssetInventoryType } from '@/types/data';
import { contactDirectoryService } from '@/services/contact-directory-service';
import { digitalAssetInventoryService } from '@/services/digital-asset-inventory-service';
import { fileService } from '@/services/file-service-client';
import { messagesLibraryClient } from '@/services/messages-library-client';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'editor' | 'files' | 'backup' | 'emergency' | 'deadmanswitch' | 'recovery' | 'contacts' | 'assets' | 'messages' | 'compliance' | 'triggers' | 'legal'>('dashboard')
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [contactDirectory, setContactDirectory] = useState<ContactDirectoryType>(() => 
    contactDirectoryService.createEmptyDirectory()
  )
  const [digitalAssetInventory, setDigitalAssetInventory] = useState<DigitalAssetInventoryType>(() => 
    digitalAssetInventoryService.createEmptyInventory()
  )
  const [filesCount, setFilesCount] = useState(0)
  const [messagesCount, setMessagesCount] = useState(0)
  const { logout } = useAuth()

  // Load counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Load files count
        const files = await fileService.listFiles()
        setFilesCount(files.filter(f => !f.isBackup).length)

        // Load messages count
        const messages = await messagesLibraryClient.listMessages()
        setMessagesCount(messages.length)
      } catch (error) {
        console.error('Failed to load counts:', error)
      }
    }

    loadCounts()
  }, [])

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
      await logout()
    }
  }

  const handleNavigate = (targetView: string, itemId?: string) => {
    setView(targetView as any)
    if (itemId && targetView === 'files') {
      setSelectedFileId(itemId)
    }
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Header onNavigate={handleNavigate} />
        <main className="flex-grow p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-center flex-1">If I&apos;m Gone - Secure Info</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-center mb-8">
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={view === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('dashboard')}
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
                <Button
                  variant={view === 'editor' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('editor')}
                  className="flex items-center space-x-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create/Edit</span>
                </Button>
                <Button
                  variant={view === 'files' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('files')}
                  className="flex items-center space-x-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Manage Files</span>
                </Button>
                <Button
                  variant={view === 'backup' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('backup')}
                  className="flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Backup & Recovery</span>
                </Button>
                <Button
                  variant={view === 'emergency' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('emergency')}
                  className="flex items-center space-x-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Emergency Access</span>
                </Button>
                <Button
                  variant={view === 'deadmanswitch' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('deadmanswitch')}
                  className="flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Dead Man's Switch</span>
                </Button>
                <Button
                  variant={view === 'recovery' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('recovery')}
                  className="flex items-center space-x-2"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Account Recovery</span>
                </Button>
                <Button
                  variant={view === 'contacts' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('contacts')}
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Contacts</span>
                </Button>
                <Button
                  variant={view === 'assets' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('assets')}
                  className="flex items-center space-x-2"
                >
                  <Package className="h-4 w-4" />
                  <span>Digital Assets</span>
                </Button>
                <Button
                  variant={view === 'messages' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('messages')}
                  className="flex items-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                </Button>
                <Button
                  variant={view === 'compliance' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('compliance')}
                  className="flex items-center space-x-2"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>Compliance</span>
                </Button>
                <Button
                  variant={view === 'triggers' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('triggers')}
                  className="flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Triggers</span>
                </Button>
                <Button
                  variant={view === 'legal' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('legal')}
                  className="flex items-center space-x-2"
                >
                  <Gavel className="h-4 w-4" />
                  <span>Legal</span>
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {view === 'dashboard' ? (
                <div>
                  <Dashboard 
                    onNavigate={setView}
                    contactsCount={contactDirectory.contacts.length}
                    assetsCount={digitalAssetInventory.assets.length}
                    filesCount={filesCount}
                    messagesCount={messagesCount}
                  />
                </div>
              ) : view === 'editor' ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Emergency Information</h2>
                  <p className="text-gray-600 mb-6">
                    Create and securely encrypt important information for your trusted contacts.
                    Your data is encrypted client-side and stored securely with versioning.
                  </p>
                  <EncryptedEditor 
                    enableFileManager={true}
                    enablePasswordVault={true}
                    enableDocumentRepository={true}
                    fileId={selectedFileId || undefined}
                    autoSaveInterval={30000}
                  />
                </div>
              ) : view === 'files' ? (
                <div>
                  <FileManager 
                    onFileSelect={(fileId) => {
                      setSelectedFileId(fileId)
                      setView('editor')
                    }}
                    selectedFileId={selectedFileId}
                  />
                </div>
              ) : view === 'backup' ? (
                <div>
                  <BackupManager />
                </div>
              ) : view === 'emergency' ? (
                <div>
                  <EmergencyAccessManager />
                </div>
              ) : view === 'recovery' ? (
                <div>
                  <AccountRecoveryManager />
                </div>
              ) : view === 'deadmanswitch' ? (
                <div>
                  <DeadManSwitchManager userId="default-user" />
                </div>
              ) : view === 'contacts' ? (
                <div>
                  <ContactDirectory 
                    directory={contactDirectory}
                    onDirectoryChange={setContactDirectory}
                  />
                </div>
              ) : view === 'messages' ? (
                <div>
                  <MessagesLibraryWrapper 
                    beneficiaries={[]} // TODO: Connect to actual beneficiaries
                    contacts={contactDirectory.contacts}
                  />
                </div>
              ) : view === 'assets' ? (
                <div>
                  <DigitalAssetInventory 
                    inventory={digitalAssetInventory}
                    onInventoryChange={setDigitalAssetInventory}
                  />
                </div>
              ) : view === 'compliance' ? (
                <div>
                  <ComplianceReportingDashboard />
                </div>
              ) : view === 'triggers' ? (
                <div>
                  <TriggerEvaluationManager />
                </div>
              ) : view === 'legal' ? (
                <div>
                  <LegalDocumentManager />
                </div>
              ) : null}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}