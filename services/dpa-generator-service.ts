'use client'

export interface DPAConfig {
  dataController: CompanyInfo
  dataProcessor: CompanyInfo
  processingDetails: ProcessingDetails
  dataTypes: string[]
  purposes: string[]
  subProcessors: SubProcessor[]
  technicalMeasures: TechnicalMeasure[]
  organizationalMeasures: string[]
  transferMechanisms: TransferMechanism[]
  auditRights: AuditRights
  liabilityTerms: LiabilityTerms
  effectiveDate: Date
  duration: string
}

export interface CompanyInfo {
  name: string
  legalName: string
  address: string
  country: string
  registrationNumber?: string
  dataProtectionOfficer?: {
    name: string
    email: string
    phone?: string
  }
}

export interface ProcessingDetails {
  nature: string[]
  scope: string[]
  context: string[]
  purposes: string[]
  duration: string
  retention: string
}

export interface SubProcessor {
  name: string
  location: string
  services: string
  safeguards: string[]
}

export interface TechnicalMeasure {
  category: string
  measures: string[]
}

export interface TransferMechanism {
  type: 'scc' | 'bcr' | 'adequacy' | 'derogation'
  details: string
  countries: string[]
}

export interface AuditRights {
  frequency: string
  notice: string
  scope: string[]
  costs: string
}

export interface LiabilityTerms {
  limitations: string[]
  indemnification: string
  insurance: string
}

class DPAGeneratorService {
  /**
   * Generate Data Processing Agreement
   */
  generateDPA(config: DPAConfig): string {
    const sections: string[] = []

    // Header
    sections.push(this.generateHeader(config))

    // Parties
    sections.push(this.generatePartiesSection(config))

    // Recitals
    sections.push(this.generateRecitalsSection(config))

    // Definitions
    sections.push(this.generateDefinitionsSection())

    // Subject Matter and Duration
    sections.push(this.generateSubjectMatterSection(config))

    // Nature and Purpose
    sections.push(this.generateNaturePurposeSection(config))

    // Processor Obligations
    sections.push(this.generateProcessorObligationsSection(config))

    // Controller Obligations
    sections.push(this.generateControllerObligationsSection(config))

    // Security Measures
    sections.push(this.generateSecurityMeasuresSection(config))

    // Sub-processors
    sections.push(this.generateSubProcessorsSection(config))

    // Data Subject Rights
    sections.push(this.generateDataSubjectRightsSection(config))

    // International Transfers
    sections.push(this.generateInternationalTransfersSection(config))

    // Audit Rights
    sections.push(this.generateAuditRightsSection(config))

    // Data Breach
    sections.push(this.generateDataBreachSection(config))

    // Liability and Indemnification
    sections.push(this.generateLiabilitySection(config))

    // Termination
    sections.push(this.generateTerminationSection(config))

    // General Provisions
    sections.push(this.generateGeneralProvisionsSection(config))

    // Signatures
    sections.push(this.generateSignatureSection(config))

    // Annexes
    sections.push(this.generateAnnexesSection(config))

    return sections.join('\n\n')
  }

  private generateHeader(config: DPAConfig): string {
    return `# DATA PROCESSING AGREEMENT

**Effective Date:** ${config.effectiveDate.toLocaleDateString()}

This Data Processing Agreement ("**DPA**") forms part of the Agreement for the provision of services between:

**Data Controller:** ${config.dataController.legalName}  
**Data Processor:** ${config.dataProcessor.legalName}

(each a "**Party**" and together the "**Parties**")`
  }

  private generatePartiesSection(config: DPAConfig): string {
    return `## 1. PARTIES

### 1.1 Data Controller
**${config.dataController.legalName}**  
${config.dataController.address}  
${config.dataController.country}  
${config.dataController.registrationNumber ? `Registration Number: ${config.dataController.registrationNumber}` : ''}

${config.dataController.dataProtectionOfficer ? `
**Data Protection Officer:**  
${config.dataController.dataProtectionOfficer.name}  
Email: ${config.dataController.dataProtectionOfficer.email}  
${config.dataController.dataProtectionOfficer.phone ? `Phone: ${config.dataController.dataProtectionOfficer.phone}` : ''}
` : ''}

### 1.2 Data Processor
**${config.dataProcessor.legalName}**  
${config.dataProcessor.address}  
${config.dataProcessor.country}  
${config.dataProcessor.registrationNumber ? `Registration Number: ${config.dataProcessor.registrationNumber}` : ''}

${config.dataProcessor.dataProtectionOfficer ? `
**Data Protection Officer:**  
${config.dataProcessor.dataProtectionOfficer.name}  
Email: ${config.dataProcessor.dataProtectionOfficer.email}  
${config.dataProcessor.dataProtectionOfficer.phone ? `Phone: ${config.dataProcessor.dataProtectionOfficer.phone}` : ''}
` : ''}`
  }

