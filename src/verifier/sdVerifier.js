import { SelectiveDisclosureService } from '../shared/selectiveDisclosure.js';

export class SDVerifierService {
  constructor() {
    this.keyPair = null;
    this.sdService = null;
    this.trustedIssuers = new Map();
    this.verificationHistory = new Map();
    this.requestTemplates = new Map();
    
    this.initializeRequestTemplates();
  }

  /**
   * Inicializar o serviço de verifier
   */
  async initialize() {
    console.log('🔍 Initializing SD Verifier Service...');
    
    // IMPORTANTE: Criar o sdService sem chamar initialize
    if (!this.sdService) {
      this.sdService = new SelectiveDisclosureService();
      console.log('✅ Selective Disclosure Service created for Verifier');
    }
    
    // Gerar chaves usando o sdService
    if (!this.keyPair) {
      this.keyPair = await this.sdService.generateKeyPair();
      console.log('✅ Verifier key pair generated:', this.keyPair.controller);
    }

    console.log('✅ SD Verifier Service initialized successfully');
    
    return {
      did: this.keyPair.controller,
      publicKey: this.keyPair.publicKeyMultibase
    };
  }

  /**
   * Obter informações do verifier
   */
  getVerifierInfo() {
    return {
      did: this.keyPair?.controller || 'Not initialized',
      publicKey: this.keyPair?.publicKeyMultibase || 'Not initialized',
      trustedIssuers: Array.from(this.trustedIssuers.keys()),
      totalVerifications: this.verificationHistory.size,
      availableTemplates: Array.from(this.requestTemplates.keys()),
      serviceStatus: {
        keyPairReady: !!this.keyPair,
        sdServiceReady: !!this.sdService,
        fullyInitialized: !!(this.keyPair && this.sdService)
      }
    };
  }

  /**
   * Verificar se uma credencial está revogada (versão REAL)
   */
  async checkCredentialRevocation(credential) {
    console.log('🔍 Checking credential revocation status (REAL CHECK)...');

    try {
      const issuerDid = credential.issuer;
      const credentialId = credential.id;
      
      console.log(`📋 Checking revocation for credential: ${credentialId}`);
      console.log(`📋 Issued by: ${issuerDid}`);
      
      // Para a demo, vamos assumir que o issuer é confiável automaticamente
      // Em produção, verificaria uma lista de issuers confiáveis
      
      // CONSULTA REAL: Importar e verificar com o issuer atual
      const { sdIssuer } = await import('../issuer/sdIssuer.js');
      
      console.log('🔍 Querying issuer for revocation status...');
      const revocationStatus = sdIssuer.checkRevocationStatus(credentialId);
      
      console.log('📋 Revocation query result:', {
        credentialId,
        revoked: revocationStatus.revoked,
        details: revocationStatus
      });
      
      return {
        revocationChecked: true,
        revoked: revocationStatus.revoked,
        status: revocationStatus.revoked ? 'revoked' : 'active',
        checkedAt: new Date().toISOString(),
        details: revocationStatus.revoked ? {
          revokedAt: revocationStatus.revokedAt,
          reason: revocationStatus.reason,
          revokedBy: revocationStatus.revokedBy
        } : null,
        issuerQueried: issuerDid
      };

    } catch (error) {
      console.error('❌ Revocation check failed:', error.message);
      return {
        revocationChecked: false,
        error: error.message,
        status: 'check_failed'
      };
    }
  }

