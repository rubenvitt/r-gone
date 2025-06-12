// Legacy Section interface for backward compatibility
export interface Section {
    id: string;
    title: string;
    content: string[];
}

// New Note interface for multi-note support
export interface Note {
    id: string;
    title: string;
    content: string;  // Rich text HTML content (encrypted if passwordProtected is true)
    createdAt: string;
    updatedAt: string;
    tags?: string[];
    metadata?: {
        wordCount?: number;
        characterCount?: number;
        lastEditDuration?: number;
    };
    // Password protection
    passwordProtected?: boolean;
    encryptionData?: {
        iv: string;  // Initialization vector for encryption
        salt: string;  // Salt for key derivation
        algorithm: 'AES-GCM';  // Encryption algorithm
        keyDerivation: 'PBKDF2';  // Key derivation function
        iterations: number;  // PBKDF2 iterations
    };
    // Hint for password (not encrypted, should not reveal password)
    passwordHint?: string;
}

// Enhanced data structure supporting both legacy sections and new notes
export interface DecryptedData {
    // New multi-note structure
    notes?: Note[];
    
    // Legacy sections for backward compatibility
    sections?: Section[];
    
    metadata: {
        lastModified: string;
        version: string;
        dataFormat: 'legacy' | 'multi-note';  // Track format for migrations
        activeNoteId?: string;  // Currently selected note
    };
}

export interface EncryptedDataFile {
    encryptedContent: string;  // Base64 encoded encrypted data
    iv: string;               // Initialization vector
    createdAt: string;
    updatedAt: string;
    // Version tracking for data structure migrations
    dataFormatVersion?: number;
}

// Version history interfaces
export interface NoteVersion {
    id: string;
    noteId: string;
    content: string;
    title: string;
    timestamp: string;
    changeType: 'create' | 'edit' | 'title_change' | 'delete';
    changeSummary?: string;
    author?: string;
}

export interface VersionHistory {
    noteId: string;
    versions: NoteVersion[];
    retentionPolicy: {
        maxVersions: number;
        maxAgeInDays: number;
    };
}

// Password Vault interfaces
export interface PasswordEntry {
    id: string;
    serviceName: string;
    username: string;
    email?: string;
    password: string;
    url?: string;
    notes?: string;
    category: PasswordCategory;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    lastUsed?: string;
    expiresAt?: string;
    isFavorite?: boolean;
    strength?: PasswordStrength;
    history?: PasswordHistoryEntry[];
    customFields?: CustomField[];
}

export interface PasswordHistoryEntry {
    id: string;
    password: string;
    changedAt: string;
    reason?: string;
}

export interface CustomField {
    id: string;
    label: string;
    value: string;
    type: 'text' | 'password' | 'email' | 'url' | 'number';
    isSecret: boolean;
}

export type PasswordCategory = 
    | 'personal'
    | 'business'
    | 'financial'
    | 'social'
    | 'shopping'
    | 'entertainment'
    | 'utilities'
    | 'healthcare'
    | 'education'
    | 'other';

export interface PasswordStrength {
    score: number; // 0-4 (very weak to very strong)
    feedback: string[];
    warning?: string;
    guessesLog10: number;
    crackTimeDisplay: string;
}

export interface PasswordVault {
    entries: PasswordEntry[];
    categories: PasswordCategory[];
    settings: {
        passwordGenerator: {
            length: number;
            includeUppercase: boolean;
            includeLowercase: boolean;
            includeNumbers: boolean;
            includeSymbols: boolean;
            excludeSimilar: boolean;
            excludeAmbiguous: boolean;
        };
        security: {
            autoLockMinutes: number;
            clearClipboardSeconds: number;
            showPasswordsByDefault: boolean;
            requireMasterPasswordForView: boolean;
        };
        import: {
            allowDuplicates: boolean;
            autoCategory: boolean;
        };
    };
    statistics: {
        totalEntries: number;
        weakPasswords: number;
        duplicatePasswords: number;
        expiredPasswords: number;
        lastAnalysis: string;
    };
}

// Document Repository interfaces
export interface DocumentEntry {
    id: string;
    filename: string;
    originalFilename: string;
    fileType: DocumentFileType;
    mimeType: string;
    fileSize: number;
    encryptedContent: string; // Base64 encoded encrypted file content
    thumbnail?: string; // Base64 encoded thumbnail image
    category: DocumentCategory;
    tags?: string[];
    description?: string;
    createdAt: string;
    updatedAt: string;
    lastAccessed?: string;
    version: number;
    isArchived?: boolean;
    isFavorite?: boolean;
    metadata?: DocumentMetadata;
    versions?: DocumentVersion[];
    ocrText?: string; // Extracted text for search
    customFields?: CustomField[];
}

export interface DocumentVersion {
    id: string;
    documentId: string;
    version: number;
    filename: string;
    fileSize: number;
    encryptedContent: string;
    createdAt: string;
    changeDescription?: string;
    checksum: string;
}

export interface DocumentMetadata {
    author?: string;
    subject?: string;
    keywords?: string[];
    pageCount?: number;
    wordCount?: number;
    language?: string;
    creationDate?: string;
    modificationDate?: string;
    application?: string;
    format?: string;
    dimensions?: {
        width: number;
        height: number;
    };
    dpi?: number;
    colorSpace?: string;
    hasPassword?: boolean;
    isEncrypted?: boolean;
    exifData?: Record<string, any>;
}

export type DocumentFileType = 
    | 'pdf'
    | 'image'
    | 'text'
    | 'document'
    | 'spreadsheet'
    | 'presentation'
    | 'archive'
    | 'other';

export type DocumentCategory = 
    | 'legal'
    | 'medical'
    | 'financial'
    | 'personal'
    | 'business'
    | 'insurance'
    | 'tax'
    | 'identification'
    | 'property'
    | 'education'
    | 'other';

export interface DocumentRepository {
    documents: DocumentEntry[];
    categories: DocumentCategory[];
    settings: {
        maxFileSize: number; // in bytes
        allowedFileTypes: string[];
        enableOCR: boolean;
        generateThumbnails: boolean;
        compressionLevel: number;
        versionRetention: {
            maxVersions: number;
            maxAgeInDays: number;
        };
        thumbnails: {
            enabled: boolean;
            width: number;
            height: number;
            quality: number;
        };
    };
    statistics: {
        totalDocuments: number;
        totalSize: number;
        documentsByCategory: Record<DocumentCategory, number>;
        documentsByType: Record<DocumentFileType, number>;
        lastAnalysis: string;
    };
}

export interface DocumentSearchResult {
    document: DocumentEntry;
    relevanceScore: number;
    matchedFields: string[];
    highlights: {
        field: string;
        snippet: string;
        matchStart: number;
        matchEnd: number;
    }[];
}

export interface DocumentFilter {
    category?: DocumentCategory | 'all';
    fileType?: DocumentFileType | 'all';
    dateRange?: {
        from: string;
        to: string;
    };
    sizeRange?: {
        min: number;
        max: number;
    };
    tags?: string[];
    isArchived?: boolean;
    isFavorite?: boolean;
    hasOCR?: boolean;
}

// Contact Directory interfaces
export interface ContactEntry {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    nickname?: string;
    relationship: ContactRelationship;
    category: ContactCategory;
    contactMethods: ContactMethod[];
    addresses: ContactAddress[];
    importantDates: ImportantDate[];
    notes?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    lastContactedAt?: string;
    isFavorite?: boolean;
    isEmergencyContact?: boolean;
    emergencyPriority?: number; // 1 = highest priority
    trustLevel: TrustLevel;
    accessLevel?: ContactAccessLevel;
    photo?: string; // Base64 encoded image
    customFields?: CustomField[];
    relatedContacts?: RelatedContact[];
    metadata?: ContactMetadata;
}

export interface ContactMethod {
    id: string;
    type: ContactMethodType;
    value: string;
    label?: string;
    isPrimary?: boolean;
    isVerified?: boolean;
    notes?: string;
}

export interface ContactAddress {
    id: string;
    type: AddressType;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    isPrimary?: boolean;
    label?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface ImportantDate {
    id: string;
    type: DateType;
    date: string;
    label?: string;
    isRecurring?: boolean;
    reminderDays?: number;
    notes?: string;
}

export interface RelatedContact {
    contactId: string;
    relationship: string;
    notes?: string;
}

export interface ContactMetadata {
    source?: string;
    lastSyncAt?: string;
    syncId?: string;
    confidenceScore?: number;
    duplicateIds?: string[];
    socialProfiles?: SocialProfile[];
}

export interface SocialProfile {
    platform: string;
    username: string;
    url: string;
    isVerified?: boolean;
}

export type ContactRelationship = 
    | 'family'
    | 'spouse'
    | 'partner'
    | 'child'
    | 'parent'
    | 'sibling'
    | 'grandparent'
    | 'grandchild'
    | 'friend'
    | 'colleague'
    | 'business'
    | 'professional'
    | 'medical'
    | 'legal'
    | 'financial'
    | 'neighbor'
    | 'acquaintance'
    | 'other';

export type ContactCategory = 
    | 'personal'
    | 'family'
    | 'friends'
    | 'professional'
    | 'business'
    | 'medical'
    | 'legal'
    | 'financial'
    | 'emergency'
    | 'service'
    | 'other';

export type ContactMethodType = 
    | 'phone'
    | 'mobile'
    | 'email'
    | 'whatsapp'
    | 'telegram'
    | 'signal'
    | 'skype'
    | 'linkedin'
    | 'twitter'
    | 'facebook'
    | 'instagram'
    | 'website'
    | 'other';

export type AddressType = 
    | 'home'
    | 'work'
    | 'mailing'
    | 'billing'
    | 'other';

export type DateType = 
    | 'birthday'
    | 'anniversary'
    | 'memorial'
    | 'meeting'
    | 'appointment'
    | 'other';

export type TrustLevel = 
    | 'high'
    | 'medium'
    | 'low'
    | 'unknown';

export type ContactAccessLevel = 
    | 'none'
    | 'basic'
    | 'limited'
    | 'full'
    | 'admin';

export interface ContactDirectory {
    contacts: ContactEntry[];
    categories: ContactCategory[];
    relationships: ContactRelationship[];
    groups: ContactGroup[];
    settings: {
        defaultCategory: ContactCategory;
        defaultTrustLevel: TrustLevel;
        enableGeolocation: boolean;
        enableSocialSync: boolean;
        duplicateDetection: {
            enabled: boolean;
            threshold: number;
        };
        privacy: {
            shareContacts: boolean;
            allowExport: boolean;
            encryptPhotos: boolean;
        };
        reminders: {
            enabled: boolean;
            birthdayReminder: number;
            anniversaryReminder: number;
        };
    };
    statistics: {
        totalContacts: number;
        contactsByCategory: Record<ContactCategory, number>;
        contactsByRelationship: Record<ContactRelationship, number>;
        favoriteContacts: number;
        emergencyContacts: number;
        recentlyAdded: number;
        lastAnalysis: string;
    };
}

export interface ContactGroup {
    id: string;
    name: string;
    description?: string;
    contactIds: string[];
    color?: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
    isSystem?: boolean;
}

export interface ContactSearchResult {
    contact: ContactEntry;
    relevanceScore: number;
    matchedFields: string[];
    highlights: {
        field: string;
        snippet: string;
        matchStart: number;
        matchEnd: number;
    }[];
}

export interface ContactFilter {
    category?: ContactCategory | 'all';
    relationship?: ContactRelationship | 'all';
    trustLevel?: TrustLevel | 'all';
    tags?: string[];
    isFavorite?: boolean;
    isEmergencyContact?: boolean;
    hasPhoto?: boolean;
    lastContactedDays?: number;
    groups?: string[];
}

// Audit Log interfaces
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    eventType: AuditEventType;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    resourceId?: string;
    action: string;
    result: AuditResult;
    details?: Record<string, any>;
    riskLevel: RiskLevel;
    // Geographic information
    location?: {
        country?: string;
        region?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
    };
    // Additional security fields
    fingerprintId?: string;
    previousLoginTime?: string;
    failedAttempts?: number;
    // Tamper-evident fields
    hash: string;
    previousHash?: string;
    signature?: string;
}

