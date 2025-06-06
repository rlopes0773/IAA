import { 
  SelectiveDisclosureService, 
  generateEcdsaKeyPair,
  sdService 
} from '../shared/selectiveDisclosure.js';

import { safeDocumentLoader } from '../shared/documentLoader.js';

/**
 * @typedef {Object} IssuerConfig
 * @property {string} [name] - Nome do issuer
 * @property {string} [description] - Descrição do issuer
 */

/**
 * @typedef {Object} CredentialTemplate
 * @property {string} type - Tipo da credencial
 * @property {string[]} selectiveFields - Campos que podem ser seletivamente divulgados
 * @property {Object} schema - Schema da credencial
 */

/**
 * Issuer service com suporte a Selective Disclosure
 */
export class SDIssuerService {
  constructor() {
    // Inicializar TODAS as propriedades primeiro
    this.keyPair = null;
    this.sdService = null;
    this.issuedCredentials = new Map();
    this.credentialTemplates = new Map();
    this.revokedCredentials = new Map();
    
    // DEPOIS inicializar templates
    this.initializeTemplates();
  }

  /**
   * Inicializar issuer com chaves
   */
  async initialize() {
    console.log('🏛️ Initializing SD Issuer Service...');
    
    if (!this.keyPair) {
      try {
        this.keyPair = await generateEcdsaKeyPair();
        console.log('✅ Issuer key pair generated:', this.keyPair.controller);
      } catch (error) {
        console.error('❌ Failed to generate key pair:', error.message);
        throw new Error(`Key pair generation failed: ${error.message}`);
      }
    }

    if (!this.sdService) {
      try {
        this.sdService = new SelectiveDisclosureService();
        console.log('✅ Selective Disclosure Service created for Issuer');
      } catch (error) {
        console.error('❌ Failed to create SD Service:', error.message);
        throw new Error(`SD Service creation failed: ${error.message}`);
      }
    }

    console.log('✅ SD Issuer Service initialized successfully');
    
    return {
      did: this.keyPair.controller,
      publicKey: this.keyPair.publicKeyMultibase
    };
  }

  /**
   * Inicializar templates de credenciais
   */
  initializeTemplates() {
    console.log('📋 Initializing credential templates...');
    
    this.credentialTemplates.set('UniversityDegree', {
      id: 'UniversityDegree',
      name: 'Diploma Universitário',
      description: 'Credencial de diploma universitário com selective disclosure',
      schema: {
        subjectId: { type: 'string', required: true },
        name: { type: 'string', required: true },
        degree: { 
          type: 'object', 
          required: true,
          properties: {
            type: { type: 'string', default: 'BachelorDegree' },
            university: { type: 'string', required: true },
            graduationDate: { type: 'string', required: true }
          }
        },
        gpa: { type: 'number', required: false }
      },
      selectiveFields: ['name', 'gpa', 'university', 'graduationDate']
    });

    console.log('✅ Templates initialized:', this.credentialTemplates.size);
  }

  getTemplates() {
    return Array.from(this.credentialTemplates.values());
  }

  /**
   * Listar templates disponíveis
   */
  getAvailableTemplates() {
    const templates = [];
    for (const [id, template] of this.credentialTemplates.entries()) {
      templates.push({
        id,
        type: template.type,
        selectiveFields: template.selectiveFields,
        schema: template.schema
      });
    }
    return templates;
  }

  /**
   * Emitir credencial com Selective Disclosure
   * @param {string} templateId - ID do template
   * @param {Object} credentialData - Dados da credencial
   * @param {string[]} [customSelectiveFields] - Campos seletivos customizados
   * @returns {Promise<Object>} Credencial emitida
   */
  async issueCredential(templateId, credentialData, options = {}) {
    console.log(`🚀 Issuing credential with template: ${templateId}`);
    
    // Verificar se template existe
    const template = this.credentialTemplates.get(templateId); // Usar credentialTemplates
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    console.log(`🎓 Issuing ${template.type} with SD...`);

    // Validar dados
    this.validateCredentialData(credentialData, template.schema);

    // Preparar dados da credencial
    const credSubject = {
      id: credentialData.subjectId || `did:example:subject-${Date.now()}`,
      ...credentialData
    };

    // Determinar campos seletivos
    const selectiveFields = options.customSelectiveFields || template.selectiveFields;
    const selectivePointers = sdService.generateSelectivePointers(selectiveFields);

    console.log('📋 Selective fields:', selectiveFields);
    console.log('📍 Selective pointers:', selectivePointers);

    // Emitir credencial
    const result = await sdService.issueCredentialWithSD(
      credSubject,
      this.keyPair,
      { selectivePointers }
    );

    // Armazenar credencial emitida
    const credentialId = result.credential.id;
    this.issuedCredentials.set(credentialId, {
      ...result,
      templateId,
      issuedAt: new Date().toISOString(),
      selectiveFields
    });

    console.log('✅ Credential issued:', credentialId);

    return {
      credentialId,
      credential: result.credential,
      selectiveFields,
      selectivePointers,
      issuerDid: this.keyPair.controller,
      templateUsed: templateId
    };
  }

  /**
   * Validar dados da credencial
   * @param {Object} data - Dados para validar
   * @param {Object} schema - Schema de validação
   */
  validateCredentialData(data, schema) {
    for (const [field, rules] of Object.entries(schema)) {
      if (rules.required && !data[field]) {
        throw new Error(`Campo obrigatório ausente: ${field}`);
      }
      
      if (data[field] && rules.type === 'object' && rules.properties) {
        this.validateCredentialData(data[field], rules.properties);
      }
    }
  }