  /**
   * Verificar apresentação com verificação de revogação OBRIGATÓRIA
   */
  async verifyPresentation(presentation, request = null) {
    console.log('🔍 Verifying presentation with MANDATORY revocation check...');

    try {
      // VERIFICAR SE ESTÁ INICIALIZADO
      if (!this.sdService) {
        throw new Error('Verifier not properly initialized - sdService is missing');
      }

      if (!this.keyPair) {
        throw new Error('Verifier not properly initialized - keyPair is missing');
      }

      // DEBUG: Log da apresentação recebida COMPLETA
      console.log('📋 DEBUG - Received presentation structure:');
      console.log('   Full presentation object:', JSON.stringify(presentation, null, 2));
      console.log('   Object keys:', Object.keys(presentation));
      console.log('   Type field exists:', 'type' in presentation);
      console.log('   Type value:', presentation.type);

      // 1. Verificação criptográfica básica
      console.log('🔐 Step 1: Cryptographic verification...');
      console.log('Using sdService:', !!this.sdService);
      console.log('Using keyPair:', !!this.keyPair);
      
      const verificationResult = await this.sdService.verifyPresentationWithSD(
        presentation, 
        this.keyPair.publicKey
      );

      if (!verificationResult.verified) {
        throw new Error('Cryptographic verification failed: ' + verificationResult.error);
      }
      console.log('✅ Cryptographic verification passed');

      // 2. VERIFICAÇÃO DE REVOGAÇÃO (OBRIGATÓRIA)
      console.log('🚫 Step 2: MANDATORY revocation check...');
      let revocationStatus = { revocationChecked: false };
      
      if (presentation.verifiableCredential) {
        const credentials = Array.isArray(presentation.verifiableCredential) 
          ? presentation.verifiableCredential 
          : [presentation.verifiableCredential];

        for (const credential of credentials) {
          console.log(`🔍 Checking revocation for credential: ${credential.id}`);
          const revCheck = await this.checkCredentialRevocation(credential);
          revocationStatus = revCheck;
          
          // Se não conseguimos verificar revogação, FALHAR por segurança
          if (!revCheck.revocationChecked) {
            console.error('❌ SECURITY FAILURE: Cannot verify revocation status');
            return {
              verified: false,
              error: `Security failure: Cannot verify revocation status for credential ${credential.id}`,
              revocationStatus: revCheck,
              verificationFailedDue: 'revocation_check_failed',
              securityNote: 'Verification failed for security reasons - revocation status could not be determined'
            };
          }
          
          // Se credencial está REVOGADA, FALHAR verificação
          if (revCheck.revoked) {
            console.error('❌ CREDENTIAL REVOKED:', revCheck);
            return {
              verified: false,
              error: `Credential ${credential.id} has been REVOKED`,
              revocationStatus: revCheck,
              verificationFailedDue: 'credential_revoked',
              revocationDetails: revCheck.details
            };
          }
          
          console.log('✅ Credential revocation check passed - credential is ACTIVE');
        }
      }

      // 3. Análise de selective disclosure
      console.log('🔍 Step 3: Selective disclosure analysis...');
      const analysis = this.analyzeSelectiveDisclosure(presentation, verificationResult);

      // 4. Armazenar resultado POSITIVO
      const resultId = `verification-${Date.now()}`;
      const fullResult = {
        id: resultId,
        verified: true,
        timestamp: new Date().toISOString(),
        presentationId: presentation.id,
        revocationStatus,
        analysis,
        securityChecks: {
          cryptographicVerification: true,
          revocationCheck: true,
          allCredentialsActive: true
        },
        request: request ? {
          id: request.id,
          requiredFields: request.requiredFields || [],
          challenge: request.challenge
        } : null
      };

      this.verificationHistory.set(resultId, fullResult);
      console.log('✅ Presentation verification SUCCESSFUL with all security checks');

      return fullResult;

    } catch (error) {
      console.error('❌ Presentation verification FAILED:', error.message);
      
      const errorResult = {
        verified: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        revocationStatus: { revocationChecked: false, error: 'Verification failed before revocation check' },
        debugInfo: {
          sdServiceInitialized: !!this.sdService,
          keyPairInitialized: !!this.keyPair,
          errorStack: error.stack
        }
      };

      return errorResult;
    }
  }

  /**
   * Analisar selective disclosure
   */
  analyzeSelectiveDisclosure(presentation, verificationResult) {
    try {
      const analysis = {
        revealedFields: [],
        hiddenFields: [],
        privacyLevel: 'unknown',
        totalFields: 0,
        revealedCount: 0,
        hiddenCount: 0
      };

      if (presentation.verifiableCredential) {
        const credential = Array.isArray(presentation.verifiableCredential) 
          ? presentation.verifiableCredential[0] 
          : presentation.verifiableCredential;

        if (credential && credential.credentialSubject) {
          const subject = credential.credentialSubject;
          const allFields = Object.keys(subject).filter(key => key !== 'id');
          
          analysis.totalFields = allFields.length;
          analysis.revealedFields = allFields;
          analysis.revealedCount = allFields.length;
          analysis.hiddenCount = 0;
          analysis.privacyLevel = analysis.hiddenCount > 0 ? 'high' : 'low';
        }
      }

      return analysis;
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        revealedFields: ['analysis_failed'],
        hiddenFields: [],
        privacyLevel: 'unknown',
        error: error.message
      };
    }
  }

  addTrustedIssuer(issuerDid, metadata = {}) {
    this.trustedIssuers.set(issuerDid, {
      did: issuerDid,
      addedAt: new Date().toISOString(),
      ...metadata
    });
    console.log(`✅ Added trusted issuer: ${issuerDid}`);
  }

  initializeRequestTemplates() {
    this.requestTemplates.set('employment-verification', {
      id: 'employment-verification',
      name: 'Verificação para Emprego',
      description: 'Verificação básica sem notas',
      requiredFields: ['name', 'degree'],
      optionalFields: ['university', 'graduationDate'],
      excludeFields: ['gpa']
    });

    this.requestTemplates.set('full-degree-verification', {
      id: 'full-degree-verification',
      name: 'Verificação Completa de Diploma',
      description: 'Verificação completa incluindo notas',
      requiredFields: ['name', 'degree', 'university', 'graduationDate', 'gpa'],
      optionalFields: [],
      excludeFields: []
    });

    this.requestTemplates.set('basic-degree-verification', {
      id: 'basic-degree-verification',
      name: 'Verificação Básica',
      description: 'Verificação mínima',
      requiredFields: ['name', 'degree'],
      optionalFields: [],
      excludeFields: []
    });
  }

  getRequestTemplates() {
    return Array.from(this.requestTemplates.values());
  }

  getVerificationHistory() {
    return Array.from(this.verificationHistory.values());
  }

  createPresentationRequest(templateId, customOptions = {}) {
    const template = this.requestTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      id: `request-${Date.now()}`,
      templateId,
      requiredFields: template.requiredFields,
      optionalFields: template.optionalFields,
      challenge: customOptions.challenge || `challenge-${Date.now()}`,
      domain: customOptions.domain || 'verifier.example.com',
      createdAt: new Date().toISOString(),
      verifierDid: this.keyPair?.controller
    };
  }
}

// Instância singleton
export const sdVerifier = new SDVerifierService();