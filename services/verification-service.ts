import crypto from 'crypto';
import { 
  BeneficiaryVerificationSystem,
  VerificationRecord,
  VerificationSession,
  VerificationWorkflow,
  VerificationProvider,
  VerificationType,
  VerificationMethod,
  VerificationStatus,
  VerificationLevel,
  VerificationResult,
  VerificationDocument,
  BiometricData,
  GeolocationData,
  DeviceInfo,
  ExtractedDocumentData,
  DocumentVerificationResult
} from '@/types/data';
import { auditLoggingService } from './audit-logging-service';

export interface VerificationServiceOptions {
  sessionExpiryHours?: number;
  verificationExpiryDays?: number;
  maxRetryAttempts?: number;
  minConfidenceScore?: number;
  enableAutomaticRetry?: boolean;
  enableManualReview?: boolean;
  manualReviewThreshold?: number;
}

export class VerificationService {
  private static instance: VerificationService;
  private dataDirectory: string;
  private providers: Map<string, VerificationProvider> = new Map();
  private activeWebhooks: Map<string, any> = new Map();

  constructor() {
    this.dataDirectory = process.cwd() + '/data/verification';
    this.ensureDataDirectory();
  }

  public static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  /**
   * Create a new verification system
   */
  createVerificationSystem(): BeneficiaryVerificationSystem {
    return {
      verifications: [],
      workflows: this.createDefaultWorkflows(),
      settings: this.createDefaultSettings(),
      providers: [],
      sessions: [],
      statistics: {
        totalVerifications: 0,
        verificationsByStatus: {
          pending: 0,
          in_progress: 0,
          completed: 0,
          failed: 0,
          expired: 0,
          rejected: 0,
          requires_manual_review: 0,
          suspended: 0
        },
        verificationsByMethod: {
          government_id: 0,
          passport: 0,
          drivers_license: 0,
          utility_bill: 0,
          bank_statement: 0,
          death_certificate: 0,
          power_of_attorney: 0,
          court_order: 0,
          fingerprint: 0,
          facial_recognition: 0,
          voice_recognition: 0,
          iris_scan: 0,
          video_call: 0,
          liveness_check: 0,
          ip_geolocation: 0,
          device_fingerprint: 0,
          manual_review: 0,
          knowledge_based_auth: 0
        },
        verificationsByLevel: {
          basic: 0,
          enhanced: 0,
          premium: 0,
          maximum: 0
        },
        averageConfidenceScore: 0,
        averageProcessingTime: 0,
        successRate: 0,
        manualReviewRate: 0,
        lastAnalysis: new Date().toISOString()
      }
    };
  }