  private generateRecitalsSection(config: DPAConfig): string {
    return `## 2. RECITALS

WHEREAS:

A. The Controller and Processor have entered into an agreement for the provision of services (the "**Principal Agreement**");

B. The Controller wishes to engage the Processor to process certain Personal Data on behalf of the Controller;

C. The Parties agree to comply with applicable Data Protection Laws, including but not limited to:
   - The General Data Protection Regulation (EU) 2016/679 ("**GDPR**")
   - The California Consumer Privacy Act ("**CCPA**")
   - Other applicable data protection and privacy laws

D. This DPA is intended to ensure that the Processing complies with applicable Data Protection Laws;

NOW, THEREFORE, the Parties agree as follows:`
  }

  private generateDefinitionsSection(): string {
    return `## 3. DEFINITIONS

In this DPA:

- "**Data Protection Laws**" means all applicable laws and regulations relating to the processing of Personal Data and privacy.

- "**Personal Data**" means any information relating to an identified or identifiable natural person.

- "**Processing**" means any operation performed on Personal Data, including collection, recording, storage, alteration, retrieval, consultation, use, disclosure, restriction, erasure, or destruction.

- "**Data Subject**" means the individual to whom Personal Data relates.

- "**Controller**" means the entity that determines the purposes and means of Processing Personal Data.

- "**Processor**" means the entity that Processes Personal Data on behalf of the Controller.

- "**Sub-processor**" means any third party engaged by the Processor to Process Personal Data.

- "**Security Incident**" means any breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Personal Data.`
  }

  private generateSubjectMatterSection(config: DPAConfig): string {
    return `## 4. SUBJECT MATTER AND DURATION

### 4.1 Subject Matter
The subject matter of the Processing under this DPA is the Personal Data processed in connection with the provision of services under the Principal Agreement.

### 4.2 Duration
This DPA shall remain in effect for ${config.duration} or as long as the Processor processes Personal Data on behalf of the Controller, whichever is longer.

### 4.3 Nature of Processing
${config.processingDetails.nature.map(n => `- ${n}`).join('\n')}

### 4.4 Scope of Processing
${config.processingDetails.scope.map(s => `- ${s}`).join('\n')}`
  }

  private generateNaturePurposeSection(config: DPAConfig): string {
    return `## 5. NATURE AND PURPOSE OF PROCESSING

### 5.1 Purpose
The Processor shall Process Personal Data only for the following purposes:
${config.purposes.map(p => `- ${p}`).join('\n')}

### 5.2 Categories of Data
The Processing concerns the following categories of Personal Data:
${config.dataTypes.map(d => `- ${d}`).join('\n')}

### 5.3 Categories of Data Subjects
The Personal Data relates to the following categories of Data Subjects:
- Employees of the Controller
- Customers of the Controller
- Suppliers of the Controller
- Other: As specified in Annex 1`
  }

  private generateProcessorObligationsSection(config: DPAConfig): string {
    return `## 6. PROCESSOR OBLIGATIONS

The Processor shall:

### 6.1 Lawful Instructions
Process Personal Data only on documented instructions from the Controller, unless required by law.

### 6.2 Confidentiality
Ensure that persons authorized to process Personal Data have committed themselves to confidentiality or are under statutory obligation of confidentiality.

### 6.3 Security
Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk.

### 6.4 Sub-processors
Not engage another processor without prior specific or general written authorization of the Controller.

### 6.5 Data Subject Rights
Assist the Controller in responding to requests for exercising Data Subject rights.

### 6.6 Compliance Assistance
Assist the Controller in ensuring compliance with security, breach notification, impact assessments, and prior consultation obligations.

### 6.7 Deletion or Return
At the Controller's choice, delete or return all Personal Data after the end of the provision of services.

### 6.8 Audit
Make available to the Controller all information necessary to demonstrate compliance and allow for audits.`
  }

