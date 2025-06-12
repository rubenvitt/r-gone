'use client'

import { useState, useCallback } from 'react'
import { 
    Lock, 
    Unlock, 
    Eye, 
    EyeOff, 
    Shield, 
    Key, 
    AlertTriangle, 
    CheckCircle, 
    RefreshCw,
    X,
    Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Note } from '@/types/data'
import { 
    noteEncryptionService, 
    PasswordValidationResult,
    NoteEncryptionResult,
    NoteDecryptionResult
} from '@/utils/note-encryption'

interface NotePasswordManagerProps {
    note: Note
    onNoteUpdate: (updatedNote: Note) => void
    onClose?: () => void
    className?: string
}

type ManagerMode = 'unlock' | 'setup' | 'change' | 'remove'

const PasswordStrengthIndicator = ({ validation }: { validation: PasswordValidationResult }) => {
    const getStrengthColor = (score: number) => {
        switch (score) {
            case 0: return 'bg-red-500'
            case 1: return 'bg-orange-500'
            case 2: return 'bg-yellow-500'
            case 3: return 'bg-blue-500'
            case 4: return 'bg-green-500'
            default: return 'bg-gray-300'
        }
    }

    const getStrengthText = (score: number) => {
        switch (score) {
            case 0: return 'Very Weak'
            case 1: return 'Weak'
            case 2: return 'Fair'
            case 3: return 'Good'
            case 4: return 'Very Strong'
            default: return 'Unknown'
        }
    }

    return (
        <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">Password Strength</span>
                <span className={`font-medium ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {getStrengthText(validation.score)}
                </span>
            </div>
            <div className="flex space-x-1">
                {[0, 1, 2, 3, 4].map(level => (
                    <div
                        key={level}
                        className={`h-2 flex-1 rounded ${
                            level < validation.score 
                                ? getStrengthColor(validation.score)
                                : 'bg-gray-200'
                        }`}
                    />
                ))}
            </div>
            {validation.feedback.length > 0 && (
                <div className="mt-2">
                    <ul className="text-xs text-gray-600 space-y-1">
                        {validation.feedback.map((feedback, index) => (
                            <li key={index} className="flex items-center space-x-1">
                                <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                <span>{feedback}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default function NotePasswordManager({
    note,
    onNoteUpdate,
    onClose,
    className = ''
}: NotePasswordManagerProps) {
    const [mode, setMode] = useState<ManagerMode>(
        note.passwordProtected ? 'unlock' : 'setup'
    )
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordHint, setPasswordHint] = useState(note.passwordHint || '')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Password validation
    const passwordValidation = noteEncryptionService.validatePassword(newPassword || password)

    // Check if crypto is supported
    const isSupported = noteEncryptionService.isSupported()

    const clearMessages = () => {
        setError('')
        setSuccess('')
    }

    const handleSuccess = (message: string, updatedNote?: Note) => {
        setSuccess(message)
        setError('')
        if (updatedNote) {
            onNoteUpdate(updatedNote)
        }
        // Auto-close after success (optional)
        setTimeout(() => {
            onClose?.()
        }, 2000)
    }

    const handleError = (message: string) => {
        setError(message)
        setSuccess('')
    }

    // Setup password protection
    const handleSetupPassword = useCallback(async () => {
        if (!passwordValidation.isValid) {
            handleError('Please choose a stronger password')
            return
        }

        if (newPassword !== confirmPassword) {
            handleError('Passwords do not match')
            return
        }

        setIsLoading(true)
        clearMessages()

        try {
            const result: NoteEncryptionResult = await noteEncryptionService.encryptNote(
                note,
                newPassword,
                passwordHint || undefined
            )

            if (result.success && result.encryptedNote) {
                handleSuccess('Password protection enabled successfully', result.encryptedNote)
            } else {
                handleError(result.error || 'Failed to setup password protection')
            }
        } catch (error) {
            handleError('Setup failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [note, newPassword, confirmPassword, passwordHint, passwordValidation.isValid])

    // Unlock note
    const handleUnlock = useCallback(async () => {
        if (!password) {
            handleError('Please enter the password')
            return
        }

        setIsLoading(true)
        clearMessages()

        try {
            const result: NoteDecryptionResult = await noteEncryptionService.decryptNote(note, password)

            if (result.success && result.decryptedNote) {
                handleSuccess('Note unlocked successfully', result.decryptedNote)
            } else {
                handleError(result.error || 'Incorrect password')
            }
        } catch (error) {
            handleError('Unlock failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [note, password])

    // Change password
    const handleChangePassword = useCallback(async () => {
        if (!password) {
            handleError('Please enter current password')
            return
        }

        if (!passwordValidation.isValid) {
            handleError('Please choose a stronger new password')
            return
        }

        if (newPassword !== confirmPassword) {
            handleError('New passwords do not match')
            return
        }

        setIsLoading(true)
        clearMessages()

        try {
            const result: NoteEncryptionResult = await noteEncryptionService.changeNotePassword(
                note,
                password,
                newPassword,
                passwordHint || undefined
            )

            if (result.success && result.encryptedNote) {
                handleSuccess('Password changed successfully', result.encryptedNote)
            } else {
                handleError(result.error || 'Failed to change password')
            }
        } catch (error) {
            handleError('Password change failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [note, password, newPassword, confirmPassword, passwordHint, passwordValidation.isValid])

    // Remove password protection
    const handleRemovePassword = useCallback(async () => {
        if (!password) {
            handleError('Please enter the current password')
            return
        }

        setIsLoading(true)
        clearMessages()

        try {
            const result: NoteDecryptionResult = await noteEncryptionService.removePasswordProtection(note, password)

            if (result.success && result.decryptedNote) {
                handleSuccess('Password protection removed successfully', result.decryptedNote)
            } else {
                handleError(result.error || 'Failed to remove password protection')
            }
        } catch (error) {
            handleError('Failed to remove protection: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [note, password])

    // Generate secure password
    const handleGeneratePassword = () => {
        const generated = noteEncryptionService.generateSecurePassword(16)
        setNewPassword(generated)
        setConfirmPassword(generated)
        setShowPassword(true)
    }

    if (!isSupported) {
        return (
            <div className={`p-6 border border-red-200 rounded-lg bg-red-50 ${className}`}>
                <div className="flex items-center space-x-2 text-red-600 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="font-medium">Encryption Not Supported</h3>
                </div>
                <p className="text-red-700 text-sm">
                    Your browser does not support the Web Crypto API required for secure note encryption. 
                    Please use a modern browser with HTTPS.
                </p>
            </div>
        )
    }

    return (
        <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            {mode === 'unlock' && 'Unlock Note'}
                            {mode === 'setup' && 'Setup Password Protection'}
                            {mode === 'change' && 'Change Password'}
                            {mode === 'remove' && 'Remove Password Protection'}
                        </h3>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Status Messages */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center space-x-2 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">Error</span>
                        </div>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Success</span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">{success}</p>
                    </div>
                )}

                {/* Mode Navigation */}
                {note.passwordProtected && mode === 'unlock' && (
                    <div className="flex space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMode('change')}
                        >
                            <Key className="h-4 w-4 mr-1" />
                            Change Password
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMode('remove')}
                        >
                            <Unlock className="h-4 w-4 mr-1" />
                            Remove Protection
                        </Button>
                    </div>
                )}

                {/* Current Password (for unlock, change, remove) */}
                {(mode === 'unlock' || mode === 'change' || mode === 'remove') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {mode === 'unlock' ? 'Password' : 'Current Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                placeholder="Enter password..."
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                )}
                            </button>
                        </div>
                        {note.passwordHint && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                <div className="flex items-center space-x-1 text-blue-600">
                                    <Info className="h-3 w-3" />
                                    <span className="font-medium">Hint:</span>
                                </div>
                                <p className="text-blue-700 mt-1">{note.passwordHint}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* New Password (for setup, change) */}
                {(mode === 'setup' || mode === 'change') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {mode === 'setup' ? 'Password' : 'New Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                                placeholder="Enter new password..."
                                disabled={isLoading}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
                                <button
                                    type="button"
                                    onClick={handleGeneratePassword}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    title="Generate secure password"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {newPassword && (
                            <PasswordStrengthIndicator validation={passwordValidation} />
                        )}
                    </div>
                )}

                {/* Confirm Password */}
                {(mode === 'setup' || mode === 'change') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Confirm password..."
                            disabled={isLoading}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
                        )}
                    </div>
                )}

                {/* Password Hint */}
                {(mode === 'setup' || mode === 'change') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Hint (Optional)
                        </label>
                        <input
                            type="text"
                            value={passwordHint}
                            onChange={(e) => setPasswordHint(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="A hint to help you remember (don't include the password!)"
                            disabled={isLoading}
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            This hint will be stored in plain text. Do not include your actual password.
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4">
                    {mode === 'unlock' && (
                        <Button
                            onClick={handleUnlock}
                            disabled={!password || isLoading}
                            className="flex items-center space-x-2"
                        >
                            <Unlock className="h-4 w-4" />
                            <span>{isLoading ? 'Unlocking...' : 'Unlock Note'}</span>
                        </Button>
                    )}

                    {mode === 'setup' && (
                        <Button
                            onClick={handleSetupPassword}
                            disabled={!passwordValidation.isValid || newPassword !== confirmPassword || isLoading}
                            className="flex items-center space-x-2"
                        >
                            <Lock className="h-4 w-4" />
                            <span>{isLoading ? 'Setting up...' : 'Enable Protection'}</span>
                        </Button>
                    )}

                    {mode === 'change' && (
                        <Button
                            onClick={handleChangePassword}
                            disabled={!password || !passwordValidation.isValid || newPassword !== confirmPassword || isLoading}
                            className="flex items-center space-x-2"
                        >
                            <Key className="h-4 w-4" />
                            <span>{isLoading ? 'Changing...' : 'Change Password'}</span>
                        </Button>
                    )}

                    {mode === 'remove' && (
                        <Button
                            onClick={handleRemovePassword}
                            disabled={!password || isLoading}
                            variant="destructive"
                            className="flex items-center space-x-2"
                        >
                            <Unlock className="h-4 w-4" />
                            <span>{isLoading ? 'Removing...' : 'Remove Protection'}</span>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    )
}