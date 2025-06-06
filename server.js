import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Importar os serviços SD que já criou
import { sdIssuer } from './src/issuer/sdIssuer.js';
import { sdHolder } from './src/holder/sdHolder.js';
import { sdVerifier } from './src/verifier/sdVerifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; // Usar 3001 para coincidir com o frontend

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar serviços na primeira chamada
let servicesInitialized = false;

async function initializeServices() {
  if (!servicesInitialized) {
    console.log('🚀 Initializing SD services...');
    try {
      console.log('1. Initializing Issuer...');
      await sdIssuer.initialize();
      
      console.log('2. Initializing Holder...');
      await sdHolder.initialize();
      
      console.log('3. Initializing Verifier...');
      await sdVerifier.initialize();
      
      // Configurar issuer como confiável no verifier
      console.log('4. Setting up trusted issuer...');
      const issuerInfo = sdIssuer.getIssuerInfo();
      sdVerifier.addTrustedIssuer(issuerInfo.did, {
        name: 'Demo University',
        type: 'educational-institution'
      });
      
      // Verificar se tudo está funcionando
      console.log('5. Verifying initialization...');
      const verifierInfo = sdVerifier.getVerifierInfo();
      console.log('Verifier status:', verifierInfo.serviceStatus);
      
      if (!verifierInfo.serviceStatus.fullyInitialized) {
        throw new Error('Verifier not fully initialized');
      }
      
      servicesInitialized = true;
      console.log('✅ All SD services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error.message);
      throw error;
    }
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'VC Demo Server is running', 
    timestamp: new Date().toISOString(),
    services: ['issuer', 'holder', 'verifier'],
    initialized: servicesInitialized
  });
});

