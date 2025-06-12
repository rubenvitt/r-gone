'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import {
    DeadManSwitch,
    DeadManSwitchConfig,
    DeadManSwitchStatus,
    CheckInType,
    NotificationMethod,
    WarningSchedule
} from '../../types/data';

interface DeadManSwitchManagerProps {
    userId: string;
}

export default function DeadManSwitchManager({ userId }: DeadManSwitchManagerProps) {
    const [switches, setSwitches] = useState<DeadManSwitch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSwitch, setSelectedSwitch] = useState<DeadManSwitch | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [holidayMode, setHolidayMode] = useState({
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        loadSwitches();
    }, []);

    const loadSwitches = async () => {
        try {
            const response = await fetch('/api/dead-man-switch');
            const data = await response.json();
            
            if (data.success) {
                setSwitches(data.data);
            }
        } catch (error) {
            console.error('Error loading switches:', error);
        } finally {
            setLoading(false);
        }
    };

    const createSwitch = async (config: Partial<DeadManSwitchConfig>) => {
        try {
            const response = await fetch('/api/dead-man-switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    configuration: config
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setSwitches([...switches, data.data]);
                setShowCreateForm(false);
            }
        } catch (error) {
            console.error('Error creating switch:', error);
        }
    };

    const recordCheckIn = async (switchId: string, method: CheckInType) => {
        try {
            const response = await fetch(`/api/dead-man-switch/${switchId}/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    method,
                    metadata: {
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            const data = await response.json();
            
            if (data.success) {
                await loadSwitches(); // Refresh switches
            }
        } catch (error) {
            console.error('Error recording check-in:', error);
        }
    };

    const activateHolidayMode = async (switchId: string) => {
        try {
            const response = await fetch(`/api/dead-man-switch/${switchId}/holiday-mode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    ...holidayMode
                })
            });

            const data = await response.json();
            
            if (data.success) {
                await loadSwitches();
                setHolidayMode({ startDate: '', endDate: '', reason: '' });
            }
        } catch (error) {
            console.error('Error activating holiday mode:', error);
        }
    };

    const toggleSwitch = async (switchId: string, enable: boolean) => {
        try {
            const endpoint = enable ? 'enable' : '';
            const method = enable ? 'POST' : 'DELETE';
            const url = enable 
                ? `/api/dead-man-switch/${switchId}/enable`
                : `/api/dead-man-switch/${switchId}?userId=${userId}`;

            const response = await fetch(url, {
                method,
                ...(enable && {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId })
                })
            });

            const data = await response.json();
            
            if (data.success) {
                await loadSwitches();
            }
        } catch (error) {
            console.error('Error toggling switch:', error);
        }
    };

    const getStatusColor = (status: DeadManSwitchStatus): string => {
        switch (status) {
            case 'active': return 'text-green-600';
            case 'warning': return 'text-yellow-600';
            case 'grace': return 'text-orange-600';
            case 'triggered': return 'text-red-600';
            case 'paused': return 'text-blue-600';
            case 'disabled': return 'text-gray-600';
            case 'error': return 'text-red-800';
            case 'testing': return 'text-purple-600';
            default: return 'text-gray-600';
        }
    };

    const getStatusDescription = (status: DeadManSwitchStatus): string => {
        switch (status) {
            case 'active': return 'Monitoring active - system is tracking your activity';
            case 'warning': return 'Warning period - notifications are being sent';
            case 'grace': return 'Grace period - final warnings before activation';
            case 'triggered': return 'Switch triggered - emergency access activated';
            case 'paused': return 'Holiday mode - monitoring temporarily paused';
            case 'disabled': return 'Switch disabled - no monitoring active';
            case 'error': return 'System error - requires attention';
            case 'testing': return 'Test mode - no actual activation will occur';
            default: return 'Unknown status';
        }
    };

    const formatTimeRemaining = (deadManSwitch: DeadManSwitch): string => {
        const now = new Date();
        const lastActivity = new Date(deadManSwitch.lastActivity);
        const config = deadManSwitch.configuration;
        const totalDays = config.inactivityPeriodDays + config.gracePeriodDays;
        const activationDate = new Date(lastActivity.getTime() + totalDays * 24 * 60 * 60 * 1000);
        
        if (now >= activationDate) {
            return 'Activation overdue';
        }
        
        const timeDiff = activationDate.getTime() - now.getTime();
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) {
            return `${days} days, ${hours} hours`;
        } else {
            return `${hours} hours`;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading Dead Man's Switches...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dead Man's Switch</h2>
                    <p className="text-gray-600">Automated emergency access system</p>
                </div>
                <Button 
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Create New Switch
                </Button>
            </div>

            {/* Quick Check-In Section */}
            {switches.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Quick Check-In</h3>
                    <p className="text-green-700 text-sm mb-3">
                        Click to record your activity and reset all active switches
                    </p>
                    <div className="flex gap-2">
                        {switches.filter(s => s.isEnabled && s.status !== 'disabled').map(deadManSwitch => (
                            <Button
                                key={deadManSwitch.id}
                                onClick={() => recordCheckIn(deadManSwitch.id, 'web_checkin')}
                                className="bg-green-600 hover:bg-green-700 text-sm"
                            >
                                Check In - Switch {deadManSwitch.id.substring(0, 8)}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Switches List */}
            <div className="space-y-4">
                {switches.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600">No Dead Man's Switches configured</p>
                        <Button 
                            onClick={() => setShowCreateForm(true)}
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                            Create Your First Switch
                        </Button>
                    </div>
                ) : (
                    switches.map((deadManSwitch) => (
                        <div 
                            key={deadManSwitch.id} 
                            className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        Dead Man's Switch
                                        <span className="text-gray-500 text-sm ml-2">
                                            (ID: {deadManSwitch.id.substring(0, 8)})
                                        </span>
                                    </h3>
                                    <p className={`text-sm font-medium ${getStatusColor(deadManSwitch.status)}`}>
                                        {deadManSwitch.status.toUpperCase()}
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        {getStatusDescription(deadManSwitch.status)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => toggleSwitch(deadManSwitch.id, !deadManSwitch.isEnabled)}
                                        className={deadManSwitch.isEnabled 
                                            ? "bg-red-600 hover:bg-red-700" 
                                            : "bg-green-600 hover:bg-green-700"
                                        }
                                        size="sm"
                                    >
                                        {deadManSwitch.isEnabled ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                        onClick={() => setSelectedSwitch(deadManSwitch)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Details
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="font-medium text-gray-700">Inactivity Period</p>
                                    <p className="text-gray-600">
                                        {deadManSwitch.configuration.inactivityPeriodDays} days
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">Last Activity</p>
                                    <p className="text-gray-600">
                                        {new Date(deadManSwitch.lastActivity).toLocaleDateString()} at{' '}
                                        {new Date(deadManSwitch.lastActivity).toLocaleTimeString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-700">Time Until Activation</p>
                                    <p className="text-gray-600">
                                        {deadManSwitch.status === 'triggered' ? 'Already triggered' : formatTimeRemaining(deadManSwitch)}
                                    </p>
                                </div>
                            </div>

                            {deadManSwitch.isEnabled && deadManSwitch.status !== 'disabled' && (
                                <div className="mt-4 flex gap-2">
                                    <Button
                                        onClick={() => recordCheckIn(deadManSwitch.id, 'web_checkin')}
                                        className="bg-green-600 hover:bg-green-700"
                                        size="sm"
                                    >
                                        Check In Now
                                    </Button>
                                    {deadManSwitch.status !== 'paused' && (
                                        <Button
                                            onClick={() => setSelectedSwitch(deadManSwitch)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Holiday Mode
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Holiday Mode Info */}
                            {deadManSwitch.holidayMode?.isActive && (
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                                    <p className="font-medium text-blue-800">Holiday Mode Active</p>
                                    <p className="text-blue-700 text-sm">
                                        From {new Date(deadManSwitch.holidayMode.startDate).toLocaleDateString()} 
                                        to {new Date(deadManSwitch.holidayMode.endDate).toLocaleDateString()}
                                    </p>
                                    {deadManSwitch.holidayMode.reason && (
                                        <p className="text-blue-600 text-sm">
                                            Reason: {deadManSwitch.holidayMode.reason}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Warning Information */}
                            {deadManSwitch.warningsSent.length > 0 && (
                                <div className="mt-4">
                                    <p className="font-medium text-gray-700 mb-2">Recent Warnings</p>
                                    <div className="space-y-1">
                                        {deadManSwitch.warningsSent.slice(-3).map((warning, index) => (
                                            <div key={warning.id} className="text-sm text-gray-600">
                                                {new Date(warning.sentAt).toLocaleDateString()} - 
                                                {warning.method.type} ({warning.status})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Switch Form Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Create Dead Man's Switch</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const config = {
                                inactivityPeriodDays: parseInt(formData.get('inactivityDays') as string) || 60,
                                gracePeriodDays: parseInt(formData.get('graceDays') as string) || 7
                            };
                            createSwitch(config);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Inactivity Period (days)
                                    </label>
                                    <input
                                        type="number"
                                        name="inactivityDays"
                                        min="30"
                                        max="365"
                                        defaultValue="60"
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Time before warnings start (30-365 days)
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Grace Period (days)
                                    </label>
                                    <input
                                        type="number"
                                        name="graceDays"
                                        min="1"
                                        max="30"
                                        defaultValue="7"
                                        className="w-full border border-gray-300 rounded px-3 py-2"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Additional time after warnings (1-30 days)
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 flex-1">
                                    Create Switch
                                </Button>
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    onClick={() => setShowCreateForm(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Switch Details Modal */}
            {selectedSwitch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Dead Man's Switch Details</h3>
                            <Button 
                                variant="outline" 
                                onClick={() => setSelectedSwitch(null)}
                                size="sm"
                            >
                                Close
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-700">Status</p>
                                        <p className={getStatusColor(selectedSwitch.status)}>
                                            {selectedSwitch.status.toUpperCase()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Enabled</p>
                                        <p>{selectedSwitch.isEnabled ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Created</p>
                                        <p>{new Date(selectedSwitch.metadata.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Last Updated</p>
                                        <p>{new Date(selectedSwitch.metadata.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Configuration */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Configuration</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-700">Inactivity Period</p>
                                        <p>{selectedSwitch.configuration.inactivityPeriodDays} days</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Grace Period</p>
                                        <p>{selectedSwitch.configuration.gracePeriodDays} days</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Early Warnings</p>
                                        <p>{selectedSwitch.configuration.enableEarlyWarnings ? 'Enabled' : 'Disabled'}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">Final Confirmation</p>
                                        <p>{selectedSwitch.configuration.enableFinalConfirmation ? 'Enabled' : 'Disabled'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Holiday Mode Form */}
                            {!selectedSwitch.holidayMode?.isActive && selectedSwitch.status !== 'paused' && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Activate Holiday Mode</h4>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={holidayMode.startDate}
                                                    onChange={(e) => setHolidayMode({...holidayMode, startDate: e.target.value})}
                                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    End Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={holidayMode.endDate}
                                                    onChange={(e) => setHolidayMode({...holidayMode, endDate: e.target.value})}
                                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                                    min={holidayMode.startDate || new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Reason (optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={holidayMode.reason}
                                                onChange={(e) => setHolidayMode({...holidayMode, reason: e.target.value})}
                                                placeholder="e.g., Vacation, Business trip, Medical leave"
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <Button
                                            onClick={() => activateHolidayMode(selectedSwitch.id)}
                                            disabled={!holidayMode.startDate || !holidayMode.endDate}
                                            className="bg-blue-600 hover:bg-blue-700"
                                            size="sm"
                                        >
                                            Activate Holiday Mode
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Check-In Methods */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Check-In Methods</h4>
                                <div className="space-y-2">
                                    {selectedSwitch.checkInMethods.map((method, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <span className="capitalize">{method.type.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={method.enabled ? 'text-green-600' : 'text-gray-400'}>
                                                    {method.enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                                <span className="text-gray-500">
                                                    Reliability: {method.reliability}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            {selectedSwitch.auditTrail.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {selectedSwitch.auditTrail.slice(-5).reverse().map((entry, index) => (
                                            <div key={entry.id} className="text-sm border-l-2 border-gray-200 pl-3">
                                                <div className="flex justify-between">
                                                    <span className="font-medium capitalize">
                                                        {entry.eventType.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {new Date(entry.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {entry.performedBy && (
                                                    <p className="text-gray-600">By: {entry.performedBy}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}