export type AuditEventType = 
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'data_modification'
    | 'system_access'
    | 'emergency_access'
    | 'configuration_change'
    | 'backup_operation'
    | 'file_operation'
    | 'security_event'
    | 'admin_action';

export type AuditResult = 
    | 'success'
    | 'failure'
    | 'blocked'
    | 'suspicious'
    | 'error';

export type RiskLevel = 
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';

export interface AuditLogFilter {
    startDate?: string;
    endDate?: string;
    eventType?: AuditEventType;
    result?: AuditResult;
    riskLevel?: RiskLevel;
    userId?: string;
    ipAddress?: string;
    resource?: string;
    limit?: number;
    offset?: number;
}

export interface AuditLogAnalytics {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsByResult: Record<AuditResult, number>;
    eventsByRiskLevel: Record<RiskLevel, number>;
    uniqueUsers: number;
    uniqueIPs: number;
    suspiciousActivities: number;
    topResources: Array<{
        resource: string;
        count: number;
    }>;
    timeDistribution: Array<{
        hour: number;
        count: number;
    }>;
}

export interface AuditConfiguration {
    enabled: boolean;
    retentionPeriodDays: number;
    maxLogSize: number;
    enableGeolocation: boolean;
    enableFingerprinting: boolean;
    riskThresholds: {
        failedLoginAttempts: number;
        suspiciousLocationChange: boolean;
        rapidRequestThreshold: number;
    };
    alerting: {
        enabled: boolean;
        channels: ('email' | 'webhook')[];
        highRiskThreshold: number;
        criticalRiskThreshold: number;
    };
    compliance: {
        gdprCompliant: boolean;
        hipaaCompliant: boolean;
        exportFormat: ('json' | 'csv' | 'xml')[];
    };
}

// Beneficiary Management interfaces
export interface Beneficiary {
    id: string;
    email: string;
    name: string;
    relationship: BeneficiaryRelationship;
    trustLevel: BeneficiaryTrustLevel;
    accessLevel: BeneficiaryAccessLevel;
    permissions: BeneficiaryPermissions;
    status: BeneficiaryStatus;
    
    // Contact information
    phone?: string;
    alternateEmail?: string;
    address?: {
        street: string;
        city: string;
        state?: string;
        country: string;
        postalCode?: string;
    };
    
    // Access restrictions
    accessRestrictions?: {
        geographic?: {
            allowedCountries?: string[];
            blockedCountries?: string[];
            allowedIpRanges?: string[];
        };
        temporal?: {
            allowedHours?: {
                start: string; // HH:MM format
                end: string;   // HH:MM format
            };
            allowedDays?: number[]; // 0-6, Sunday-Saturday
            timezone?: string;
            validFrom?: string;
            validUntil?: string;
        };
    };
    
    // Invitation and verification
    invitationStatus: InvitationStatus;
    invitationToken?: string;
    invitationSentAt?: string;
    verifiedAt?: string;
    lastAccessAt?: string;
    
    // Succession planning
    isBackupBeneficiary?: boolean;
    backupFor?: string[]; // Array of beneficiary IDs
    priority: number; // Lower number = higher priority
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    createdBy: string; // User ID who added this beneficiary
    notes?: string;
}

export type BeneficiaryRelationship = 
    | 'spouse'
    | 'child'
    | 'parent'
    | 'sibling'
    | 'grandparent'
    | 'grandchild'
    | 'extended_family'
    | 'friend'
    | 'lawyer'
    | 'accountant'
    | 'financial_advisor'
    | 'executor'
    | 'trustee'
    | 'business_partner'
    | 'colleague'
    | 'caregiver'
    | 'other';

export type BeneficiaryTrustLevel = 
    | 'family'     // Immediate family members
    | 'legal'      // Lawyers, executors, trustees
    | 'business'   // Business partners, financial advisors
    | 'emergency'  // Emergency contacts, caregivers
    | 'limited';   // Limited access contacts

export type BeneficiaryAccessLevel = 
    | 'full'       // Access to everything
    | 'financial'  // Only financial information
    | 'medical'    // Only medical information
    | 'personal'   // Only personal messages/instructions
    | 'emergency'  // Only emergency information
    | 'custom';    // Custom permission set

export type BeneficiaryStatus = 
    | 'active'
    | 'inactive'
    | 'suspended'
    | 'revoked';

export type InvitationStatus = 
    | 'pending'
    | 'sent'
    | 'accepted'
    | 'declined'
    | 'expired';

export interface BeneficiaryPermissions {
    // Data access permissions
    canAccessNotes: boolean;
    canAccessPasswords: boolean;
    canAccessDocuments: boolean;
    canAccessContacts: boolean;
    canAccessFinancialInfo: boolean;
    canAccessMedicalInfo: boolean;
    canAccessLegalInfo: boolean;
    
    // Specific document categories (if using custom access level)
    documentCategories?: DocumentCategory[];
    
    // Action permissions
    canDownloadFiles: boolean;
    canViewAuditLogs: boolean;
    canInviteOthers: boolean;
    canModifyOwnAccess: boolean;
    
    // Emergency-specific permissions
    canTriggerEmergencyAccess: boolean;
    canRevokeOtherAccess: boolean;
    canContactEmergencyServices: boolean;
    
    // Administrative permissions (usually for legal/business trust levels)
    canManageBeneficiaries: boolean;
    canModifySystemSettings: boolean;
    canExportAllData: boolean;
}

export interface BeneficiaryGroup {
    id: string;
    name: string;
    description?: string;
    beneficiaryIds: string[];
    permissions: BeneficiaryPermissions;
    accessRestrictions?: BeneficiaryAccessRestrictions;
    createdAt: string;
    updatedAt: string;
    isSystem?: boolean; // System-defined groups like "Family", "Legal Team"
}

export interface BeneficiaryAccessRestrictions {
    geographic?: {
        allowedCountries?: string[];
        blockedCountries?: string[];
        allowedIpRanges?: string[];
    };
    temporal?: {
        allowedHours?: {
            start: string;
            end: string;
        };
        allowedDays?: number[];
        timezone?: string;
        validFrom?: string;
        validUntil?: string;
    };
    conditions?: {
        requireMultipleVerification?: boolean;
        requirePhoneVerification?: boolean;
        requireEmailVerification?: boolean;
        cooldownPeriodMinutes?: number;
    };
}

export interface BeneficiaryInvitation {
    id: string;
    beneficiaryId: string;
    email: string;
    token: string;
    message?: string;
    expiresAt: string;
    sentAt: string;
    acceptedAt?: string;
    declinedAt?: string;
    attempts: number;
    maxAttempts: number;
    createdBy: string;
}

export interface BeneficiaryVerification {
    beneficiaryId: string;
    method: VerificationMethod;
    token: string;
    expiresAt: string;
    attempts: number;
    maxAttempts: number;
    verifiedAt?: string;
    createdAt: string;
}

export type VerificationMethod = 
    | 'email'
    | 'phone'
    | 'identity_document'
    | 'video_call'
    | 'in_person'
    | 'legal_document';

export interface BeneficiaryAccessLog {
    id: string;
    beneficiaryId: string;
    action: string;
    resource?: string;
    resourceId?: string;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
    location?: {
        country?: string;
        region?: string;
        city?: string;
    };
    success: boolean;
    details?: Record<string, any>;
}

export interface BeneficiaryManagementSystem {
    beneficiaries: Beneficiary[];
    groups: BeneficiaryGroup[];
    invitations: BeneficiaryInvitation[];
    verifications: BeneficiaryVerification[];
    accessLogs: BeneficiaryAccessLog[];
    settings: {
        defaultTrustLevel: BeneficiaryTrustLevel;
        defaultAccessLevel: BeneficiaryAccessLevel;
        invitationExpiryDays: number;
        verificationExpiryHours: number;
        maxInvitationAttempts: number;
        maxVerificationAttempts: number;
        requireEmailVerification: boolean;
        requirePhoneVerification: boolean;
        enableGeographicRestrictions: boolean;
        enableTemporalRestrictions: boolean;
        allowSelfInvitation: boolean;
        notificationSettings: {
            emailTemplates: {
                invitation: string;
                verification: string;
                accessGranted: string;
                accessRevoked: string;
            };
            webhookUrl?: string;
            enableAuditNotifications: boolean;
        };
    };
    statistics: {
        totalBeneficiaries: number;
        activeBeneficiaries: number;
        pendingInvitations: number;
        verifiedBeneficiaries: number;
        beneficiariesByTrustLevel: Record<BeneficiaryTrustLevel, number>;
        beneficiariesByAccessLevel: Record<BeneficiaryAccessLevel, number>;
        recentAccess: number;
        lastAnalysis: string;
    };
}