  private generateControllerObligationsSection(config: DPAConfig): string {
    return `## 7. CONTROLLER OBLIGATIONS

The Controller shall:

### 7.1 Lawful Basis
Ensure that it has a lawful basis for the Processing and has provided all necessary notices to Data Subjects.

### 7.2 Instructions
Provide clear, documented instructions for Processing Personal Data.

### 7.3 Compliance
Comply with all applicable Data Protection Laws in respect of its Processing of Personal Data.

### 7.4 Accuracy
Ensure that Personal Data provided to the Processor is accurate and up to date.`
  }

  private generateSecurityMeasuresSection(config: DPAConfig): string {
    let section = `## 8. SECURITY MEASURES

The Processor shall implement and maintain the following security measures:

### 8.1 Technical Measures`

    config.technicalMeasures.forEach(tm => {
      section += `\n\n**${tm.category}:**\n${tm.measures.map(m => `- ${m}`).join('\n')}`
    })

    section += `\n\n### 8.2 Organizational Measures\n${config.organizationalMeasures.map(m => `- ${m}`).join('\n')}`

    return section
  }

  private generateSubProcessorsSection(config: DPAConfig): string {
    let section = `## 9. SUB-PROCESSORS

### 9.1 Authorized Sub-processors
The Controller authorizes the use of the following Sub-processors:`

    if (config.subProcessors.length > 0) {
      config.subProcessors.forEach(sp => {
        section += `\n\n**${sp.name}**  
Location: ${sp.location}  
Services: ${sp.services}  
Safeguards: ${sp.safeguards.join(', ')}`
      })
    } else {
      section += '\n\nNo Sub-processors currently authorized.'
    }

    section += `\n\n### 9.2 New Sub-processors
The Processor shall notify the Controller of any intended changes concerning the addition or replacement of Sub-processors at least 30 days in advance.`

    return section
  }

  private generateDataSubjectRightsSection(config: DPAConfig): string {
    return `## 10. DATA SUBJECT RIGHTS

### 10.1 Assistance
The Processor shall assist the Controller in fulfilling its obligations to respond to Data Subject requests, including:
- Access requests
- Rectification requests
- Erasure requests
- Data portability requests
- Restriction of processing requests
- Objection to processing

### 10.2 Procedure
Upon receiving a Data Subject request, the Processor shall:
1. Promptly notify the Controller
2. Not respond directly unless authorized by the Controller
3. Provide reasonable assistance as requested by the Controller`
  }

  private generateInternationalTransfersSection(config: DPAConfig): string {
    let section = `## 11. INTERNATIONAL DATA TRANSFERS

### 11.1 Transfer Restrictions
The Processor shall not transfer Personal Data outside the EEA without the Controller's prior written consent.`

    if (config.transferMechanisms.length > 0) {
      section += '\n\n### 11.2 Transfer Mechanisms\nWhere transfers are authorized, the following mechanisms apply:\n\n'
      
      config.transferMechanisms.forEach(tm => {
        const typeMap = {
          scc: 'Standard Contractual Clauses',
          bcr: 'Binding Corporate Rules',
          adequacy: 'Adequacy Decision',
          derogation: 'Specific Derogation'
        }
        
        section += `**${typeMap[tm.type]}**  
Countries: ${tm.countries.join(', ')}  
Details: ${tm.details}\n\n`
      })
    }

    return section
  }

  private generateAuditRightsSection(config: DPAConfig): string {
    return `## 12. AUDIT RIGHTS

### 12.1 Right to Audit
The Controller shall have the right to conduct audits to verify the Processor's compliance with this DPA.

### 12.2 Audit Procedure
- **Frequency:** ${config.auditRights.frequency}
- **Notice:** ${config.auditRights.notice}
- **Scope:** ${config.auditRights.scope.join(', ')}
- **Costs:** ${config.auditRights.costs}

### 12.3 Cooperation
The Processor shall cooperate fully with any audit and provide access to relevant facilities, systems, and documentation.`
  }