  /**
   * Start a verification session for a beneficiary
   */
  async startVerificationSession(
    system: BeneficiaryVerificationSystem,
    beneficiaryId: string,
    workflowId: string,
    options?: {
      expiryHours?: number;
      notes?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<VerificationSession> {
    const workflow = system.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error('Verification workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Verification workflow is not active');
    }

    // Check for existing active session
    const existingSession = system.sessions.find(s => 
      s.beneficiaryId === beneficiaryId && 
      s.status === 'in_progress' &&
      new Date(s.expiresAt) > new Date()
    );

    if (existingSession) {
      throw new Error('Active verification session already exists for this beneficiary');
    }

    const expiryHours = options?.expiryHours || system.settings.sessionExpiryHours;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const session: VerificationSession = {
      id: crypto.randomUUID(),
      beneficiaryId,
      workflowId,
      status: 'in_progress',
      currentStep: 0,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      verifications: [],
      notes: options?.notes,
      metadata: options?.metadata
    };

    system.sessions.push(session);

    await auditLoggingService.logEvent({
      eventType: 'authorization',
      action: 'start_verification_session',
      resource: 'verification_session',
      resourceId: session.id,
      result: 'success',
      details: {
        beneficiaryId,
        workflowId: workflow.name,
        expiresAt: session.expiresAt
      },
      riskLevel: 'medium',
      userId: beneficiaryId
    });

    return session;
  }

  /**
   * Submit identity verification using third-party service
   */
  async submitIdentityVerification(
    system: BeneficiaryVerificationSystem,
    sessionId: string,
    method: VerificationMethod,
    providerId: string,
    documentData: {
      type: string;
      frontImage: string; // Base64 encoded
      backImage?: string; // Base64 encoded for ID cards
      selfieImage?: string; // Base64 encoded for face matching
    },
    options?: {
      enableLivenessCheck?: boolean;
      enableFaceMatch?: boolean;
      enableDocumentAuthenticity?: boolean;
    }
  ): Promise<VerificationRecord> {
    const session = system.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Verification session not found');
    }

    if (session.status !== 'in_progress') {
      throw new Error('Verification session is not active');
    }

    if (new Date(session.expiresAt) <= new Date()) {
      throw new Error('Verification session has expired');
    }

    const provider = system.providers.find(p => p.id === providerId);
    if (!provider) {
      throw new Error('Verification provider not found');
    }

    if (!provider.isActive) {
      throw new Error('Verification provider is not active');
    }

    if (!provider.supportedMethods.includes(method)) {
      throw new Error(`Provider does not support verification method: ${method}`);
    }

    const verificationRecord: VerificationRecord = {
      id: crypto.randomUUID(),
      beneficiaryId: session.beneficiaryId,
      sessionId: session.id,
      type: 'identity',
      method,
      status: 'in_progress',
      level: 'basic',
      provider: providerId,
      startedAt: new Date().toISOString(),
      results: [],
      documents: [],
      confidence: 0,
      riskScore: 50, // Default medium risk
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action: 'verification_started',
        details: { method, provider: provider.name }
      }]
    };

    // Process document
    const document: VerificationDocument = {
      id: crypto.randomUUID(),
      type: this.mapMethodToDocumentType(method),
      filename: `${method}_${Date.now()}.jpg`,
      uploadedAt: new Date().toISOString(),
      encryptedContent: await this.encryptDocument(documentData.frontImage),
      metadata: {
        size: documentData.frontImage.length,
        mimeType: 'image/jpeg',
        checksum: this.calculateChecksum(documentData.frontImage)
      }
    };

    verificationRecord.documents.push(document);

    // Submit to third-party verification service
    try {
      const verificationResult = await this.submitToProvider(
        provider,
        verificationRecord,
        documentData,
        options
      );

      verificationRecord.results.push(verificationResult);
      verificationRecord.confidence = verificationResult.confidence;
      verificationRecord.externalId = verificationResult.externalId;

      // Determine final status based on result
      if (verificationResult.status === 'passed' && verificationResult.confidence >= system.settings.minConfidenceScore) {
        verificationRecord.status = 'completed';
        verificationRecord.completedAt = new Date().toISOString();
      } else if (verificationResult.status === 'failed') {
        verificationRecord.status = 'failed';
        verificationRecord.completedAt = new Date().toISOString();
      } else if (verificationResult.confidence < system.settings.manualReviewThreshold) {
        verificationRecord.status = 'requires_manual_review';
      } else {
        verificationRecord.status = 'pending';
      }

      // Calculate risk score based on results
      verificationRecord.riskScore = this.calculateRiskScore(verificationResult);

    } catch (error) {
      verificationRecord.status = 'failed';
      verificationRecord.completedAt = new Date().toISOString();
      verificationRecord.results.push({
        method,
        status: 'failed',
        confidence: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
        provider: providerId,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }

    verificationRecord.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'verification_completed',
      details: { 
        status: verificationRecord.status, 
        confidence: verificationRecord.confidence,
        riskScore: verificationRecord.riskScore
      }
    });

    system.verifications.push(verificationRecord);
    session.verifications.push(verificationRecord.id);
    session.lastActivityAt = new Date().toISOString();

    await auditLoggingService.logEvent({
      eventType: 'authorization',
      action: 'submit_identity_verification',
      resource: 'verification_record',
      resourceId: verificationRecord.id,
      result: verificationRecord.status === 'completed' ? 'success' : 
              verificationRecord.status === 'failed' ? 'failure' : 'pending',
      details: {
        beneficiaryId: session.beneficiaryId,
        method,
        provider: provider.name,
        confidence: verificationRecord.confidence,
        riskScore: verificationRecord.riskScore
      },
      riskLevel: verificationRecord.riskScore > 70 ? 'high' : 
                  verificationRecord.riskScore > 30 ? 'medium' : 'low',
      userId: session.beneficiaryId
    });

    return verificationRecord;
  }

  /**
   * Submit document verification
   */
  async submitDocumentVerification(
    system: BeneficiaryVerificationSystem,
    sessionId: string,
    documents: Array<{
      type: string;
      filename: string;
      content: string; // Base64 encoded
      mimeType: string;
    }>
  ): Promise<VerificationRecord> {
    const session = system.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Verification session not found');
    }

    const verificationRecord: VerificationRecord = {
      id: crypto.randomUUID(),
      beneficiaryId: session.beneficiaryId,
      sessionId: session.id,
      type: 'document',
      method: 'manual_review', // Default to manual review for document verification
      status: 'pending',
      level: 'basic',
      startedAt: new Date().toISOString(),
      results: [],
      documents: [],
      confidence: 0,
      riskScore: 50,
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action: 'document_verification_started',
        details: { documentCount: documents.length }
      }]
    };

    // Process each document
    for (const doc of documents) {
      const verificationDocument: VerificationDocument = {
        id: crypto.randomUUID(),
        type: doc.type as any,
        filename: doc.filename,
        uploadedAt: new Date().toISOString(),
        encryptedContent: await this.encryptDocument(doc.content),
        metadata: {
          size: doc.content.length,
          mimeType: doc.mimeType,
          checksum: this.calculateChecksum(doc.content)
        }
      };

      // Basic document validation
      const validationResults = await this.validateDocument(verificationDocument);
      verificationDocument.verificationResults = validationResults;

      verificationRecord.documents.push(verificationDocument);
    }

    // Set initial status based on document validation
    const allDocumentsValid = verificationRecord.documents.every(doc => 
      doc.verificationResults?.every(result => result.result === 'passed')
    );

    if (allDocumentsValid) {
      verificationRecord.status = 'requires_manual_review';
      verificationRecord.confidence = 70; // Medium confidence for valid documents
    } else {
      verificationRecord.status = 'failed';
      verificationRecord.confidence = 30; // Low confidence for invalid documents
      verificationRecord.completedAt = new Date().toISOString();
    }

    system.verifications.push(verificationRecord);
    session.verifications.push(verificationRecord.id);
    session.lastActivityAt = new Date().toISOString();

    return verificationRecord;
  }

  /**
   * Perform geographic verification
   */
  async performGeographicVerification(
    system: BeneficiaryVerificationSystem,
    sessionId: string,
    ipAddress: string,
    deviceInfo?: Partial<DeviceInfo>
  ): Promise<VerificationRecord> {
    const session = system.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Verification session not found');
    }

    const verificationRecord: VerificationRecord = {
      id: crypto.randomUUID(),
      beneficiaryId: session.beneficiaryId,
      sessionId: session.id,
      type: 'geographic',
      method: 'ip_geolocation',
      status: 'in_progress',
      level: 'basic',
      startedAt: new Date().toISOString(),
      results: [],
      documents: [],
      confidence: 0,
      riskScore: 50,
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action: 'geographic_verification_started',
        details: { ipAddress: this.maskIpAddress(ipAddress) }
      }]
    };

    try {
      // Perform IP geolocation lookup
      const geolocationData = await this.performIpGeolocation(ipAddress);
      verificationRecord.geolocation = geolocationData;

      // Capture device information
      if (deviceInfo) {
        verificationRecord.deviceInfo = {
          fingerprint: deviceInfo.fingerprint || this.generateDeviceFingerprint(deviceInfo),
          userAgent: deviceInfo.userAgent || 'Unknown',
          platform: deviceInfo.platform || 'Unknown',
          screenResolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone,
          language: deviceInfo.language,
          plugins: deviceInfo.plugins,
          isBot: deviceInfo.isBot || false,
          riskScore: this.calculateDeviceRiskScore(deviceInfo),
          lastSeen: new Date().toISOString()
        };
      }

      // Calculate confidence and risk scores
      const confidence = this.calculateGeographicConfidence(geolocationData, verificationRecord.deviceInfo);
      const riskScore = this.calculateGeographicRiskScore(geolocationData, verificationRecord.deviceInfo);

      verificationRecord.confidence = confidence;
      verificationRecord.riskScore = riskScore;

      const result: VerificationResult = {
        method: 'ip_geolocation',
        status: confidence >= 70 ? 'passed' : confidence >= 40 ? 'inconclusive' : 'failed',
        confidence,
        details: {
          country: geolocationData.country,
          region: geolocationData.region,
          city: geolocationData.city,
          isVpn: geolocationData.isVpn,
          isProxy: geolocationData.isProxy,
          riskScore: geolocationData.riskScore
        },
        timestamp: new Date().toISOString()
      };

      verificationRecord.results.push(result);

      if (result.status === 'passed') {
        verificationRecord.status = 'completed';
        verificationRecord.completedAt = new Date().toISOString();
      } else if (result.status === 'failed') {
        verificationRecord.status = 'failed';
        verificationRecord.completedAt = new Date().toISOString();
      } else {
        verificationRecord.status = 'requires_manual_review';
      }

    } catch (error) {
      verificationRecord.status = 'failed';
      verificationRecord.completedAt = new Date().toISOString();
      verificationRecord.results.push({
        method: 'ip_geolocation',
        status: 'failed',
        confidence: 0,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }

    system.verifications.push(verificationRecord);
    session.verifications.push(verificationRecord.id);
    session.lastActivityAt = new Date().toISOString();

    return verificationRecord;
  }

  /**
   * Perform manual verification by administrator
   */
  async performManualVerification(
    system: BeneficiaryVerificationSystem,
    verificationId: string,
    reviewerId: string,
    decision: 'approve' | 'reject',
    notes?: string,
    confidenceOverride?: number
  ): Promise<VerificationRecord> {
    const verification = system.verifications.find(v => v.id === verificationId);
    if (!verification) {
      throw new Error('Verification record not found');
    }

    if (verification.status !== 'requires_manual_review' && verification.status !== 'pending') {
      throw new Error('Verification is not in a state that allows manual review');
    }

    const manualResult: VerificationResult = {
      method: 'manual_review',
      status: decision === 'approve' ? 'passed' : 'failed',
      confidence: confidenceOverride || (decision === 'approve' ? 95 : 5),
      details: {
        reviewerId,
        decision,
        notes,
        reviewedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    verification.results.push(manualResult);
    verification.confidence = manualResult.confidence;
    verification.status = decision === 'approve' ? 'completed' : 'rejected';
    verification.completedAt = new Date().toISOString();
    verification.verifiedBy = reviewerId;
    verification.notes = notes;

    verification.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'manual_verification_completed',
      details: { decision, reviewerId, notes },
      performedBy: reviewerId
    });

    await auditLoggingService.logEvent({
      eventType: 'authorization',
      action: 'manual_verification_review',
      resource: 'verification_record',
      resourceId: verification.id,
      result: decision === 'approve' ? 'success' : 'blocked',
      details: {
        beneficiaryId: verification.beneficiaryId,
        decision,
        confidence: verification.confidence,
        notes
      },
      riskLevel: 'medium',
      userId: reviewerId
    });

    return verification;
  }

  // Private helper methods

  private createDefaultWorkflows(): VerificationWorkflow[] {
    return [
      {
        id: 'basic_identity',
        name: 'Basic Identity Verification',
        description: 'Basic identity verification using government ID',
        steps: [
          {
            id: 'step_1',
            name: 'Government ID Verification',
            type: 'identity',
            methods: ['government_id', 'passport', 'drivers_license'],
            required: true,
            order: 1
          }
        ],
        requiredLevel: 'basic',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'enhanced_verification',
        name: 'Enhanced Verification',
        description: 'Enhanced verification with multiple methods',
        steps: [
          {
            id: 'step_1',
            name: 'Government ID Verification',
            type: 'identity',
            methods: ['government_id', 'passport'],
            required: true,
            order: 1
          },
          {
            id: 'step_2',
            name: 'Document Verification',
            type: 'document',
            methods: ['utility_bill', 'bank_statement'],
            required: true,
            order: 2
          },
          {
            id: 'step_3',
            name: 'Biometric Verification',
            type: 'biometric',
            methods: ['facial_recognition', 'liveness_check'],
            required: false,
            order: 3
          }
        ],
        requiredLevel: 'enhanced',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  private createDefaultSettings() {
    return {
      sessionExpiryHours: 24,
      verificationExpiryDays: 90,
      maxRetryAttempts: 3,
      minConfidenceScore: 70,
      enableAutomaticRetry: true,
      enableManualReview: true,
      manualReviewThreshold: 60,
      enableWebhooks: false,
      enableAuditLogging: true,
      retentionPolicy: {
        keepVerificationRecords: 365,
        keepDocuments: 90,
        keepBiometrics: 30,
        keepSessions: 30
      },
      notifications: {
        onSuccess: true,
        onFailure: true,
        onManualReview: true,
        onExpiry: true,
        recipients: []
      }
    };
  }

  private mapMethodToDocumentType(method: VerificationMethod): string {
    const mapping: Record<string, string> = {
      'government_id': 'government_id',
      'passport': 'passport',
      'drivers_license': 'drivers_license',
      'death_certificate': 'death_certificate',
      'power_of_attorney': 'power_of_attorney',
      'court_order': 'court_order'
    };
    return mapping[method] || 'other';
  }

  private async encryptDocument(content: string): Promise<string> {
    // In a real implementation, this would use proper encryption
    return Buffer.from(content).toString('base64');
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async submitToProvider(
    provider: VerificationProvider,
    verification: VerificationRecord,
    documentData: any,
    options?: any
  ): Promise<VerificationResult> {
    // This would integrate with actual third-party verification services
    // For now, return a mock result
    const confidence = Math.floor(Math.random() * 40) + 60; // 60-100
    const status = confidence >= 70 ? 'passed' : confidence >= 40 ? 'inconclusive' : 'failed';

    return {
      method: verification.method,
      status,
      confidence,
      details: {
        provider: provider.name,
        mockResult: true,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      provider: provider.id,
      externalId: `mock_${crypto.randomUUID()}`
    };
  }

  private calculateRiskScore(result: VerificationResult): number {
    // Calculate risk score based on verification result
    if (result.status === 'passed' && result.confidence >= 90) return 10;
    if (result.status === 'passed' && result.confidence >= 70) return 20;
    if (result.status === 'inconclusive') return 50;
    if (result.status === 'failed') return 90;
    return 50;
  }

  private async validateDocument(document: VerificationDocument): Promise<DocumentVerificationResult[]> {
    // Basic document validation
    const results: DocumentVerificationResult[] = [];

    // Format validation
    results.push({
      check: 'format',
      result: document.metadata.mimeType.includes('image') || document.metadata.mimeType === 'application/pdf' ? 'passed' : 'failed',
      confidence: 100,
      details: `MIME type: ${document.metadata.mimeType}`
    });

    // Quality validation
    results.push({
      check: 'quality',
      result: document.metadata.size > 50000 ? 'passed' : 'warning',
      confidence: document.metadata.size > 50000 ? 90 : 60,
      details: `File size: ${document.metadata.size} bytes`
    });

    return results;
  }

  private async performIpGeolocation(ipAddress: string): Promise<GeolocationData> {
    // This would integrate with IP geolocation services like MaxMind, IPinfo, etc.
    // For now, return mock data
    return {
      ipAddress,
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      isp: 'Unknown ISP',
      isVpn: false,
      isProxy: false,
      riskScore: Math.floor(Math.random() * 50), // 0-50 for mock
      timestamp: new Date().toISOString()
    };
  }

  private generateDeviceFingerprint(deviceInfo?: Partial<DeviceInfo>): string {
    const data = JSON.stringify({
      userAgent: deviceInfo?.userAgent,
      platform: deviceInfo?.platform,
      screenResolution: deviceInfo?.screenResolution,
      timezone: deviceInfo?.timezone,
      language: deviceInfo?.language
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private calculateDeviceRiskScore(deviceInfo?: Partial<DeviceInfo>): number {
    let riskScore = 0;
    
    if (deviceInfo?.isBot) riskScore += 50;
    if (!deviceInfo?.userAgent) riskScore += 20;
    if (!deviceInfo?.platform) riskScore += 10;
    
    return Math.min(riskScore, 100);
  }

  private calculateGeographicConfidence(geolocation: GeolocationData, deviceInfo?: DeviceInfo): number {
    let confidence = 50; // Base confidence
    
    if (geolocation.country && geolocation.country !== 'Unknown') confidence += 20;
    if (geolocation.region && geolocation.region !== 'Unknown') confidence += 10;
    if (geolocation.city && geolocation.city !== 'Unknown') confidence += 10;
    if (!geolocation.isVpn) confidence += 10;
    if (!geolocation.isProxy) confidence += 10;
    if (deviceInfo && !deviceInfo.isBot) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  private calculateGeographicRiskScore(geolocation: GeolocationData, deviceInfo?: DeviceInfo): number {
    let riskScore = 0;
    
    if (geolocation.isVpn) riskScore += 30;
    if (geolocation.isProxy) riskScore += 40;
    if (deviceInfo?.isBot) riskScore += 50;
    if (geolocation.riskScore) riskScore += geolocation.riskScore;
    if (deviceInfo?.riskScore) riskScore += deviceInfo.riskScore;
    
    return Math.min(riskScore, 100);
  }

  private maskIpAddress(ipAddress: string): string {
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }

  private async ensureDataDirectory(): Promise<void> {
    if (typeof window !== 'undefined') {
      return;
    }
    
    try {
      const { access, mkdir } = await import('fs/promises');
      await access(this.dataDirectory);
    } catch {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.dataDirectory, { recursive: true });
    }
  }
}

// Export singleton instance
export const verificationService = VerificationService.getInstance();