export interface BeneficiaryFilter {
    trustLevel?: BeneficiaryTrustLevel;
    accessLevel?: BeneficiaryAccessLevel;
    status?: BeneficiaryStatus;
    relationship?: BeneficiaryRelationship;
    invitationStatus?: InvitationStatus;
    hasRecentAccess?: boolean;
    search?: string;
}

// Access Control Matrix interfaces
export interface AccessControlMatrix {
    id: string;
    name: string;
    description?: string;
    rules: AccessControlRule[];
    defaultPermissions: AccessPermissionSet;
    settings: AccessControlSettings;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    isActive: boolean;
    version: number;
}

export interface AccessControlRule {
    id: string;
    name: string;
    description?: string;
    subjects: AccessSubject[];
    resources: AccessResource[];
    permissions: AccessPermissionSet;
    conditions: AccessCondition[];
    timeConstraints?: TimeConstraint[];
    priority: number; // Lower number = higher priority
    isActive: boolean;
    metadata?: Record<string, any>;
}

export interface AccessSubject {
    type: 'beneficiary' | 'group' | 'role' | 'trustLevel' | 'relationship';
    id: string; // Beneficiary ID, Group ID, or value for trustLevel/relationship
    attributes?: Record<string, any>;
}

export interface AccessResource {
    type: ResourceType;
    id?: string; // Specific resource ID (optional for category-based access)
    category?: string; // Resource category
    attributes?: Record<string, any>;
}

export type ResourceType = 
    | 'document'
    | 'note'
    | 'password'
    | 'contact'
    | 'financialInfo'
    | 'medicalInfo'
    | 'legalInfo'
    | 'emergencyInfo'
    | 'auditLog'
    | 'systemSetting'
    | 'beneficiary';

export interface AccessPermissionSet {
    read: boolean;
    write: boolean;
    delete: boolean;
    share: boolean;
    download: boolean;
    print: boolean;
    execute: boolean; // For actions like triggering emergency access
    customPermissions?: Record<string, boolean>;
}

export interface AccessCondition {
    type: ConditionType;
    parameters: Record<string, any>;
    operator?: 'AND' | 'OR' | 'NOT';
    nestedConditions?: AccessCondition[];
}

export type ConditionType = 
    | 'timeDelay'           // Access after specified delay
    | 'multiFactorAuth'     // Requires MFA
    | 'locationBased'       // Geographic restrictions
    | 'deviceTrust'         // Trusted device requirement
    | 'emergencyTrigger'    // Emergency access activated
    | 'userInactivity'      // User hasn't logged in for X days
    | 'externalVerification' // External party verification
    | 'customCondition';    // Custom business logic

export interface TimeConstraint {
    type: 'schedule' | 'dateRange' | 'timeWindow' | 'delay';
    startTime?: string; // ISO 8601
    endTime?: string;   // ISO 8601
    timezone?: string;
    recurrence?: RecurrenceRule;
    delayHours?: number;
    delayType?: 'afterGrant' | 'afterRequest' | 'afterEvent';
}

export interface RecurrenceRule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[]; // 0-6
    daysOfMonth?: number[]; // 1-31
    months?: number[]; // 1-12
    count?: number;
    until?: string; // ISO 8601
}

export interface AccessControlSettings {
    enableInheritance: boolean;
    conflictResolution: 'mostPermissive' | 'mostRestrictive' | 'priority' | 'explicit';
    cachePermissions: boolean;
    auditAllAccess: boolean;
    requireReasonForAccess: boolean;
    enableEmergencyOverride: boolean;
    notificationSettings: {
        notifyOnAccess: boolean;
        notifyOnPermissionChange: boolean;
        notifyOnRuleChange: boolean;
        recipients: string[]; // Email addresses
    };
    defaultTimeDelay?: number; // Hours
}

export interface AccessRequest {
    id: string;
    requesterId: string; // Beneficiary ID
    resourceType: ResourceType;
    resourceId?: string;
    requestedPermissions: Partial<AccessPermissionSet>;
    reason: string;
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    requestedAt: string;
    expiresAt?: string;
    status: 'pending' | 'approved' | 'denied' | 'expired' | 'revoked';
    approvedBy?: string;
    approvedAt?: string;
    deniedBy?: string;
    deniedAt?: string;
    denialReason?: string;
    grantedPermissions?: AccessPermissionSet;
    validUntil?: string;
    conditions?: AccessCondition[];
    metadata?: Record<string, any>;
}

export interface TemporaryAccessGrant {
    id: string;
    beneficiaryId: string;
    rule: AccessControlRule;
    grantedBy: string;
    grantedAt: string;
    expiresAt: string;
    reason: string;
    isActive: boolean;
    usageCount: number;
    maxUsage?: number;
    revokedBy?: string;
    revokedAt?: string;
    revocationReason?: string;
}

export interface AccessControlAudit {
    matrixId: string;
    timestamp: string;
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
    performedBy: string;
    changes?: Record<string, any>;
    previousState?: AccessControlMatrix;
    reason?: string;
}

export interface PermissionEvaluation {
    allowed: boolean;
    appliedRules: string[]; // Rule IDs
    deniedBy?: string; // Rule ID that denied access
    conditions: {
        condition: AccessCondition;
        satisfied: boolean;
        reason?: string;
    }[];
    effectivePermissions: AccessPermissionSet;
    timeConstraints?: TimeConstraint[];
    requiredActions?: string[]; // Actions needed to gain access
    accessLevel: 'full' | 'partial' | 'none';
    evaluationTime: number; // milliseconds
}

// Beneficiary Verification System interfaces
export interface BeneficiaryVerificationSystem {
    verifications: VerificationRecord[];
    workflows: VerificationWorkflow[];
    settings: VerificationSettings;
    providers: VerificationProvider[];
    sessions: VerificationSession[];
    statistics: VerificationStatistics;
}

export interface VerificationRecord {
    id: string;
    beneficiaryId: string;
    sessionId?: string;
    type: VerificationType;
    method: VerificationMethod;
    status: VerificationStatus;
    level: VerificationLevel;
    provider?: string;
    externalId?: string; // ID from third-party verification service
    startedAt: string;
    completedAt?: string;
    expiresAt?: string;
    validUntil?: string;
    results: VerificationResult[];
    documents: VerificationDocument[];
    biometrics?: BiometricData[];
    geolocation?: GeolocationData;
    deviceInfo?: DeviceInfo;
    metadata?: Record<string, any>;
    notes?: string;
    verifiedBy?: string; // For manual verification
    confidence: number; // 0-100
    riskScore: number; // 0-100
    auditTrail: VerificationAuditEntry[];
}

export type VerificationType = 
    | 'identity'
    | 'document'
    | 'biometric'
    | 'video'
    | 'geographic'
    | 'manual'
    | 'composite'; // Multiple verification types combined

export type VerificationMethod = 
    | 'government_id'
    | 'passport'
    | 'drivers_license'
    | 'utility_bill'
    | 'bank_statement'
    | 'death_certificate'
    | 'power_of_attorney'
    | 'court_order'
    | 'fingerprint'
    | 'facial_recognition'
    | 'voice_recognition'
    | 'iris_scan'
    | 'video_call'
    | 'liveness_check'
    | 'ip_geolocation'
    | 'device_fingerprint'
    | 'manual_review'
    | 'knowledge_based_auth'; // KBA questions

export type VerificationStatus = 
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'expired'
    | 'rejected'
    | 'requires_manual_review'
    | 'suspended';

export type VerificationLevel = 
    | 'basic'      // Single method verification
    | 'enhanced'   // Multiple methods, medium confidence
    | 'premium'    // Comprehensive verification, high confidence
    | 'maximum';   // All available methods, highest confidence

export interface VerificationResult {
    method: VerificationMethod;
    status: 'passed' | 'failed' | 'inconclusive';
    confidence: number; // 0-100
    details: Record<string, any>;
    timestamp: string;
    provider?: string;
    externalId?: string;
    errors?: string[];
    warnings?: string[];
}

export interface VerificationDocument {
    id: string;
    type: DocumentType;
    filename: string;
    uploadedAt: string;
    processedAt?: string;
    extractedData?: ExtractedDocumentData;
    verificationResults?: DocumentVerificationResult[];
    encryptedContent: string; // Base64 encoded encrypted file
    metadata: {
        size: number;
        mimeType: string;
        checksum: string;
    };
}

export type DocumentType = 
    | 'government_id'
    | 'passport'
    | 'drivers_license'
    | 'birth_certificate'
    | 'death_certificate'
    | 'marriage_certificate'
    | 'divorce_decree'
    | 'power_of_attorney'
    | 'will'
    | 'court_order'
    | 'utility_bill'
    | 'bank_statement'
    | 'other';

export interface ExtractedDocumentData {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    documentNumber?: string;
    issuingAuthority?: string;
    issueDate?: string;
    expiryDate?: string;
    address?: string;
    additionalFields?: Record<string, any>;
}

export interface DocumentVerificationResult {
    check: DocumentCheck;
    result: 'passed' | 'failed' | 'warning';
    confidence: number;
    details?: string;
}

export type DocumentCheck = 
    | 'authenticity'
    | 'tampering'
    | 'expiry'
    | 'format'
    | 'quality'
    | 'face_match'
    | 'data_consistency';

export interface BiometricData {
    type: BiometricType;
    template: string; // Encrypted biometric template
    quality: number; // 0-100
    capturedAt: string;
    deviceInfo?: string;
    provider?: string;
    metadata?: Record<string, any>;
}

export type BiometricType = 
    | 'fingerprint'
    | 'facial'
    | 'voice'
    | 'iris'
    | 'palm'
    | 'signature';

export interface GeolocationData {
    ipAddress: string;
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    isp?: string;
    isVpn?: boolean;
    isProxy?: boolean;
    riskScore?: number;
    timestamp: string;
}