// ISSUER ROUTES
app.get('/issuer/info', async (req, res) => {
  try {
    await initializeServices();
    const info = sdIssuer.getIssuerInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/issuer/templates', async (req, res) => {
  try {
    await initializeServices();
    const templates = sdIssuer.getAvailableTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/issuer/credentials', async (req, res) => {
  try {
    await initializeServices();
    const credentials = sdIssuer.listIssuedCredentials();
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/issuer/issue', async (req, res) => {
  try {
    await initializeServices();
    const { templateId, credentialData, selectiveFields } = req.body;
    
    const result = await sdIssuer.issueCredential(templateId, credentialData, selectiveFields);
    res.json(result);
  } catch (error) {
    console.error('Issue credential error:', error);
    res.status(500).json({ error: error.message });
  }
});

// REVOCATION ROUTES
app.post('/issuer/revoke', async (req, res) => {
  try {
    await initializeServices();
    const { credentialId, reason, metadata } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({ error: 'credentialId is required' });
    }
    
    const result = await sdIssuer.revokeCredential(credentialId, reason, metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/issuer/revoked', async (req, res) => {
  try {
    await initializeServices();
    const revokedCredentials = sdIssuer.getRevokedCredentials();
    res.json(revokedCredentials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/issuer/revocation-stats', async (req, res) => {
  try {
    await initializeServices();
    const stats = sdIssuer.getRevocationStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/issuer/check-revocation/:credentialId', async (req, res) => {
  try {
    await initializeServices();
    const { credentialId } = req.params;
    const status = sdIssuer.checkRevocationStatus(credentialId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/issuer/revocation-list', async (req, res) => {
  try {
    await initializeServices();
    const revocationList = sdIssuer.createRevocationList();
    res.json(revocationList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HOLDER ROUTES
app.get('/holder/info', async (req, res) => {
  try {
    await initializeServices();
    const info = sdHolder.getHolderInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/holder/credentials', async (req, res) => {
  try {
    await initializeServices();
    const credentials = sdHolder.listCredentials();
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/holder/presentations', async (req, res) => {
  try {
    await initializeServices();
    const presentations = sdHolder.listPresentations();
    res.json(presentations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/holder/receive', async (req, res) => {
  try {
    await initializeServices();
    const { credential, metadata } = req.body;
    
    const credentialId = await sdHolder.receiveCredential(credential, metadata);
    res.json({ credentialId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/holder/present', async (req, res) => {
  try {
    await initializeServices();
    const { credentialId, revealFields, hideFields, challenge, domain } = req.body;
    
    const result = await sdHolder.createPresentation({
      credentialId,
      revealFields,
      hideFields,
      challenge,
      domain
    });
    res.json(result);
  } catch (error) {
    console.error('Create presentation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// VERIFIER ROUTES
app.get('/verifier/info', async (req, res) => {
  try {
    await initializeServices();
    const info = sdVerifier.getVerifierInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/verifier/templates', async (req, res) => {
  try {
    await initializeServices();
    const templates = sdVerifier.getRequestTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/verifier/history', async (req, res) => {
  try {
    await initializeServices();
    const history = sdVerifier.getVerificationHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/verifier/request', async (req, res) => {
  try {
    await initializeServices();
    const { templateId, customOptions } = req.body;
    
    const request = sdVerifier.createPresentationRequest(templateId, customOptions);
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/verifier/verify', async (req, res) => {
  try {
    await initializeServices();
    
    console.log('🔍 Verify endpoint called');
    console.log('   Request body keys:', Object.keys(req.body));
    console.log('   Full request body:', JSON.stringify(req.body, null, 2));
    
    const { presentationId, request } = req.body;
    
    // Buscar apresentação no holder
    const presentationData = sdHolder.presentations.get(presentationId);
    if (!presentationData) {
      return res.status(404).json({ error: 'Presentation not found' });
    }

    console.log('📋 Found presentation data:');
    console.log('   Presentation ID:', presentationData.id);
    console.log('   Presentation object:', JSON.stringify(presentationData.presentation, null, 2));
    
    // Verificar apresentação
    const result = await sdVerifier.verifyPresentation(
      presentationData.presentation, // <-- Verificar se este objeto tem 'type'
      request
    );

    res.json(result);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DEMO COMPLETA - Workflow end-to-end
app.post('/demo/complete-flow', async (req, res) => {
  try {
    await initializeServices();
    const { studentData, templateId, verificationTemplate } = req.body;
    
    console.log('🎯 Starting complete demo flow...');
    
    // 1. Issuer emite credencial
    console.log('1. Issuing credential...');
    const issued = await sdIssuer.issueCredential(templateId, studentData);
    
    // 2. Holder recebe credencial
    console.log('2. Holder receiving credential...');
    const received = await sdHolder.receiveCredential(issued.credential, {
      issuerName: 'Demo University',
      credentialType: templateId
    });
    
    // 3. Verifier cria requisição
    console.log('3. Creating verification request...');
    const request = sdVerifier.createPresentationRequest(verificationTemplate || 'employment-verification');
    
    // 4. Holder cria apresentação (ocultando campos sensíveis por padrão)
    console.log('4. Creating presentation...');
    const hideFields = verificationTemplate === 'employment-verification' ? ['gpa'] : [];
    
    const presentation = await sdHolder.createPresentation({
      credentialId: received,
      revealFields: request.requiredFields,
      hideFields: hideFields,
      challenge: request.challenge,
      domain: request.domain
    });
    
    // 5. Verifier verifica apresentação
    console.log('5. Verifying presentation...');
    const verification = await sdVerifier.verifyPresentation(
      presentation.presentation, 
      request
    );
    
    console.log('✅ Complete demo flow finished successfully');
    
    res.json({
      success: true,
      steps: {
        issued,
        received,
        request,
        presentation,
        verification
      }
    });
    
  } catch (error) {
    console.error('❌ Demo flow error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 VC Demo Server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   GET  / - Frontend interface');
  console.log('   GET  /health - Health check');
  console.log('   POST /demo/complete-flow - Complete demo workflow');
  console.log('   GET  /issuer/info - Issuer information');
  console.log('   POST /issuer/issue - Issue credential');
  console.log('   GET  /holder/credentials - List holder credentials');
  console.log('   POST /holder/present - Create presentation');
  console.log('   GET  /verifier/templates - List verification templates');
  console.log('   POST /verifier/verify - Verify presentation');
  console.log('');
  console.log('📱 Open http://localhost:3001 in your browser to use the demo!');
  
  // Initialize services on startup (optional)
  try {
    await initializeServices();
    console.log('✅ Services pre-initialized successfully');
  } catch (error) {
    console.log('⚠️ Services will be initialized on first request');
  }
});