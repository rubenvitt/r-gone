'use client';

import React, { useState, useEffect } from 'react';

interface RecoveryMechanism {
    id: string;
    type: string;
    name: string;
    description: string;
    isActive: boolean;
    isSetup: boolean;
    priority: number;
    successRate: number;
    lastUsed?: string;
    createdAt: string;
}

interface RecoveryStatistics {
    totalAttempts: number;
    successfulRecoveries: number;
    failedAttempts: number;
    averageRecoveryTime: number;
    mostUsedMethod: string;
    riskDistribution: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
}

interface EmergencyCodeStats {
    totalCodes: number;
    unusedCodes: number;
    usedCodes: number;
    expiredCodes: number;
    codesExpiringWithin30Days: number;
}

interface TrustedContact {
    id: string;
    name: string;
    email: string;
    relationship: string;
    isVerified: boolean;
    emergencyPriority: number;
    lastContactAt?: string;
}

export function AccountRecoveryManager() {
    const [activeTab, setActiveTab] = useState<'overview' | 'mechanisms' | 'emergency-codes' | 'social' | 'attempts'>('overview');
    const [mechanisms, setMechanisms] = useState<RecoveryMechanism[]>([]);
    const [statistics, setStatistics] = useState<RecoveryStatistics | null>(null);
    const [emergencyStats, setEmergencyStats] = useState<EmergencyCodeStats | null>(null);
    const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New contact form state
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({
        name: '',
        email: '',
        phone: '',
        relationship: '',
        emergencyPriority: 1
    });

    useEffect(() => {
        fetchRecoveryData();
    }, []);

    const fetchRecoveryData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [recoveryResponse, emergencyResponse, socialResponse] = await Promise.all([
                fetch('/api/recovery'),
                fetch('/api/recovery/emergency-codes?action=statistics'),
                fetch('/api/recovery/social?type=contacts')
            ]);

            if (!recoveryResponse.ok || !emergencyResponse.ok || !socialResponse.ok) {
                throw new Error('Failed to fetch recovery data');
            }

            const recoveryData = await recoveryResponse.json();
            const emergencyData = await emergencyResponse.json();
            const socialData = await socialResponse.json();

            if (recoveryData.success) {
                setMechanisms(recoveryData.data.mechanisms || []);
                setStatistics(recoveryData.data.statistics || null);
            }

            if (emergencyData.success) {
                setEmergencyStats(emergencyData.data);
            }

            if (socialData.success) {
                setTrustedContacts(socialData.data || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load recovery data');
        } finally {
            setLoading(false);
        }
    };

    const setupRecoveryMechanism = async (type: string) => {
        try {
            const configuration = getDefaultConfiguration(type);
            
            const response = await fetch('/api/recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'setup',
                    type,
                    configuration
                })
            });

            if (!response.ok) {
                throw new Error('Failed to setup recovery mechanism');
            }

            const result = await response.json();
            
            if (result.success) {
                await fetchRecoveryData();
                alert(`${result.data.name} setup successfully!`);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            alert(`Failed to setup recovery mechanism: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const generateEmergencyCodes = async () => {
        try {
            const response = await fetch('/api/recovery/emergency-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    count: 10,
                    codeLength: 12
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate emergency codes');
            }

            const result = await response.json();
            
            if (result.success) {
                await fetchRecoveryData();
                
                // Open printable codes in new window
                const printResponse = await fetch('/api/recovery/emergency-codes?action=printable');
                if (printResponse.ok) {
                    const printHtml = await printResponse.text();
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(printHtml);
                        printWindow.document.close();
                    }
                }
                
                alert(`${result.data.totalGenerated} emergency codes generated successfully!`);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            alert(`Failed to generate emergency codes: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const addTrustedContact = async () => {
        try {
            if (!newContact.name || !newContact.email || !newContact.relationship) {
                alert('Please fill in all required fields');
                return;
            }

            const response = await fetch('/api/recovery/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_contact',
                    contactData: newContact
                })
            });

            if (!response.ok) {
                throw new Error('Failed to add trusted contact');
            }

            const result = await response.json();
            
            if (result.success) {
                await fetchRecoveryData();
                setShowAddContact(false);
                setNewContact({
                    name: '',
                    email: '',
                    phone: '',
                    relationship: '',
                    emergencyPriority: 1
                });
                alert('Trusted contact added successfully! Verification invitation sent.');
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            alert(`Failed to add trusted contact: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const getDefaultConfiguration = (type: string) => {
        switch (type) {
            case 'master_password_reset':
                return {
                    securityQuestions: [
                        { question: 'What was the name of your first pet?', answer: '' },
                        { question: 'What city were you born in?', answer: '' }
                    ],
                    alternateEmail: '',
                    phoneNumber: ''
                };
            case 'social_recovery':
                return {
                    requiredApprovals: 2,
                    timeDelay: 24
                };
            case 'emergency_codes':
                return {
                    codeCount: 10,
                    codeLength: 12
                };
            default:
                return {};
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusColor = (isActive: boolean, isSetup: boolean) => {
        if (!isSetup) return 'text-gray-500';
        if (isActive) return 'text-green-600';
        return 'text-yellow-600';
    };

    const getStatusText = (isActive: boolean, isSetup: boolean) => {
        if (!isSetup) return 'Not Setup';
        if (isActive) return 'Active';
        return 'Inactive';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">Loading recovery data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="border border-red-200 bg-red-50 rounded-lg">
                    <div className="p-6">
                        <div className="text-red-800">
                            <h3 className="font-semibold mb-2">Error Loading Recovery Data</h3>
                            <p>{error}</p>
                            <button 
                                onClick={fetchRecoveryData} 
                                className="mt-4 px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-100"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Account Recovery</h1>
                <button 
                    onClick={fetchRecoveryData}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                >
                    Refresh
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'mechanisms', label: 'Mechanisms' },
                    { id: 'emergency-codes', label: 'Emergency Codes' },
                    { id: 'social', label: 'Social Recovery' },
                    { id: 'attempts', label: 'Attempts' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Recovery Statistics</h3>
                        <p className="text-gray-600 text-sm mb-4">Overall recovery system performance</p>
                        {statistics ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Total Attempts:</span>
                                    <span className="font-medium">{statistics.totalAttempts}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Successful:</span>
                                    <span className="font-medium text-green-600">{statistics.successfulRecoveries}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Failed:</span>
                                    <span className="font-medium text-red-600">{statistics.failedAttempts}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Avg. Time:</span>
                                    <span className="font-medium">{statistics.averageRecoveryTime.toFixed(1)}h</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">No recovery attempts yet</p>
                        )}
                    </div>

                    <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Emergency Codes</h3>
                        <p className="text-gray-600 text-sm mb-4">Quick access recovery codes</p>
                        {emergencyStats ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Total Codes:</span>
                                    <span className="font-medium">{emergencyStats.totalCodes}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Unused:</span>
                                    <span className="font-medium text-green-600">{emergencyStats.unusedCodes}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Used:</span>
                                    <span className="font-medium text-gray-600">{emergencyStats.usedCodes}</span>
                                </div>
                                {emergencyStats.codesExpiringWithin30Days > 0 && (
                                    <div className="flex justify-between">
                                        <span>Expiring Soon:</span>
                                        <span className="font-medium text-yellow-600">{emergencyStats.codesExpiringWithin30Days}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500">No emergency codes generated</p>
                        )}
                    </div>

                    <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Social Recovery</h3>
                        <p className="text-gray-600 text-sm mb-4">Trusted contacts for recovery assistance</p>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Total Contacts:</span>
                                <span className="font-medium">{trustedContacts.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Verified:</span>
                                <span className="font-medium text-green-600">
                                    {trustedContacts.filter(c => c.isVerified).length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Unverified:</span>
                                <span className="font-medium text-yellow-600">
                                    {trustedContacts.filter(c => !c.isVerified).length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recovery Mechanisms Tab */}
            {activeTab === 'mechanisms' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Recovery Mechanisms</h2>
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Setup New Mechanism
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {mechanisms.length > 0 ? (
                            mechanisms.map((mechanism) => (
                                <div key={mechanism.id} className="border rounded-lg p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                                {mechanism.name}
                                                <span className={`text-sm ${getStatusColor(mechanism.isActive, mechanism.isSetup)}`}>
                                                    ({getStatusText(mechanism.isActive, mechanism.isSetup)})
                                                </span>
                                            </h3>
                                            <p className="text-gray-600">{mechanism.description}</p>
                                        </div>
                                        <div className="text-right text-sm text-gray-500">
                                            <div>Priority: {mechanism.priority}</div>
                                            <div>Success Rate: {mechanism.successRate}%</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-600">
                                            <div>Type: {mechanism.type}</div>
                                            <div>Created: {formatDate(mechanism.createdAt)}</div>
                                            {mechanism.lastUsed && (
                                                <div>Last Used: {formatDate(mechanism.lastUsed)}</div>
                                            )}
                                        </div>
                                        <div className="space-x-2">
                                            <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
                                                Configure
                                            </button>
                                            <button className={`px-3 py-1 rounded text-sm ${
                                                mechanism.isActive 
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}>
                                                {mechanism.isActive ? 'Disable' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="border rounded-lg p-8 text-center">
                                <h3 className="text-lg font-medium mb-2">No Recovery Mechanisms Setup</h3>
                                <p className="text-gray-600 mb-4">
                                    Set up recovery mechanisms to ensure you can regain access to your account.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        'master_password_reset',
                                        'social_recovery',
                                        'emergency_codes',
                                        'backup_restoration'
                                    ].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setupRecoveryMechanism(type)}
                                            className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
                                        >
                                            Setup {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Emergency Codes Tab */}
            {activeTab === 'emergency-codes' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Emergency Recovery Codes</h2>
                        <button 
                            onClick={generateEmergencyCodes}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Generate New Codes
                        </button>
                    </div>

                    {emergencyStats ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-gray-600 mb-1">Total Codes</h4>
                                <div className="text-2xl font-bold">{emergencyStats.totalCodes}</div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-gray-600 mb-1">Unused Codes</h4>
                                <div className="text-2xl font-bold text-green-600">{emergencyStats.unusedCodes}</div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-gray-600 mb-1">Used Codes</h4>
                                <div className="text-2xl font-bold text-gray-600">{emergencyStats.usedCodes}</div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-gray-600 mb-1">Expiring Soon</h4>
                                <div className="text-2xl font-bold text-yellow-600">{emergencyStats.codesExpiringWithin30Days}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="border rounded-lg p-8 text-center">
                            <h3 className="text-lg font-medium mb-2">No Emergency Codes Generated</h3>
                            <p className="text-gray-600 mb-4">
                                Generate emergency recovery codes for quick account access in case of emergencies.
                            </p>
                            <button 
                                onClick={generateEmergencyCodes}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Generate Emergency Codes
                            </button>
                        </div>
                    )}

                    {emergencyStats && emergencyStats.totalCodes > 0 && (
                        <div className="border rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-2">Emergency Code Management</h3>
                            <p className="text-gray-600 mb-4">
                                Manage your emergency recovery codes. Keep these codes secure and accessible.
                            </p>
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={async () => {
                                            const response = await fetch('/api/recovery/emergency-codes?action=printable');
                                            if (response.ok) {
                                                const printHtml = await response.text();
                                                const printWindow = window.open('', '_blank');
                                                if (printWindow) {
                                                    printWindow.document.write(printHtml);
                                                    printWindow.document.close();
                                                }
                                            }
                                        }}
                                        className="px-3 py-2 border rounded hover:bg-gray-50"
                                    >
                                        Print Codes
                                    </button>
                                    
                                    <button
                                        onClick={async () => {
                                            if (confirm('Are you sure you want to revoke all unused codes? This action cannot be undone.')) {
                                                try {
                                                    const response = await fetch('/api/recovery/emergency-codes?action=revoke-all', {
                                                        method: 'DELETE'
                                                    });
                                                    if (response.ok) {
                                                        await fetchRecoveryData();
                                                        alert('All unused codes have been revoked.');
                                                    }
                                                } catch (err) {
                                                    alert('Failed to revoke codes.');
                                                }
                                            }
                                        }}
                                        className="px-3 py-2 border rounded hover:bg-gray-50"
                                    >
                                        Revoke All Unused
                                    </button>
                                </div>

                                {emergencyStats.codesExpiringWithin30Days > 0 && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="text-yellow-800">
                                            ⚠️ <strong>Warning:</strong> {emergencyStats.codesExpiringWithin30Days} emergency codes will expire within 30 days.
                                            Consider generating new codes.
                                        </div>
                                    </div>
                                )}

                                {emergencyStats.unusedCodes < 3 && (
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="text-orange-800">
                                            ⚠️ <strong>Low Code Count:</strong> You have only {emergencyStats.unusedCodes} unused emergency codes remaining.
                                            Consider generating additional codes.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Social Recovery Tab */}
            {activeTab === 'social' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Social Recovery</h2>
                        <button 
                            onClick={() => setShowAddContact(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Add Trusted Contact
                        </button>
                    </div>

                    {showAddContact && (
                        <div className="border rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-2">Add Trusted Contact</h3>
                            <p className="text-gray-600 mb-4">
                                Add someone you trust to help with account recovery
                            </p>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={newContact.name}
                                            onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                                            className="w-full p-2 border rounded-md"
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email *</label>
                                        <input
                                            type="email"
                                            value={newContact.email}
                                            onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                                            className="w-full p-2 border rounded-md"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={newContact.phone}
                                            onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                                            className="w-full p-2 border rounded-md"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Relationship *</label>
                                        <select
                                            value={newContact.relationship}
                                            onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="">Select relationship</option>
                                            <option value="family">Family Member</option>
                                            <option value="friend">Friend</option>
                                            <option value="colleague">Colleague</option>
                                            <option value="lawyer">Lawyer</option>
                                            <option value="spouse">Spouse/Partner</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <button
                                        onClick={() => setShowAddContact(false)}
                                        className="px-4 py-2 border rounded hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={addTrustedContact}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Add Contact
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4">
                        {trustedContacts.length > 0 ? (
                            trustedContacts.map((contact) => (
                                <div key={contact.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium">{contact.name}</h3>
                                            <p className="text-sm text-gray-600">{contact.email}</p>
                                            <p className="text-sm text-gray-500">{contact.relationship}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-medium ${
                                                contact.isVerified ? 'text-green-600' : 'text-yellow-600'
                                            }`}>
                                                {contact.isVerified ? '✓ Verified' : '⏳ Pending Verification'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Priority: {contact.emergencyPriority}
                                            </div>
                                            {contact.lastContactAt && (
                                                <div className="text-xs text-gray-500">
                                                    Last contact: {formatDate(contact.lastContactAt)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="border rounded-lg p-8 text-center">
                                <h3 className="text-lg font-medium mb-2">No Trusted Contacts</h3>
                                <p className="text-gray-600 mb-4">
                                    Add trusted contacts who can help verify your identity during account recovery.
                                </p>
                                <button 
                                    onClick={() => setShowAddContact(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Add Your First Trusted Contact
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recovery Attempts Tab */}
            {activeTab === 'attempts' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Recovery Attempts</h2>
                    
                    <div className="border rounded-lg p-8 text-center">
                        <h3 className="text-lg font-medium mb-2">No Recovery Attempts</h3>
                        <p className="text-gray-600">
                            All recovery attempts will be logged and displayed here for audit purposes.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}