export interface DeviceInfo {
    fingerprint: string;
    userAgent: string;
    platform: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    plugins?: string[];
    isBot?: boolean;
    riskScore?: number;
    firstSeen?: string;
    lastSeen: string;
}

export interface VerificationWorkflow {
    id: string;
    name: string;
    description?: string;
    steps: VerificationStep[];
    requiredLevel: VerificationLevel;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface VerificationStep {
    id: string;
    name: string;
    type: VerificationType;
    methods: VerificationMethod[];
    required: boolean;
    order: number;
    conditions?: VerificationCondition[];
    settings?: Record<string, any>;
}

export interface VerificationCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
    logicalOperator?: 'AND' | 'OR';
}

export interface VerificationSession {
    id: string;
    beneficiaryId: string;
    workflowId: string;
    status: VerificationStatus;
    currentStep: number;
    startedAt: string;
    lastActivityAt: string;
    completedAt?: string;
    expiresAt: string;
    verifications: string[]; // VerificationRecord IDs
    notes?: string;
    metadata?: Record<string, any>;
}

export interface VerificationProvider {
    id: string;
    name: string;
    type: 'identity' | 'document' | 'biometric' | 'geolocation' | 'composite';
    supportedMethods: VerificationMethod[];
    isActive: boolean;
    configuration: ProviderConfiguration;
    webhookUrl?: string;
    webhookSecret?: string;
    apiVersion?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProviderConfiguration {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    environment: 'sandbox' | 'production';
    settings: Record<string, any>;
    rateLimit?: {
        requestsPerMinute: number;
        requestsPerDay: number;
    };
}

export interface VerificationSettings {
    defaultWorkflowId?: string;
    sessionExpiryHours: number;
    verificationExpiryDays: number;
    maxRetryAttempts: number;
    minConfidenceScore: number;
    enableAutomaticRetry: boolean;
    enableManualReview: boolean;
    manualReviewThreshold: number; // Confidence score below which manual review is required
    enableWebhooks: boolean;
    enableAuditLogging: boolean;
    retentionPolicy: {
        keepVerificationRecords: number; // days
        keepDocuments: number; // days
        keepBiometrics: number; // days
        keepSessions: number; // days
    };
    notifications: {
        onSuccess: boolean;
        onFailure: boolean;
        onManualReview: boolean;
        onExpiry: boolean;
        recipients: string[];
    };
}

export interface VerificationStatistics {
    totalVerifications: number;
    verificationsByStatus: Record<VerificationStatus, number>;
    verificationsByMethod: Record<VerificationMethod, number>;
    verificationsByLevel: Record<VerificationLevel, number>;
    averageConfidenceScore: number;
    averageProcessingTime: number; // minutes
    successRate: number; // percentage
    manualReviewRate: number; // percentage
    lastAnalysis: string;
}

export interface VerificationAuditEntry {
    timestamp: string;
    action: string;
    details: Record<string, any>;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
}

// Dead Man's Switch interfaces
export interface DeadManSwitch {
    id: string;
    isEnabled: boolean;
    configuration: DeadManSwitchConfig;
    status: DeadManSwitchStatus;
    lastActivity: string;
    nextWarning?: string;
    nextCheck: string;
    warningsSent: WarningRecord[];
    checkInMethods: CheckInMethod[];
    holidayMode?: HolidayMode;
    metadata: {
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        lastModifiedBy: string;
    };
    auditTrail: DeadManSwitchAuditEntry[];
}

export interface DeadManSwitchConfig {
    inactivityPeriodDays: number; // Primary inactivity period (30-90 days)
    gracePeriodDays: number; // Additional grace period after warnings
    warningSchedule: WarningSchedule[];
    enableEarlyWarnings: boolean;
    enableFinalConfirmation: boolean;
    finalConfirmationHours: number; // Hours before activation for final confirmation
    reactivationMethod: ReactivationMethod;
    activationBehavior: ActivationBehavior;
    emergencyContacts: EmergencyContact[];
    testMode?: boolean; // For testing purposes
}

export interface WarningSchedule {
    daysBeforeActivation: number;
    methods: NotificationMethod[];
    template: string;
    requireResponse: boolean;
    escalationAfterHours?: number;
}

export interface NotificationMethod {
    type: 'email' | 'sms' | 'push' | 'phone_call' | 'webhook';
    enabled: boolean;
    destination: string; // Email address, phone number, etc.
    priority: number; // 1 = highest priority
    metadata?: Record<string, any>;
}

export interface CheckInMethod {
    type: CheckInType;
    enabled: boolean;
    configuration: CheckInConfiguration;
    lastUsed?: string;
    usageCount: number;
    reliability: number; // 0-100 based on successful check-ins
}

export type CheckInType = 
    | 'app_login'
    | 'email_response'
    | 'sms_response'
    | 'phone_call'
    | 'web_checkin'
    | 'biometric'
    | 'api_token'
    | 'manual_trigger';

export interface CheckInConfiguration {
    minFrequencyDays?: number;
    maxConsecutiveMissed?: number;
    requireSecureContext?: boolean;
    allowedIpRanges?: string[];
    allowedDevices?: string[];
    customSettings?: Record<string, any>;
}

export type ReactivationMethod = 
    | 'simple_confirmation'   // Single click/response
    | 'secure_confirmation'   // Multi-factor confirmation
    | 'biometric_confirmation' // Biometric verification
    | 'manual_intervention';  // Admin override required

export interface ActivationBehavior {
    enableGradualActivation: boolean; // Activate access levels progressively
    activationStages?: ActivationStage[];
    enableFullActivation: boolean;
    fullActivationDelayHours?: number;
    enableRollback: boolean; // Allow reverting activation
    rollbackWindowHours?: number;
    notifyBeneficiariesImmediately: boolean;
    enableEmergencyOverride: boolean;
}

export interface ActivationStage {
    stage: number;
    delayHours: number;
    accessLevels: BeneficiaryAccessLevel[];
    resourceTypes: ResourceType[];
    notificationRecipients: string[];
    requiresManualApproval?: boolean;
}

export interface EmergencyContact {
    id: string;
    name: string;
    relationship: string;
    contactMethods: NotificationMethod[];
    notifyOnWarnings: boolean;
    notifyOnActivation: boolean;
    canCancelActivation: boolean;
    trustLevel: 'high' | 'medium' | 'low';
}

export type DeadManSwitchStatus = 
    | 'active'      // Monitoring, user is active
    | 'warning'     // Warning period, sending notifications
    | 'grace'       // Grace period after warnings
    | 'triggered'   // Switch has been triggered
    | 'paused'      // Temporarily paused (holiday mode)
    | 'disabled'    // Switch is disabled
    | 'error'       // System error, needs attention
    | 'testing';    // In test mode

export interface WarningRecord {
    id: string;
    sentAt: string;
    method: NotificationMethod;
    template: string;
    status: 'sent' | 'delivered' | 'read' | 'responded' | 'failed';
    response?: string;
    responseAt?: string;
    escalated?: boolean;
    escalatedAt?: string;
}

export interface HolidayMode {
    isActive: boolean;
    startDate: string;
    endDate: string;
    reason?: string;
    emergencyContactNotified: boolean;
    autoResume: boolean;
    maxDuration?: number; // Maximum holiday duration in days
    activatedBy: string;
    activatedAt: string;
}

export interface DeadManSwitchAuditEntry {
    id: string;
    timestamp: string;
    eventType: DeadManSwitchEventType;
    details: Record<string, any>;
    performedBy?: string; // User ID or 'system'
    ipAddress?: string;
    userAgent?: string;
    oldState?: Partial<DeadManSwitch>;
    newState?: Partial<DeadManSwitch>;
}

export type DeadManSwitchEventType = 
    | 'created'
    | 'enabled'
    | 'disabled'
    | 'config_updated'
    | 'check_in'
    | 'warning_sent'
    | 'warning_acknowledged'
    | 'holiday_activated'
    | 'holiday_deactivated'
    | 'triggered'
    | 'reactivated'
    | 'manual_override'
    | 'system_error'
    | 'test_execution';

export interface DeadManSwitchSystem {
    switches: DeadManSwitch[];
    globalSettings: DeadManSwitchGlobalSettings;
    monitoringService: MonitoringServiceConfig;
    statistics: DeadManSwitchStatistics;
}

export interface DeadManSwitchGlobalSettings {
    enableSystem: boolean;
    defaultInactivityDays: number;
    defaultGraceDays: number;
    minInactivityDays: number;
    maxInactivityDays: number;
    enableTestMode: boolean;
    enableDetailedLogging: boolean;
    enableEmergencyOverride: boolean;
    globalEmergencyContacts: EmergencyContact[];
    alertingConfiguration: {
        enableSystemAlerts: boolean;
        alertRecipients: string[];
        alertOnErrors: boolean;
        alertOnActivations: boolean;
        alertOnLongInactivity: boolean;
    };
    retentionPolicy: {
        keepAuditLogs: number; // days
        keepWarningRecords: number; // days
        keepStatistics: number; // days
    };
}

export interface MonitoringServiceConfig {
    enabled: boolean;
    checkIntervalMinutes: number;
    enableHealthChecks: boolean;
    healthCheckIntervalMinutes: number;
    enableBackupMonitoring: boolean;
    enableRedundancy: boolean;
    redundancyConfig?: {
        primaryService: string;
        backupServices: string[];
        failoverThresholdMinutes: number;
    };
    notificationConfiguration: {
        enableServiceAlerts: boolean;
        alertRecipients: string[];
        webhookUrl?: string;
        retryAttempts: number;
        retryIntervalMinutes: number;
    };
}

export interface DeadManSwitchStatistics {
    totalSwitches: number;
    activeSwitches: number;
    triggeredSwitches: number;
    switchesByStatus: Record<DeadManSwitchStatus, number>;
    averageInactivityPeriod: number;
    totalWarningsSent: number;
    warningResponseRate: number; // percentage
    holidayModeUsage: number;
    systemUptime: number; // percentage
    lastMonitoringCheck: string;
    performanceMetrics: {
        averageCheckInProcessingTime: number; // milliseconds
        averageWarningDeliveryTime: number; // milliseconds
        systemErrors: number;
        lastErrorAt?: string;
    };
}

// Backup and Recovery System interfaces
export interface BackupSystem {
    backups: BackupRecord[];
    configuration: BackupConfiguration;
    providers: BackupProvider[];
    schedules: BackupSchedule[];
    statistics: BackupStatistics;
    verification: BackupVerification;
}

export interface BackupRecord {
    id: string;
    type: BackupType;
    status: BackupStatus;
    createdAt: string;
    completedAt?: string;
    size: number; // bytes
    checksum: string;
    encryption: BackupEncryption;
    metadata: BackupMetadata;
    storage: BackupStorageInfo[];
    verification?: BackupVerificationResult;
    restoration?: BackupRestorationInfo;
}

export type BackupType = 
    | 'full'          // Complete system backup
    | 'incremental'   // Changes since last backup
    | 'differential'  // Changes since last full backup
    | 'selective'     // User-selected data only
    | 'emergency'     // Critical data only
    | 'paper'         // Human-readable paper backup
    | 'hardware'      // USB/external device backup
    | 'blockchain';   // Blockchain-verified backup

export type BackupStatus = 
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'corrupted'
    | 'verified'
    | 'expired'
    | 'archived';

export interface BackupEncryption {
    algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-4096';
    keyDerivation: 'PBKDF2' | 'scrypt' | 'Argon2';
    iterations: number;
    saltSize: number;
    ivSize: number;
    separateKeyEncryption: boolean; // Use different key for backup vs original data
    keyEscrow?: BackupKeyEscrow;
}

export interface BackupKeyEscrow {
    enabled: boolean;
    method: 'shamir_secret_sharing' | 'multi_signature' | 'key_splitting';
    threshold: number; // Minimum shares needed to recover
    totalShares: number;
    custodians: BackupKeyCustodian[];
}

export interface BackupKeyCustodian {
    id: string;
    name: string;
    contactMethod: string;
    shareId: string;
    publicKey: string;
    trustLevel: 'high' | 'medium' | 'low';
    lastVerified?: string;
}

export interface BackupMetadata {
    originalDataSize: number;
    compressionRatio: number;
    dataTypes: string[]; // notes, passwords, documents, etc.
    includedComponents: string[];
    excludedComponents: string[];
    retentionPolicy: BackupRetentionPolicy;
    tags: string[];
    description?: string;
    automaticBackup: boolean;
    triggeredBy: string; // user ID or 'system'
}

export interface BackupRetentionPolicy {
    keepDays: number;
    keepWeeks: number;
    keepMonths: number;
    keepYears: number;
    maxBackups: number;
    autoDelete: boolean;
    archiveOldBackups: boolean;
    archiveAfterDays: number;
}

export interface BackupStorageInfo {
    provider: string;
    location: BackupStorageLocation;
    path: string;
    uploadedAt: string;
    size: number;
    checksum: string;
    redundancyLevel: number; // How many copies at this location
    accessCredentials?: string; // Encrypted access info
    cost?: BackupCostInfo;
}

export interface BackupStorageLocation {
    type: 'cloud' | 'local' | 'usb' | 'paper' | 'blockchain';
    provider?: string; // AWS, Google, Azure, etc.
    region?: string;
    endpoint?: string;
    physicalLocation?: string; // For paper/USB backups
}

export interface BackupCostInfo {
    storagePerGB: number;
    transferPerGB: number;
    requestsPer1000: number;
    estimatedMonthlyCost: number;
    currency: string;
}

export interface BackupProvider {
    id: string;
    name: string;
    type: 'cloud' | 'local' | 'hybrid';
    isActive: boolean;
    configuration: BackupProviderConfig;
    capabilities: BackupProviderCapabilities;
    statistics: BackupProviderStatistics;
    costStructure: BackupCostInfo;
}

export interface BackupProviderConfig {
    credentials: {
        accessKey?: string;
        secretKey?: string;
        endpoint?: string;
        region?: string;
        bucket?: string;
        connectionString?: string;
    };
    settings: {
        enableCompression: boolean;
        compressionLevel: number;
        enableDeduplication: boolean;
        maxConcurrentUploads: number;
        chunkSize: number; // bytes
        retryAttempts: number;
        timeoutSeconds: number;
    };
    redundancy: {
        enabled: boolean;
        copies: number;
        crossRegion: boolean;
        crossProvider: boolean;
    };
}

export interface BackupProviderCapabilities {
    maxFileSize: number;
    supportedEncryption: string[];
    supportedCompression: string[];
    versioning: boolean;
    deduplication: boolean;
    crossRegionReplication: boolean;
    costOptimization: boolean;
    instantRetrieval: boolean;
    archiving: boolean;
}

export interface BackupProviderStatistics {
    totalBackups: number;
    totalSize: number;
    successRate: number;
    averageUploadTime: number;
    averageDownloadTime: number;
    lastBackupAt?: string;
    costs: {
        thisMonth: number;
        lastMonth: number;
        total: number;
    };
}

export interface BackupSchedule {
    id: string;
    name: string;
    isActive: boolean;
    frequency: BackupFrequency;
    backupType: BackupType;
    includedData: string[];
    excludedData: string[];
    targetProviders: string[];
    maxRetention: BackupRetentionPolicy;
    conditions: BackupCondition[];
    notifications: BackupNotificationConfig;
    nextRunAt: string;
    lastRunAt?: string;
    successCount: number;
    failureCount: number;
}

export interface BackupFrequency {
    type: 'interval' | 'cron' | 'event_based';
    intervalHours?: number;
    cronExpression?: string;
    events?: BackupTriggerEvent[];
}

export type BackupTriggerEvent = 
    | 'data_changed'
    | 'user_login'
    | 'emergency_access'
    | 'manual_trigger'
    | 'scheduled_maintenance'
    | 'security_event';

export interface BackupCondition {
    type: 'time_based' | 'data_size' | 'change_threshold' | 'custom';
    parameters: Record<string, any>;
    operator: 'AND' | 'OR' | 'NOT';
}

export interface BackupNotificationConfig {
    onSuccess: boolean;
    onFailure: boolean;
    onVerificationFail: boolean;
    recipients: string[];
    methods: ('email' | 'sms' | 'webhook')[];
    includeStatistics: boolean;
}

export interface BackupConfiguration {
    globalSettings: BackupGlobalSettings;
    defaultRetention: BackupRetentionPolicy;
    encryptionDefaults: BackupEncryption;
    providerFailover: BackupFailoverConfig;
    costLimits: BackupCostLimits;
    complianceSettings: BackupComplianceSettings;
}

export interface BackupGlobalSettings {
    enableAutomaticBackups: boolean;
    enableCrossProviderRedundancy: boolean;
    enableBackupVerification: boolean;
    enableCostOptimization: boolean;
    enableCompression: boolean;
    enableDeduplication: boolean;
    maxConcurrentBackups: number;
    defaultBackupType: BackupType;
    emergencyBackupThreshold: number; // MB of data changes
}

export interface BackupFailoverConfig {
    enabled: boolean;
    failoverDelay: number; // seconds
    maxRetries: number;
    fallbackProviders: string[];
    requireManualApproval: boolean;
    notifyOnFailover: boolean;
}

export interface BackupCostLimits {
    maxMonthlySpend: number;
    currency: string;
    alertThresholds: number[]; // percentages: [50, 75, 90]
    pauseBackupsAtLimit: boolean;
    costOptimizationMode: 'aggressive' | 'balanced' | 'conservative';
}

export interface BackupComplianceSettings {
    requireEncryption: boolean;
    requireGeolocation: boolean;
    allowedRegions: string[];
    dataResidency: string;
    retentionCompliance: {
        legalHold: boolean;
        minimumRetentionDays: number;
        immutableBackups: boolean;
    };
    auditRequirements: {
        detailedLogging: boolean;
        accessLogging: boolean;
        integrityChecking: boolean;
        regularComplianceReports: boolean;
    };
}

export interface BackupVerification {
    enabled: boolean;
    schedule: BackupVerificationSchedule;
    methods: BackupVerificationMethod[];
    results: BackupVerificationResult[];
    statistics: BackupVerificationStatistics;
}

export interface BackupVerificationSchedule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    timeOfDay: string; // HH:MM format
    percentage: number; // Percentage of backups to verify each run
    priority: 'newest' | 'oldest' | 'random' | 'critical';
}