  private generateDataBreachSection(config: DPAConfig): string {
    return `## 13. DATA BREACH NOTIFICATION

### 13.1 Notification Obligation
The Processor shall notify the Controller without undue delay and in any event within 24 hours after becoming aware of a Security Incident.

### 13.2 Notification Content
The notification shall include:
- Nature of the Security Incident
- Categories and approximate number of Data Subjects affected
- Categories and approximate number of Personal Data records affected
- Likely consequences of the Security Incident
- Measures taken or proposed to address the Security Incident

### 13.3 Cooperation
The Processor shall cooperate with the Controller and take reasonable steps as directed by the Controller to assist in the investigation, mitigation, and remediation of each Security Incident.`
  }

  private generateLiabilitySection(config: DPAConfig): string {
    return `## 14. LIABILITY AND INDEMNIFICATION

### 14.1 Liability Limitations
${config.liabilityTerms.limitations.map(l => `- ${l}`).join('\n')}

### 14.2 Indemnification
${config.liabilityTerms.indemnification}

### 14.3 Insurance
${config.liabilityTerms.insurance}`
  }

  private generateTerminationSection(config: DPAConfig): string {
    return `## 15. TERMINATION

### 15.1 Term
This DPA shall continue in effect until termination of the Principal Agreement or completion of Processing, whichever is later.

### 15.2 Obligations on Termination
Upon termination, the Processor shall, at the Controller's option:
- Return all Personal Data to the Controller
- Delete all Personal Data and certify such deletion
- Continue to protect Personal Data in accordance with this DPA

### 15.3 Retention
The Processor may retain Personal Data only to the extent required by applicable law and shall continue to ensure its confidentiality.`
  }

  private generateGeneralProvisionsSection(config: DPAConfig): string {
    return `## 16. GENERAL PROVISIONS

### 16.1 Entire Agreement
This DPA and the Principal Agreement constitute the entire agreement between the Parties relating to Processing of Personal Data.

### 16.2 Modification
This DPA may only be modified by written agreement of both Parties.

### 16.3 Severability
If any provision of this DPA is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.

### 16.4 Governing Law
This DPA shall be governed by the laws of ${config.dataController.country}.

### 16.5 Order of Precedence
In case of conflict, this DPA shall take precedence over the Principal Agreement with respect to Processing of Personal Data.`
  }

  private generateSignatureSection(config: DPAConfig): string {
    return `## 17. SIGNATURES

**FOR THE CONTROLLER:**

_________________________________  
Name:  
Title:  
Date:  

**FOR THE PROCESSOR:**

_________________________________  
Name:  
Title:  
Date:`
  }

  private generateAnnexesSection(config: DPAConfig): string {
    return `## ANNEX 1: PROCESSING DETAILS

### A. List of Parties
**Data Controller(s):** ${config.dataController.legalName}  
**Data Processor(s):** ${config.dataProcessor.legalName}

### B. Description of Processing
**Nature and Purpose:**  
${config.processingDetails.nature.join('\n')}

**Duration:**  
${config.processingDetails.duration}

**Categories of Data Subjects:**  
As specified in Section 5.3

### C. Categories of Personal Data
${config.dataTypes.map(dt => `- ${dt}`).join('\n')}

### D. Retention Period
${config.processingDetails.retention}

## ANNEX 2: TECHNICAL AND ORGANIZATIONAL MEASURES

As specified in Section 8 of this DPA.

## ANNEX 3: LIST OF SUB-PROCESSORS

As specified in Section 9 of this DPA.`
  }

  /**
   * Generate Standard Contractual Clauses
   */
  generateSCC(config: DPAConfig): string {
    return `# STANDARD CONTRACTUAL CLAUSES

## Module Two: Controller to Processor

${this.generateHeader(config)}

### Clause 1: Purpose and Scope
These Clauses set out the requirements for transfers of personal data from a controller to a processor.

### Clause 2: Invariability of the Clauses
The Clauses may not be modified, except to add information in the Annexes.

### Clause 3: Third-party beneficiaries
Data subjects may invoke and enforce these Clauses as third-party beneficiaries.

[Additional standard clauses would follow based on the official EU SCC template]`
  }
}

// Singleton instance
export const dpaGeneratorService = new DPAGeneratorService()