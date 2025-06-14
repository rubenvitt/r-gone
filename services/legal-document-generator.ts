'use client'

export interface CompanyInfo {
  name: string
  legalName: string
  address: string
  email: string
  website: string
  dataProtectionOfficer?: {
    name: string
    email: string
    phone?: string
  }
}

export interface DataCollection {
  personalData: string[]
  usageData: string[]
  technicalData: string[]
  marketingData: string[]
  sensitiveData: string[]
}

export interface DataUsage {
  purposes: string[]
  legalBases: string[]
  retention: Record<string, string>
  sharing: {
    serviceProviders: string[]
    businessPartners: string[]
    legalRequirements: boolean
  }
}

export interface UserRights {
  access: boolean
  rectification: boolean
  erasure: boolean
  portability: boolean
  restriction: boolean
  objection: boolean
  automatedDecision: boolean
}

export interface PolicyConfig {
  companyInfo: CompanyInfo
  dataCollection: DataCollection
  dataUsage: DataUsage
  userRights: UserRights
  internationalTransfers: boolean
  cookiePolicy: boolean
  childrenPrivacy: boolean
  californiaRights: boolean
  lastUpdated: Date
  effectiveDate: Date
}

export interface TermsConfig {
  companyInfo: CompanyInfo
  serviceDescription: string
  acceptanceTerms: string
  userObligations: string[]
  prohibitedUses: string[]
  intellectualProperty: string
  disclaimers: string[]
  limitationOfLiability: string
  indemnification: boolean
  termination: string
  governingLaw: string
  disputeResolution: string
  lastUpdated: Date
  effectiveDate: Date
}

class LegalDocumentGenerator {
  /**
   * Generate privacy policy
   */
  generatePrivacyPolicy(config: PolicyConfig): string {
    const sections: string[] = []

    // Header
    sections.push(this.generatePolicyHeader(config))

    // Introduction
    sections.push(this.generatePolicyIntroduction(config))

    // Information we collect
    sections.push(this.generateDataCollectionSection(config))

    // How we use information
    sections.push(this.generateDataUsageSection(config))

    // Legal bases (GDPR)
    sections.push(this.generateLegalBasesSection(config))

    // Data sharing
    sections.push(this.generateDataSharingSection(config))

    // Data retention
    sections.push(this.generateDataRetentionSection(config))

    // User rights
    sections.push(this.generateUserRightsSection(config))

    // International transfers
    if (config.internationalTransfers) {
      sections.push(this.generateInternationalTransfersSection(config))
    }

    // Cookies
    if (config.cookiePolicy) {
      sections.push(this.generateCookieSection(config))
    }

    // Children's privacy
    if (config.childrenPrivacy) {
      sections.push(this.generateChildrenPrivacySection(config))
    }

    // California rights (CCPA)
    if (config.californiaRights) {
      sections.push(this.generateCaliforniaRightsSection(config))
    }

    // Security
    sections.push(this.generateSecuritySection(config))

    // Changes to policy
    sections.push(this.generateChangesSection(config))

    // Contact information
    sections.push(this.generateContactSection(config))

    return sections.join('\n\n')
  }

  /**
   * Generate terms of service
   */
  generateTermsOfService(config: TermsConfig): string {
    const sections: string[] = []

    // Header
    sections.push(this.generateTermsHeader(config))

    // Acceptance
    sections.push(this.generateAcceptanceSection(config))

    // Service description
    sections.push(this.generateServiceDescriptionSection(config))

    // User accounts
    sections.push(this.generateUserAccountsSection(config))

    // User obligations
    sections.push(this.generateUserObligationsSection(config))

    // Prohibited uses
    sections.push(this.generateProhibitedUsesSection(config))

    // Intellectual property
    sections.push(this.generateIntellectualPropertySection(config))

    // Privacy
    sections.push(this.generatePrivacyReferenceSection(config))

    // Disclaimers
    sections.push(this.generateDisclaimersSection(config))

    // Limitation of liability
    sections.push(this.generateLimitationOfLiabilitySection(config))

    // Indemnification
    if (config.indemnification) {
      sections.push(this.generateIndemnificationSection(config))
    }

    // Termination
    sections.push(this.generateTerminationSection(config))

    // Governing law
    sections.push(this.generateGoverningLawSection(config))

    // Dispute resolution
    sections.push(this.generateDisputeResolutionSection(config))

    // General provisions
    sections.push(this.generateGeneralProvisionsSection(config))

    // Contact
    sections.push(this.generateTermsContactSection(config))

    return sections.join('\n\n')
  }

  /**
   * Privacy Policy Sections
   */
  private generatePolicyHeader(config: PolicyConfig): string {
    return `# Privacy Policy

**Last Updated:** ${config.lastUpdated.toLocaleDateString()}  
**Effective Date:** ${config.effectiveDate.toLocaleDateString()}

${config.companyInfo.name} ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.`
  }

  private generatePolicyIntroduction(config: PolicyConfig): string {
    return `## 1. Introduction

This Privacy Policy applies to information we collect through our website ${config.companyInfo.website} and related services (collectively, the "Service"). By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy.`
  }