export type BackupVerificationMethod = 
    | 'checksum'
    | 'partial_restore'
    | 'full_restore'
    | 'blockchain_verification'
    | 'third_party_audit';

export interface BackupVerificationResult {
    id: string;
    backupId: string;
    verifiedAt: string;
    method: BackupVerificationMethod;
    status: 'passed' | 'failed' | 'partial';
    details: Record<string, any>;
    duration: number; // milliseconds
    errors?: string[];
}

export interface BackupVerificationStatistics {
    totalVerifications: number;
    successfulVerifications: number;
    failedVerifications: number;
    averageVerificationTime: number;
    lastVerificationAt?: string;
    nextScheduledVerification?: string;
    verificationCoverage: number; // percentage
}

// Recovery Mechanisms Types
export interface RecoveryMechanism {
    id: string;
    type: RecoveryType;
    name: string;
    description: string;
    isActive: boolean;
    isSetup: boolean;
    priority: number; // 1 = highest priority
    configuration: RecoveryMechanismConfig;
    verificationData?: RecoveryVerificationData;
    lastUsed?: string;
    successRate: number;
    createdAt: string;
    updatedAt: string;
}

export type RecoveryType = 
    | 'master_password_reset'
    | 'social_recovery'
    | 'legal_recovery'
    | 'emergency_codes'
    | 'hardware_token'
    | 'biometric'
    | 'backup_restoration'
    | 'support_recovery';

export interface RecoveryMechanismConfig {
    // Master Password Recovery
    securityQuestions?: SecurityQuestion[];
    alternateEmail?: string;
    phoneNumber?: string;
    
    // Social Recovery
    trustedContacts?: TrustedContact[];
    requiredApprovals?: number;
    timeDelay?: number; // hours
    
    // Legal Recovery
    legalDocuments?: LegalRecoveryDocument[];
    authorizedPersons?: AuthorizedPerson[];
    notaryRequirement?: boolean;
    
    // Emergency Codes
    recoveryCodes?: RecoveryCode[];
    codesRemaining?: number;
    
    // Hardware Token
    tokenType?: string;
    tokenSerial?: string;
    backupTokens?: string[];
    
