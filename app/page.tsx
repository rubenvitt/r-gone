'use client'

import { useState } from 'react'
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import EncryptedEditor from "@/components/ui/EncryptedEditor";
import FileManager from "@/components/ui/FileManager";
import BackupManager from "@/components/ui/BackupManager";
import EmergencyAccessManager from "@/components/ui/EmergencyAccessManager";
import DeadManSwitchManager from "@/components/ui/DeadManSwitchManager";
import { AccountRecoveryManager } from "@/components/ui/AccountRecoveryManager";
import ContactDirectory from "@/components/ui/ContactDirectory";
import AuthGuard from "@/components/ui/AuthGuard";
import { Button } from "@/components/ui/button";
import { PlusCircle, FolderOpen, Shield, AlertTriangle, Clock, LogOut, KeyRound, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ContactDirectory as ContactDirectoryType } from '@/types/data';
import { contactDirectoryService } from '@/services/contact-directory-service';

export default function Home() {
  const [view, setView] = useState<'editor' | 'files' | 'backup' | 'emergency' | 'deadmanswitch' | 'recovery' | 'contacts'>('editor')
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [contactDirectory, setContactDirectory] = useState<ContactDirectoryType>(() => 
    contactDirectoryService.createEmptyDirectory()
  )
  const { logout } = useAuth()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
      await logout()
    }
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Header />
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
              </div>
            </div>

            <div className="space-y-6">
              {view === 'editor' ? (
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
              ) : (
                <div>
                  <ContactDirectory 
                    directory={contactDirectory}
                    onDirectoryChange={setContactDirectory}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}