  private generateDataCollectionSection(config: PolicyConfig): string {
    let section = `## 2. Information We Collect

We collect several types of information from and about users of our Service:\n\n`

    if (config.dataCollection.personalData.length > 0) {
      section += `### Personal Data
Information that can be used to identify you, including:
${config.dataCollection.personalData.map(item => `- ${item}`).join('\n')}\n\n`
    }

    if (config.dataCollection.usageData.length > 0) {
      section += `### Usage Data
Information about how you interact with our Service:
${config.dataCollection.usageData.map(item => `- ${item}`).join('\n')}\n\n`
    }

    if (config.dataCollection.technicalData.length > 0) {
      section += `### Technical Data
Automatically collected technical information:
${config.dataCollection.technicalData.map(item => `- ${item}`).join('\n')}\n\n`
    }

    if (config.dataCollection.sensitiveData.length > 0) {
      section += `### Sensitive Data
With your explicit consent, we may collect:
${config.dataCollection.sensitiveData.map(item => `- ${item}`).join('\n')}`
    }

    return section
  }

  private generateDataUsageSection(config: PolicyConfig): string {
    return `## 3. How We Use Your Information

We use the information we collect for the following purposes:

${config.dataUsage.purposes.map(purpose => `- ${purpose}`).join('\n')}`
  }

  private generateLegalBasesSection(config: PolicyConfig): string {
    return `## 4. Legal Bases for Processing (GDPR)

We process your personal data under the following legal bases:

${config.dataUsage.legalBases.map(basis => `- ${basis}`).join('\n')}`
  }

  private generateDataSharingSection(config: PolicyConfig): string {
    let section = `## 5. How We Share Your Information

We may share your information in the following situations:\n\n`

    if (config.dataUsage.sharing.serviceProviders.length > 0) {
      section += `### Service Providers
We share data with third-party vendors who perform services on our behalf:
${config.dataUsage.sharing.serviceProviders.map(provider => `- ${provider}`).join('\n')}\n\n`
    }

    if (config.dataUsage.sharing.businessPartners.length > 0) {
      section += `### Business Partners
With your consent, we may share information with:
${config.dataUsage.sharing.businessPartners.map(partner => `- ${partner}`).join('\n')}\n\n`
    }

    if (config.dataUsage.sharing.legalRequirements) {
      section += `### Legal Requirements
We may disclose your information if required by law or in response to valid legal requests.`
    }

    return section
  }

  private generateDataRetentionSection(config: PolicyConfig): string {
    let section = `## 6. Data Retention

We retain your information for as long as necessary to fulfill the purposes outlined in this Privacy Policy:\n\n`

    for (const [dataType, retention] of Object.entries(config.dataUsage.retention)) {
      section += `- **${dataType}**: ${retention}\n`
    }

    return section
  }

  private generateUserRightsSection(config: PolicyConfig): string {
    let section = `## 7. Your Rights

Depending on your location, you may have the following rights regarding your personal data:\n\n`

    const rights = []
    if (config.userRights.access) rights.push('**Right to Access**: Request copies of your personal data')
    if (config.userRights.rectification) rights.push('**Right to Rectification**: Request correction of inaccurate data')
    if (config.userRights.erasure) rights.push('**Right to Erasure**: Request deletion of your data')
    if (config.userRights.portability) rights.push('**Right to Data Portability**: Receive your data in a structured format')
    if (config.userRights.restriction) rights.push('**Right to Restrict Processing**: Request limited processing of your data')
    if (config.userRights.objection) rights.push('**Right to Object**: Object to certain types of processing')
    if (config.userRights.automatedDecision) rights.push('**Rights Related to Automated Decision-Making**: Not be subject to solely automated decisions')

    section += rights.map(right => `- ${right}`).join('\n')

    section += `\n\nTo exercise these rights, please contact us at ${config.companyInfo.email}.`

    return section
  }

  private generateInternationalTransfersSection(config: PolicyConfig): string {
    return `## 8. International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your country.

We take appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy, including:
- Standard contractual clauses approved by the European Commission
- Ensuring recipients are Privacy Shield certified (where applicable)
- Other legally recognized safeguards`
  }

  private generateCookieSection(config: PolicyConfig): string {
    return `## 9. Cookies and Tracking Technologies

We use cookies and similar tracking technologies to track activity on our Service and store certain information.

### Types of Cookies We Use:
- **Essential Cookies**: Required for the Service to function properly
- **Functional Cookies**: Enable enhanced functionality and personalization
- **Analytics Cookies**: Help us understand how you use our Service
- **Marketing Cookies**: Used to deliver relevant advertisements

You can control cookies through your browser settings. Note that refusing cookies may limit your ability to use some features of our Service.`
  }

  private generateChildrenPrivacySection(config: PolicyConfig): string {
    return `## 10. Children's Privacy

Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.`
  }

  private generateCaliforniaRightsSection(config: PolicyConfig): string {
    return `## 11. California Privacy Rights (CCPA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

- **Right to Know**: You can request information about the personal information we collect, use, and disclose
- **Right to Delete**: You can request deletion of your personal information
- **Right to Opt-Out**: You can opt-out of the sale of your personal information
- **Right to Non-Discrimination**: We will not discriminate against you for exercising your privacy rights

To exercise these rights, please contact us at ${config.companyInfo.email} or visit our "Do Not Sell My Personal Information" page.`
  }