    // Biometric
    biometricTypes?: BiometricType[];
    biometricTemplates?: BiometricTemplate[];
    
    // Additional settings
    requireTwoFactor?: boolean;
    allowPartialRecovery?: boolean;
    requireAuditLog?: boolean;
}

export interface SecurityQuestion {
    id: string;
    question: string;
    answerHash: string; // Hashed answer
    salt: string;
    iterations: number;
    isActive: boolean;
    createdAt: string;
}

export interface TrustedContact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    relationship: string;
    publicKey?: string; // For encrypted communications
    verificationCode: string;
    isVerified: boolean;
    lastContactAt?: string;
    emergencyPriority: number;
    permissions: ContactPermission[];
    createdAt: string;
}

export interface ContactPermission {
    action: 'view_recovery_status' | 'initiate_recovery' | 'approve_recovery' | 'emergency_access';
    granted: boolean;
    conditions?: string[];
}

export interface LegalRecoveryDocument {
    id: string;
    type: 'will' | 'trust' | 'power_of_attorney' | 'court_order' | 'death_certificate';
    description: string;
    documentHash: string; // Hash of the document
    notarized: boolean;
    validUntil?: string;
    attachedFile?: string;
    verificationInstructions: string;
    createdAt: string;
}

export interface AuthorizedPerson {
    id: string;
    name: string;
    relationship: string;
    email: string;
    phone?: string;
    documentType: string; // ID type (passport, driver's license, etc.)
    documentNumber: string;
    authority: RecoveryAuthority[];
    requiresNotarization: boolean;
    verificationQuestions?: SecurityQuestion[];
    createdAt: string;
}

export type RecoveryAuthority = 
    | 'full_account_access'
    | 'data_export'
    | 'account_closure'
    | 'beneficiary_notification'
    | 'emergency_access_only';

export interface RecoveryCode {
    id: string;
    code: string; // One-time use code
    purpose: 'master_password_reset' | 'emergency_access' | 'account_recovery';
    isUsed: boolean;
    usedAt?: string;
    expiresAt?: string;
    restrictedTo?: string; // IP address or location restriction
    createdAt: string;
}

export type BiometricType = 'fingerprint' | 'face' | 'voice' | 'iris' | 'palm';

export interface BiometricTemplate {
    id: string;
    type: BiometricType;
    templateData: string; // Encrypted biometric template
    quality: number; // 0-100
    enrolledAt: string;
    lastUsed?: string;
    deviceId?: string;
    isActive: boolean;
}

export interface RecoveryVerificationData {
    verificationHash: string;
    verifiedAt: string;
    verificationMethod: string;
    nextVerificationDue?: string;
    verificationFailures: number;
    maxFailures: number;
}

export interface RecoveryAttempt {
    id: string;
    type: RecoveryType;
    initiatedBy: string; // IP address or user identifier
    status: RecoveryAttemptStatus;
    startedAt: string;
    completedAt?: string;
    failureReason?: string;
    verificationSteps: RecoveryVerificationStep[];
    approvals: RecoveryApproval[];
    auditLog: RecoveryAuditEntry[];
    riskScore: number; // 0-100
    requiresManualReview: boolean;
    metadata: Record<string, any>;
}

export type RecoveryAttemptStatus = 
    | 'initiated'
    | 'verification_pending'
    | 'approval_pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'expired';

export interface RecoveryVerificationStep {
    id: string;
    type: string;
    description: string;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    startedAt: string;
    completedAt?: string;
    data?: Record<string, any>;
    failureReason?: string;
    retryCount: number;
}

export interface RecoveryApproval {
    id: string;
    approverId: string;
    approverName: string;
    approverType: 'trusted_contact' | 'legal_authority' | 'system_admin';
    status: 'pending' | 'approved' | 'denied';
    requestedAt: string;
    respondedAt?: string;
    comments?: string;
    verificationData?: Record<string, any>;
}

export interface RecoveryAuditEntry {
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryConfiguration {
    globalSettings: RecoveryGlobalSettings;
    mechanisms: RecoveryMechanism[];
    emergencySettings: EmergencyRecoverySettings;
    legalSettings: LegalRecoverySettings;
    securitySettings: RecoverySecuritySettings;
    notificationSettings: RecoveryNotificationSettings;
}

export interface RecoveryGlobalSettings {
    enabled: boolean;
    requireMultipleVerification: boolean;
    allowSelfRecovery: boolean;
    requireTimeDelay: boolean;
    defaultTimeDelayHours: number;
    maxAttempts: number;
    attemptLockoutHours: number;
    requireAuditLog: boolean;
    enableRiskAssessment: boolean;
}

export interface EmergencyRecoverySettings {
    enableEmergencyCodes: boolean;
    codeCount: number;
    codeLength: number;
    codeExpiration: number; // days
    requireSecondaryVerification: boolean;
    allowBypassTimeDelay: boolean;
    emergencyContacts: string[];
    autoNotifyEmergency: boolean;
}

export interface LegalRecoverySettings {
    enableLegalRecovery: boolean;
    acceptedDocuments: string[];
    requireNotarization: boolean;
    requireMultipleDocuments: boolean;
    verificationPeriod: number; // days
    appealProcess: boolean;
    legalContactInfo: string;
}

export interface RecoverySecuritySettings {
    enableBiometrics: boolean;
    biometricTypes: BiometricType[];
    requireHardwareToken: boolean;
    enableGeolocation: boolean;
    allowedLocations: string[];
    requireKnownDevice: boolean;
    enableRiskScoring: boolean;
    riskThresholds: {
        low: number;
        medium: number;
        high: number;
    };
}

export interface RecoveryNotificationSettings {
    notifyOnAttempt: boolean;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notifyTrustedContacts: boolean;
    notificationMethods: ('email' | 'sms' | 'phone' | 'push')[];
    emergencyNotificationDelay: number; // minutes
    includeLocationData: boolean;
    includeDeviceInfo: boolean;
}

export interface RecoveryStatistics {
    totalAttempts: number;
    successfulRecoveries: number;
    failedAttempts: number;
    averageRecoveryTime: number; // hours
    mostUsedMethod: RecoveryType;
    riskDistribution: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
    monthlyStats: {
        [month: string]: {
            attempts: number;
            successes: number;
            avgTime: number;
        };
    };
}

export interface BackupVerificationStatistics {
    totalVerifications: number;
    passedVerifications: number;
    failedVerifications: number;
    lastVerificationAt: string;
    averageVerificationTime: number;
    integrityScore: number; // 0-100
}

export interface BackupStatistics {
    totalBackups: number;
    totalSize: number;
    successfulBackups: number;
    failedBackups: number;
    averageBackupTime: number;
    lastBackupAt?: string;
    backupsByType: Record<BackupType, number>;
    backupsByProvider: Record<string, number>;
    storageDistribution: Record<string, number>;
    costsByProvider: Record<string, number>;
    monthlyGrowth: BackupGrowthStatistics;
    redundancyStatus: BackupRedundancyStatus;
}

export interface BackupGrowthStatistics {
    dataGrowthMB: number;
    backupCountGrowth: number;
    costGrowth: number;
    month: string;
}

export interface BackupRedundancyStatus {
    totalBackups: number;
    singleCopyBackups: number;
    multiCopyBackups: number;
    crossProviderBackups: number;
    offlineBackups: number;
    averageRedundancy: number;
}

export interface BackupRestorationInfo {
    id: string;
    requestedAt: string;
    requestedBy: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    targetLocation: string;
    estimatedDuration?: number;
    completedAt?: string;
    restoredSize?: number;
    verificationPassed?: boolean;
    errors?: string[];
}

export interface PaperBackup {
    id: string;
    backupId: string;
    generatedAt: string;
    format: 'qr_code' | 'text' | 'mixed';
    pages: PaperBackupPage[];
    redundancyLevel: number; // How many copies to generate
    watermark: string;
    instructions: string;
    emergencyContacts: string[];
}

export interface PaperBackupPage {
    pageNumber: number;
    content: string;
    qrCodes?: string[];
    checksum: string;
    redundantData: boolean; // Contains recovery info for other pages
}

export interface USBBackup {
    id: string;
    backupId: string;
    deviceInfo: USBDeviceInfo;
    createdAt: string;
    encryptionMethod: 'luks' | 'veracrypt' | 'bitlocker' | 'custom';
    autorunEnabled: boolean;
    portableMode: boolean;
    emergencyAccess: boolean;
}

export interface USBDeviceInfo {
    deviceId: string;
    manufacturer: string;
    model: string;
    capacity: number;
    filesystem: string;
    serialNumber?: string;
    lastConnected?: string;
}

export interface BlockchainBackup {
    id: string;
    backupId: string;
    blockchain: 'ethereum' | 'bitcoin' | 'ipfs' | 'custom';
    transactionHash: string;
    blockNumber?: number;
    smartContractAddress?: string;
    dataHash: string;
    redundancyNodes: number;
    costPerTransaction: number;
    verificationMethod: 'merkle_tree' | 'digital_signature' | 'consensus';
}

// Digital Asset Inventory interfaces
export interface DigitalAsset {
    id: string;
    type: DigitalAssetType;
    category: DigitalAssetCategory;
    name: string;
    description?: string;
    tags?: string[];
    
    // Common fields
    createdAt: string;
    updatedAt: string;
    lastVerified?: string;
    isFavorite?: boolean;
    isActive?: boolean;
    importance: ImportanceLevel;
    
    // Access information
    accessUrl?: string;
    username?: string;
    email?: string;
    accountNumber?: string;
    customerId?: string;
    
    // Type-specific data
    assetData: AssetTypeData;
    
    // Financial information
    value?: AssetValue;
    costs?: AssetCost;
    
    // Lifecycle management
    expiryDate?: string;
    renewalDate?: string;
    cancellationDate?: string;
    autoRenew?: boolean;
    
    // Security
    twoFactorEnabled?: boolean;
    recoveryMethods?: RecoveryMethod[];
    securityNotes?: string;
    
    // Related assets
    relatedAssets?: string[]; // Asset IDs
    dependencies?: string[]; // Asset IDs this depends on
    