  /**
   * Obter credencial emitida
   * @param {string} credentialId - ID da credencial
   * @returns {Object|null} Dados da credencial
   */
  getIssuedCredential(credentialId) {
    return this.issuedCredentials.get(credentialId) || null;
  }

  /**
   * Listar todas as credenciais emitidas
   * @returns {Array} Lista de credenciais
   */
  listIssuedCredentials() {
    const credentials = [];
    for (const [id, data] of this.issuedCredentials.entries()) {
      credentials.push({
        id,
        templateId: data.templateId,
        issuedAt: data.issuedAt,
        subjectId: data.credential.credentialSubject.id,
        selectiveFields: data.selectiveFields
      });
    }
    return credentials;
  }

  /**
   * Verificar credencial
   * @param {Object} credential - Credencial para verificar
   * @returns {Promise<Object>} Resultado da verificação
   */
  async verifyCredential(credential) {
    return await sdService.verifyCredentialWithSD(credential);
  }

  /**
   * Obter informações do issuer
   * @returns {Object} Informações do issuer
   */
  getIssuerInfo() {
    return {
      did: this.keyPair?.controller || 'Not initialized',
      publicKey: this.keyPair?.publicKeyMultibase || 'Not initialized',
      totalCredentialsIssued: this.issuedCredentials.size,
      totalCredentialsRevoked: this.revokedCredentials.size,
      availableTemplates: Array.from(this.credentialTemplates.keys()),
      serviceStatus: {
        keyPairReady: !!this.keyPair,
        sdServiceReady: !!this.sdService,
        fullyInitialized: !!(this.keyPair && this.sdService)
      }
    };
  }

  /**
   * Revogar uma credencial emitida
   * @param {string} credentialId - ID da credencial a revogar
   * @param {string} reason - Motivo da revogação
   * @param {Object} metadata - Metadados adicionais
   * @returns {Object} Informação da revogação
   */
  async revokeCredential(credentialId, reason = 'unspecified', metadata = {}) {
    console.log(`🚫 Revoking credential: ${credentialId}`);

    // Verificar se a credencial existe
    if (!this.issuedCredentials.has(credentialId)) {
      throw new Error(`Credencial ${credentialId} não foi emitida por este issuer`);
    }

    // Verificar se já está revogada
    if (this.revokedCredentials.has(credentialId)) {
      throw new Error(`Credencial ${credentialId} já foi revogada`);
    }

    const revocationInfo = {
      credentialId,
      revokedAt: new Date().toISOString(),
      reason,
      revokedBy: this.keyPair.controller,
      metadata,
      revocationId: `revocation-${Date.now()}`
    };

    // Adicionar à lista de revogação
    this.revokedCredentials.set(credentialId, revocationInfo);

    // Atualizar status da credencial original
    const originalCredential = this.issuedCredentials.get(credentialId);
    if (originalCredential) {
      originalCredential.status = 'revoked';
      originalCredential.revokedAt = revocationInfo.revokedAt;
      originalCredential.revocationReason = reason;
    }

    console.log('✅ Credential revoked successfully');
    return revocationInfo;
  }

  /**
   * Verificar se uma credencial está revogada
   * @param {string} credentialId - ID da credencial
   * @returns {Object} Status de revogação
   */
  checkRevocationStatus(credentialId) {
    const isRevoked = this.revokedCredentials.has(credentialId);
    
    if (isRevoked) {
      return {
        revoked: true,
        ...this.revokedCredentials.get(credentialId)
      };
    }

    return {
      revoked: false,
      credentialId,
      status: 'active'
    };
  }

  /**
   * Obter lista de credenciais revogadas
   * @returns {Array} Lista de revogações
   */
  getRevokedCredentials() {
    return Array.from(this.revokedCredentials.values());
  }

  /**
   * Obter estatísticas de revogação
   * @returns {Object} Estatísticas
   */
  getRevocationStats() {
    const totalIssued = this.issuedCredentials.size;
    const totalRevoked = this.revokedCredentials.size;
    const activeCredentials = totalIssued - totalRevoked;

    return {
      totalIssued,
      totalRevoked,
      activeCredentials,
      revocationRate: totalIssued > 0 ? (totalRevoked / totalIssued * 100).toFixed(2) : 0
    };
  }

  /**
   * Criar lista de revogação pública (Revocation List 2020)
   * @returns {Object} Lista de revogação padronizada
   */
  createRevocationList() {
    const revocationList = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/vc-revocation-list-2020/v1"
      ],
      "type": ["VerifiableCredential", "RevocationList2020Credential"],
      "id": `${this.keyPair.controller}/revocation-list`,
      "issuer": this.keyPair.controller,
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "id": `${this.keyPair.controller}/revocation-list#list`,
        "type": "RevocationList2020",
        "encodedList": this.encodeRevocationList()
      }
    };

    return revocationList;
  }

  /**
   * Codificar lista de revogação (simplified for demo)
   * @returns {string} Lista codificada
   */
  encodeRevocationList() {
    const revokedIds = Array.from(this.revokedCredentials.keys());
    return Buffer.from(JSON.stringify(revokedIds)).toString('base64');
  }
}

// Singleton instance
export const sdIssuer = new SDIssuerService({
  name: 'Universidade Digital',
  description: 'Emissão de diplomas e certificados com Selective Disclosure'
});