  private generateSecuritySection(config: PolicyConfig): string {
    return `## 12. Data Security

We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:

- Encryption of data in transit and at rest
- Regular security assessments and audits
- Access controls and authentication measures
- Employee training on data protection
- Incident response procedures

However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.`
  }

  private generateChangesSection(config: PolicyConfig): string {
    return `## 13. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy on this page
- Updating the "Last Updated" date at the top of this Privacy Policy
- Sending you an email notification (for significant changes)

You are advised to review this Privacy Policy periodically for any changes.`
  }

  private generateContactSection(config: PolicyConfig): string {
    let section = `## 14. Contact Us

If you have any questions about this Privacy Policy or our privacy practices, please contact us:

**${config.companyInfo.name}**  
${config.companyInfo.address}  
Email: ${config.companyInfo.email}  
Website: ${config.companyInfo.website}`

    if (config.companyInfo.dataProtectionOfficer) {
      section += `\n\n**Data Protection Officer**  
${config.companyInfo.dataProtectionOfficer.name}  
Email: ${config.companyInfo.dataProtectionOfficer.email}`
      if (config.companyInfo.dataProtectionOfficer.phone) {
        section += `  \nPhone: ${config.companyInfo.dataProtectionOfficer.phone}`
      }
    }

    return section
  }

  /**
   * Terms of Service Sections
   */
  private generateTermsHeader(config: TermsConfig): string {
    return `# Terms of Service

**Last Updated:** ${config.lastUpdated.toLocaleDateString()}  
**Effective Date:** ${config.effectiveDate.toLocaleDateString()}`
  }

  private generateAcceptanceSection(config: TermsConfig): string {
    return `## 1. Acceptance of Terms

${config.acceptanceTerms}

By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, then you may not access the Service.`
  }

  private generateServiceDescriptionSection(config: TermsConfig): string {
    return `## 2. Description of Service

${config.serviceDescription}`
  }

  private generateUserAccountsSection(config: TermsConfig): string {
    return `## 3. User Accounts

When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for:

- Maintaining the confidentiality of your account credentials
- All activities that occur under your account
- Notifying us immediately of any unauthorized use of your account

You may not use another person's username or account without permission.`
  }

  private generateUserObligationsSection(config: TermsConfig): string {
    return `## 4. User Obligations

By using our Service, you agree to:

${config.userObligations.map(obligation => `- ${obligation}`).join('\n')}`
  }

  private generateProhibitedUsesSection(config: TermsConfig): string {
    return `## 5. Prohibited Uses

You may not use our Service to:

${config.prohibitedUses.map(use => `- ${use}`).join('\n')}`
  }

  private generateIntellectualPropertySection(config: TermsConfig): string {
    return `## 6. Intellectual Property Rights

${config.intellectualProperty}

You retain all rights to content you submit, post, or display on or through the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such content.`
  }

  private generatePrivacyReferenceSection(config: TermsConfig): string {
    return `## 7. Privacy

Your use of our Service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.`
  }

  private generateDisclaimersSection(config: TermsConfig): string {
    return `## 8. Disclaimers

${config.disclaimers.map(disclaimer => disclaimer).join('\n\n')}`
  }

  private generateLimitationOfLiabilitySection(config: TermsConfig): string {
    return `## 9. Limitation of Liability

${config.limitationOfLiability}`
  }

  private generateIndemnificationSection(config: TermsConfig): string {
    return `## 10. Indemnification

You agree to defend, indemnify, and hold harmless ${config.companyInfo.name} and its licensees, licensors, employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees).`
  }

  private generateTerminationSection(config: TermsConfig): string {
    return `## 11. Termination

${config.termination}

Upon termination, your right to use the Service will cease immediately. All provisions of the Terms which by their nature should survive termination shall survive termination.`
  }

  private generateGoverningLawSection(config: TermsConfig): string {
    return `## 12. Governing Law

${config.governingLaw}`
  }

  private generateDisputeResolutionSection(config: TermsConfig): string {
    return `## 13. Dispute Resolution

${config.disputeResolution}`
  }

  private generateGeneralProvisionsSection(config: TermsConfig): string {
    return `## 14. General Provisions

### Entire Agreement
These Terms constitute the entire agreement between us regarding our Service and supersede and replace any prior agreements.

### Changes to Terms
We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide notice prior to any new terms taking effect.

### Severability
If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.

### Waiver
No waiver of any term of these Terms shall be deemed a further or continuing waiver of such term or any other term.`
  }

  private generateTermsContactSection(config: TermsConfig): string {
    return `## 15. Contact Information

If you have any questions about these Terms, please contact us:

**${config.companyInfo.name}**  
${config.companyInfo.address}  
Email: ${config.companyInfo.email}  
Website: ${config.companyInfo.website}`
  }
}

// Singleton instance
export const legalDocumentGenerator = new LegalDocumentGenerator()