    // Documents and notes
    attachedDocuments?: string[]; // Document IDs from DocumentRepository
    notes?: string;
    customFields?: CustomField[];
}

export type DigitalAssetType = 
    | 'online_account'
    | 'domain_name'
    | 'website'
    | 'cryptocurrency'
    | 'investment_account'
    | 'subscription_service'
    | 'social_media'
    | 'cloud_storage'
    | 'digital_collectible'
    | 'software_license'
    | 'api_key'
    | 'server'
    | 'database'
    | 'email_account'
    | 'other';

export type DigitalAssetCategory = 
    | 'financial'
    | 'business'
    | 'personal'
    | 'entertainment'
    | 'productivity'
    | 'development'
    | 'social'
    | 'investment'
    | 'infrastructure'
    | 'other';

export type ImportanceLevel = 
    | 'critical'
    | 'high'
    | 'medium'
    | 'low';

export interface AssetValue {
    amount: number;
    currency: string;
    lastUpdated: string;
    isEstimate?: boolean;
    includeInTotal?: boolean;
    history?: ValueHistory[];
}

export interface ValueHistory {
    date: string;
    amount: number;
    currency: string;
    note?: string;
}

export interface AssetCost {
    type: 'one_time' | 'recurring' | 'usage_based';
    amount: number;
    currency: string;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    nextBillingDate?: string;
    paymentMethod?: string;
    autoPayEnabled?: boolean;
}

export interface RecoveryMethod {
    type: 'email' | 'phone' | 'security_questions' | 'recovery_codes' | 'authenticator' | 'hardware_key' | 'other';
    value?: string; // Email, phone number, etc.
    notes?: string;
    lastVerified?: string;
}

export type AssetTypeData = 
    | OnlineAccountData
    | DomainNameData
    | CryptocurrencyData
    | InvestmentAccountData
    | SubscriptionServiceData
    | SocialMediaData
    | CloudStorageData
    | DigitalCollectibleData
    | SoftwareLicenseData
    | APIKeyData
    | ServerData
    | DatabaseData
    | EmailAccountData
    | GenericAssetData;

export interface OnlineAccountData {
    type: 'online_account';
    serviceName: string;
    accountType?: string;
    registrationDate?: string;
    accountStatus?: 'active' | 'inactive' | 'suspended' | 'closed';
    associatedEmail?: string;
    associatedPhone?: string;
    securityQuestions?: Array<{
        question: string;
        hint?: string;
    }>;
}

export interface DomainNameData {
    type: 'domain_name';
    domainName: string;
    registrar: string;
    registrationDate: string;
    expiryDate: string;
    autoRenew: boolean;
    dnsProvider?: string;
    nameservers?: string[];
    privacyProtection?: boolean;
    transferLock?: boolean;
    authCode?: string;
    associatedWebsites?: string[];
}

export interface CryptocurrencyData {
    type: 'cryptocurrency';
    platform: string; // Exchange or wallet provider
    walletType: 'exchange' | 'hot_wallet' | 'cold_wallet' | 'hardware_wallet';
    walletAddress?: string;
    publicKey?: string;
    holdings?: CryptoHolding[];
    recoveryPhrase?: string; // Should be encrypted
    hardwareDevice?: string;
    multiSigInfo?: {
        required: number;
        total: number;
        signers: string[];
    };
}

export interface CryptoHolding {
    symbol: string;
    name: string;
    amount: number;
    valueUSD?: number;
    lastUpdated: string;
}

export interface InvestmentAccountData {
    type: 'investment_account';
    provider: string;
    accountType: 'brokerage' | 'retirement' | 'savings' | 'crypto' | 'other';
    accountNumber: string;
    holdings?: InvestmentHolding[];
    totalValue?: AssetValue;
    performanceYTD?: number;
    managementFee?: number;
    taxDocuments?: boolean;
}

export interface InvestmentHolding {
    symbol?: string;
    name: string;
    quantity: number;
    purchasePrice?: number;
    currentPrice?: number;
    purchaseDate?: string;
    assetClass: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'commodity' | 'other';
}

export interface SubscriptionServiceData {
    type: 'subscription_service';
    serviceName: string;
    plan: string;
    billingCycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
    startDate: string;
    nextBillingDate?: string;
    features?: string[];
    userLimit?: number;
    storageLimit?: string;
    apiLimit?: number;
    cancellationPolicy?: string;
}

export interface SocialMediaData {
    type: 'social_media';
    platform: string;
    username: string;
    profileUrl?: string;
    followers?: number;
    following?: number;
    posts?: number;
    verifiedAccount?: boolean;
    businessAccount?: boolean;
    monetizationEnabled?: boolean;
    backupCodes?: string[];
    connectedAccounts?: string[];
}

export interface CloudStorageData {
    type: 'cloud_storage';
    provider: string;
    storageUsed: number; // in bytes
    storageLimit: number; // in bytes
    fileCount?: number;
    sharedFolders?: number;
    syncedDevices?: string[];
    encryptionEnabled?: boolean;
    backupEnabled?: boolean;
}

export interface DigitalCollectibleData {
    type: 'digital_collectible';
    platform: string;
    collectionName?: string;
    tokenId?: string;
    contractAddress?: string;
    blockchain?: string;
    rarity?: string;
    attributes?: Record<string, any>;
    marketplaceUrl?: string;
    purchasePrice?: AssetValue;
    currentValue?: AssetValue;
}

export interface SoftwareLicenseData {
    type: 'software_license';
    software: string;
    version?: string;
    licenseKey?: string;
    licenseType: 'perpetual' | 'subscription' | 'trial' | 'open_source';
    seats?: number;
    activations?: number;
    maxActivations?: number;
    purchaseDate?: string;
    supportExpiry?: string;
    upgradeEligible?: boolean;
}

export interface APIKeyData {
    type: 'api_key';
    service: string;
    keyName?: string;
    keyValue?: string; // Should be encrypted
    permissions?: string[];
    rateLimit?: string;
    usage?: {
        current: number;
        limit: number;
        resetDate: string;
    };
    environment?: 'production' | 'staging' | 'development';
    expiryDate?: string;
}

export interface ServerData {
    type: 'server';
    provider: string;
    serverName: string;
    ipAddress?: string;
    location?: string;
    specifications?: {
        cpu?: string;
        ram?: string;
        storage?: string;
        bandwidth?: string;
    };
    operatingSystem?: string;
    purpose?: string;
    sshKey?: string; // Should be encrypted
    rootPassword?: string; // Should be encrypted
}

export interface DatabaseData {
    type: 'database';
    provider: string;
    databaseType: string;
    databaseName: string;
    host?: string;
    port?: number;
    size?: string;
    backupSchedule?: string;
    connectionString?: string; // Should be encrypted
    credentials?: {
        username?: string;
        passwordHint?: string;
    };
}

export interface EmailAccountData {
    type: 'email_account';
    emailAddress: string;
    provider: string;
    accountType: 'personal' | 'business' | 'alias' | 'forward';
    storageUsed?: number;
    storageLimit?: number;
    aliases?: string[];
    forwardingAddresses?: string[];
    imapSettings?: {
        server: string;
        port: number;
        security: string;
    };
    smtpSettings?: {
        server: string;
        port: number;
        security: string;
    };
    appPasswords?: Array<{
        name: string;
        created: string;
    }>;
}

export interface GenericAssetData {
    type: 'other';
    assetType?: string;
    details?: Record<string, any>;
}

export interface DigitalAssetInventory {
    assets: DigitalAsset[];
    categories: DigitalAssetCategory[];
    types: DigitalAssetType[];
    settings: DigitalAssetSettings;
    statistics: DigitalAssetStatistics;
    alerts: AssetAlert[];
}

export interface DigitalAssetSettings {
    defaultCategory: DigitalAssetCategory;
    defaultImportance: ImportanceLevel;
    enableValueTracking: boolean;
    enableExpiryMonitoring: boolean;
    expiryWarningDays: number;
    enableAutoRenewal: boolean;
    currencyPreference: string;
    groupRelatedAssets: boolean;
    securitySettings: {
        encryptSensitiveData: boolean;
        maskApiKeys: boolean;
        requireVerificationForView: boolean;
        auditAssetAccess: boolean;
    };
    notifications: {
        expiryAlerts: boolean;
        valueChangeAlerts: boolean;
        securityAlerts: boolean;
        alertChannels: ('email' | 'sms' | 'push')[];
    };
}

export interface DigitalAssetStatistics {
    totalAssets: number;
    assetsByType: Record<DigitalAssetType, number>;
    assetsByCategory: Record<DigitalAssetCategory, number>;
    totalValue?: AssetValue;
    monthlyRecurringCost?: AssetValue;
    yearlyRecurringCost?: AssetValue;
    expiringAssets: number;
    inactiveAssets: number;
    criticalAssets: number;
    lastAnalysis: string;
}

export interface AssetAlert {
    id: string;
    assetId: string;
    type: 'expiry' | 'renewal' | 'security' | 'value_change' | 'inactive' | 'payment';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    createdAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    actionRequired?: boolean;
    actionUrl?: string;
}

export interface AssetFilter {
    type?: DigitalAssetType | 'all';
    category?: DigitalAssetCategory | 'all';
    importance?: ImportanceLevel | 'all';
    isActive?: boolean;
    hasValue?: boolean;
    expiringDays?: number;
    search?: string;
    tags?: string[];
}

export interface AssetSearchResult {
    asset: DigitalAsset;
    relevanceScore: number;
    matchedFields: string[];
    highlights: {
        field: string;
        snippet: string;
    }[];
}

// Instructions & Messages System interfaces
export interface PersonalMessage {
    id: string;
    type: MessageType;
    format: MessageFormat;
    category: MessageCategory;
    title: string;
    content: MessageContent;
    recipients: MessageRecipient[];
    metadata: MessageMetadata;
    conditions?: MessageCondition[];
    scheduling?: MessageScheduling;
    attachments?: MessageAttachment[];
    status: MessageStatus;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastModifiedBy?: string;
    version: number;
    locale?: string; // For multi-language support
    parentMessageId?: string; // For message versioning/translations
}

export type MessageType = 
    | 'personal'        // Personal message to loved ones
    | 'instruction'     // Specific instructions or guidance
    | 'financial'       // Financial instructions
    | 'medical'         // Medical information/wishes
    | 'legal'           // Legal instructions
    | 'funeral'         // Funeral arrangements
    | 'password'        // Password/access instructions
    | 'emergency'       // Emergency contact info
    | 'farewell'        // Final farewell message
    | 'memory'          // Shared memories
    | 'advice'          // Life advice
    | 'confession'      // Things to confess
    | 'gratitude'       // Thank you messages
    | 'apology'         // Apologies
    | 'wish'            // Final wishes
    | 'legacy'          // Legacy instructions
    | 'business'        // Business succession
    | 'creative'        // Creative works/ideas
    | 'spiritual'       // Spiritual/religious messages
    | 'custom';         // Custom category

export type MessageFormat = 
    | 'text'            // Plain or rich text
    | 'audio'           // Audio recording
    | 'video'           // Video recording
    | 'mixed';          // Combination of formats

export type MessageCategory = 
    | 'immediate'       // Deliver immediately upon activation
    | 'timed'           // Deliver at specific time/date
    | 'conditional'     // Deliver based on conditions
    | 'milestone'       // Deliver on life milestones
    | 'recurring'       // Deliver repeatedly
    | 'manual';         // Requires manual trigger

export interface MessageContent {
    text?: string;              // Rich text content (HTML)
    plainText?: string;         // Plain text version
    audioUrl?: string;          // URL to audio file
    audioTranscript?: string;   // Transcript of audio
    videoUrl?: string;          // URL to video file
    videoTranscript?: string;   // Transcript of video
    videoPoster?: string;       // Video thumbnail
    duration?: number;          // Duration in seconds for audio/video
    size?: number;              // File size in bytes
    mimeType?: string;          // MIME type of media
    encrypted?: boolean;        // Whether media is encrypted
    compressionInfo?: {
        original: number;
        compressed: number;
        algorithm: string;
    };
}

export interface MessageRecipient {
    id: string;
    type: RecipientType;
    identifier: string;         // Email, beneficiary ID, contact ID, etc.
    name: string;
    relationship?: string;
    priority: number;           // Delivery priority (1 = highest)
    deliveryMethod: DeliveryMethod[];
    permissions: MessagePermissions;
    acknowledgmentRequired?: boolean;
    metadata?: Record<string, any>;
}

export type RecipientType = 
    | 'beneficiary'     // Existing beneficiary
    | 'contact'         // From contact directory
    | 'email'           // Direct email address
    | 'phone'           // Phone number
    | 'group'           // Group of recipients
    | 'public'          // Publicly accessible
    | 'executor'        // Estate executor
    | 'lawyer'          // Legal representative
    | 'all';            // All beneficiaries

export type DeliveryMethod = 
    | 'system'          // In-system delivery
    | 'email'           // Email delivery
    | 'sms'             // SMS delivery
    | 'webhook'         // Webhook notification
    | 'print';          // Physical delivery

export interface MessagePermissions {
    canView: boolean;
    canDownload: boolean;
    canForward: boolean;
    canReply: boolean;
    canPrint: boolean;
    expiresAfterViewing?: number; // Minutes
    maxViews?: number;
    requiresPassword?: boolean;
    passwordHint?: string;
}

export interface MessageMetadata {
    importance: 'low' | 'medium' | 'high' | 'critical';
    sensitivity: 'public' | 'private' | 'confidential' | 'secret';
    language: string;           // ISO language code
    readTime?: number;          // Estimated minutes
    keywords?: string[];
    tone?: MessageTone;
    isTemplate?: boolean;
    templateId?: string;
    templateVariables?: Record<string, any>;
    aiGenerated?: boolean;
    aiModel?: string;
    lastReviewed?: string;
    reviewedBy?: string;
    approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
    approvalNotes?: string;
}

export type MessageTone = 
    | 'formal'
    | 'informal'
    | 'emotional'
    | 'professional'
    | 'humorous'
    | 'serious'
    | 'loving'
    | 'neutral';

export interface MessageCondition {
    id: string;
    type: ConditionType;
    operator: 'AND' | 'OR' | 'NOT';
    parameters: Record<string, any>;
    description?: string;
}

export interface MessageScheduling {
    type: SchedulingType;
    deliverAt?: string;         // ISO date for specific time
    delayHours?: number;        // Delay after trigger
    recurringPattern?: RecurringPattern;
    timezone?: string;
    expiresAt?: string;         // Message expires if not delivered by
    retryPolicy?: {
        maxAttempts: number;
        intervalHours: number;
    };
    dependencies?: string[];    // Other message IDs that must be delivered first
}

export type SchedulingType = 
    | 'immediate'
    | 'scheduled'
    | 'delayed'
    | 'recurring'
    | 'milestone'
    | 'conditional';

export interface RecurringPattern {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    daysOfWeek?: number[];      // 0-6
    dayOfMonth?: number;        // 1-31
    monthOfYear?: number;       // 1-12
    customCron?: string;        // Cron expression
    endDate?: string;
    maxOccurrences?: number;
}

export interface MessageAttachment {
    id: string;
    type: AttachmentType;
    name: string;
    url?: string;
    documentId?: string;        // Reference to document repository
    assetId?: string;           // Reference to digital asset
    size: number;
    mimeType: string;
    thumbnail?: string;
    description?: string;
    encrypted: boolean;
    checksum: string;
}

export type AttachmentType = 
    | 'document'
    | 'image'
    | 'video'
    | 'audio'
    | 'file'
    | 'link';

export type MessageStatus = 
    | 'draft'           // Being composed
    | 'scheduled'       // Scheduled for delivery
    | 'pending'         // Awaiting delivery conditions
    | 'sending'         // In process of sending
    | 'delivered'       // Successfully delivered
    | 'viewed'          // Viewed by recipient
    | 'failed'          // Delivery failed
    | 'expired'         // Expired without delivery
    | 'cancelled';      // Manually cancelled

export interface MessageTemplate {
    id: string;
    name: string;
    description: string;
    type: MessageType;
    category: TemplateCategory;
    content: Partial<PersonalMessage>;
    variables: TemplateVariable[];
    tags: string[];
    isSystem: boolean;          // System-provided template
    isPublic: boolean;          // Shared template
    usage: number;              // Usage count
    rating?: number;            // User rating
    author: string;
    createdAt: string;
    updatedAt: string;
    locale: string;
}

export type TemplateCategory = 
    | 'farewell'
    | 'instructions'
    | 'financial'
    | 'legal'
    | 'medical'
    | 'memories'
    | 'advice'
    | 'gratitude'
    | 'apology'
    | 'business'
    | 'creative'
    | 'spiritual'
    | 'custom';

export interface TemplateVariable {
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'recipient';
    label: string;
    placeholder?: string;
    defaultValue?: any;
    required: boolean;
    options?: Array<{ label: string; value: any }>;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        message?: string;
    };
}

export interface MessageDeliveryLog {
    id: string;
    messageId: string;
    recipientId: string;
    deliveryMethod: DeliveryMethod;
    status: DeliveryStatus;
    attemptedAt: string;
    deliveredAt?: string;
    viewedAt?: string;
    failureReason?: string;
    retryCount: number;
    nextRetryAt?: string;
    metadata?: Record<string, any>;
    acknowledgment?: {
        required: boolean;
        acknowledgedAt?: string;
        acknowledgedBy?: string;
        acknowledgmentMethod?: string;
        acknowledgmentNote?: string;
    };
}

export type DeliveryStatus = 
    | 'pending'
    | 'queued'
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'viewed'
    | 'bounced'
    | 'failed'
    | 'expired';

export interface MessagesLibrary {
    messages: PersonalMessage[];
    templates: MessageTemplate[];
    categories: MessageCategory[];
    deliveryLogs: MessageDeliveryLog[];
    settings: MessageSystemSettings;
    statistics: MessageStatistics;
}

export interface MessageSystemSettings {
    defaultFormat: MessageFormat;
    defaultCategory: MessageCategory;
    enableAudioMessages: boolean;
    enableVideoMessages: boolean;
    maxAudioDuration: number;   // seconds
    maxVideoDuration: number;   // seconds
    maxFileSize: number;        // bytes
    supportedLanguages: string[];
    defaultLanguage: string;
    enableTemplates: boolean;
    enableAIAssistance: boolean;
    enableScheduling: boolean;
    enableConditionalDelivery: boolean;
    deliveryRetryAttempts: number;
    deliveryRetryInterval: number; // hours
    archiveDeliveredMessages: boolean;
    archiveAfterDays: number;
    notificationSettings: {
        notifyOnDraft: boolean;
        notifyOnScheduled: boolean;
        notifyOnDelivered: boolean;
        notifyOnViewed: boolean;
        notifyOnFailed: boolean;
        notificationChannels: ('email' | 'sms' | 'push')[];
    };
    mediaStorage: {
        provider: 'local' | 'cloud' | 'hybrid';
        cloudProvider?: string;
        encryptMedia: boolean;
        compressMedia: boolean;
        generateTranscripts: boolean;
        generateThumbnails: boolean;
    };
}

export interface MessageStatistics {
    totalMessages: number;
    messagesByType: Record<MessageType, number>;
    messagesByFormat: Record<MessageFormat, number>;
    messagesByStatus: Record<MessageStatus, number>;
    totalRecipients: number;
    deliveredMessages: number;
    viewedMessages: number;
    failedDeliveries: number;
    averageDeliveryTime: number; // minutes
    popularTemplates: Array<{
        templateId: string;
        usageCount: number;
    }>;
    languageDistribution: Record<string, number>;
    lastAnalysis: string;
}

// Enhanced file structure with all components including beneficiary management
export interface EnhancedDecryptedData extends DecryptedData {
    versionHistory?: VersionHistory[];
    passwordVault?: PasswordVault;
    documentRepository?: DocumentRepository;
    contactDirectory?: ContactDirectory;
    digitalAssetInventory?: DigitalAssetInventory;
    messagesLibrary?: MessagesLibrary;
    auditLogs?: AuditLogEntry[];
    auditConfiguration?: AuditConfiguration;
    beneficiaryManagement?: BeneficiaryManagementSystem;
    accessControlMatrix?: AccessControlMatrix;
    verificationSystem?: BeneficiaryVerificationSystem;
    deadManSwitchSystem?: DeadManSwitchSystem;
    backupSystem?: BackupSystem;
    settings?: {
        autoSave: {
            enabled: boolean;
            intervalMs: number;
        };
        defaultNoteTitle: string;
        maxNotesPerFile: number;
    };
}