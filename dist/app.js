"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const issuer_1 = require("./issuer");
const holder_1 = require("./holder");
const verifier_1 = require("./verifier");
const revocation_1 = require("./revocation");
const fileStorage_1 = __importDefault(require("./utils/fileStorage"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Initialize components
const fileStorage = new fileStorage_1.default();
const revocationRegistry = new revocation_1.RevocationRegistry();
const issuer = new issuer_1.Issuer();
const holder = new holder_1.Holder();
const verifier = new verifier_1.Verifier(revocationRegistry);
// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// Issue credential with Digital Bazaar
app.post('/issue', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Issuing credential with Digital Bazaar...');
        const credential = yield issuer.issueCredential(req.body.subject, req.body.type, req.body);
        const credentialId = credential.id || `credential-${Date.now()}`;
        credential.id = credentialId;
        // Save to file
        yield fileStorage.saveCredential(credentialId, credential);
        res.json(Object.assign(Object.assign({}, credential), { storedId: credentialId, storage: 'file', cryptographicallySigned: true, signatureMethod: 'Digital Bazaar Data Integrity' }));
    }
    catch (error) {
        console.error('Error issuing credential:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            details: 'Failed to issue credential with Digital Bazaar signature'
        });
    }
})));
// Get all credentials
app.get('/credentials', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const credentials = yield fileStorage.loadAllCredentials();
    const formattedCredentials = credentials.map(data => (Object.assign(Object.assign({ id: data.id }, data.credential), { preview: data.preview, savedAt: data.savedAt })));
    res.json(formattedCredentials);
})));
// Get specific credential
app.get('/credentials/:id', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield fileStorage.loadCredential(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Credential not found' });
    }
    res.json(data.credential);
})));
// Create presentation with Digital Bazaar
app.post('/present', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { credentialIds, challenge, holderDid } = req.body;
        console.log('Creating presentation with Digital Bazaar...');
        // Load selected credentials
        const selectedCredentials = [];
        for (const id of credentialIds) {
            const data = yield fileStorage.loadCredential(id);
            if (data) {
                selectedCredentials.push(data.credential);
            }
        }
        if (selectedCredentials.length === 0) {
            return res.status(400).json({ error: 'No valid credentials found' });
        }
        const presentation = yield holder.createPresentation(selectedCredentials, challenge, holderDid);
        const presentationId = presentation.id || `presentation-${Date.now()}`;
        presentation.id = presentationId;
        // Save to file
        yield fileStorage.savePresentation(presentationId, presentation);
        res.json(Object.assign(Object.assign({}, presentation), { storedId: presentationId, storage: 'file', cryptographicallySigned: true, signatureMethod: 'Digital Bazaar Data Integrity' }));
    }
    catch (error) {
        console.error('Error creating presentation:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            details: 'Failed to create presentation with Digital Bazaar signature'
        });
    }
})));
// Get all presentations
app.get('/presentations', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const presentations = yield fileStorage.loadAllPresentations();
    const formattedPresentations = presentations.map(data => (Object.assign(Object.assign({ id: data.id }, data.presentation), { preview: data.preview, savedAt: data.savedAt })));
    res.json(formattedPresentations);
})));
// Get specific presentation
app.get('/presentations/:id', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield fileStorage.loadPresentation(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json(data.presentation);
})));
// Verify presentation with Digital Bazaar
app.post('/verify/:id', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        console.log('Verifying presentation with Digital Bazaar...');
        const verificationOptions = req.body || {};
        const result = yield verifier.verify(data.presentation, verificationOptions);
        res.json(Object.assign(Object.assign({}, result), { source: 'file', timestamp: new Date().toISOString(), verificationMethod: 'Digital Bazaar Cryptographic Verification' }));
    }
    catch (error) {
        console.error('Error verifying presentation:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error),
            details: 'Failed to verify presentation with Digital Bazaar'
        });
    }
})));
// Verify with context
app.post('/verify/:id/context', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield fileStorage.loadPresentation(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Presentation not found' });
    }
    const context = req.body;
    const result = yield verifier.verify(data.presentation, { context });
    res.json(Object.assign(Object.assign({}, result), { source: 'file', context: context, timestamp: new Date().toISOString(), verificationMethod: 'Digital Bazaar Cryptographic Verification with Context' }));
})));
// Revoke presentation
app.post('/revoke/:id', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield fileStorage.loadPresentation(req.params.id);
    if (!data) {
        return res.status(404).json({ error: 'Presentation not found' });
    }
    const result = revocationRegistry.revokePresentation({ presentationId: req.params.id });
    res.json(result);
})));
// Check revocation status
app.get('/check-revocation/:id', (req, res) => {
    try {
        const status = revocationRegistry.checkRevocation(req.params.id);
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});
// Delete credential
app.delete('/credentials/:id', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = yield fileStorage.deleteCredential(req.params.id);
    if (deleted) {
        res.json({ success: true, message: 'Credential deleted from file system' });
    }
    else {
        res.status(404).json({ error: 'Credential not found' });
    }
})));
// Delete presentation
app.delete('/presentations/:id', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = yield fileStorage.deletePresentation(req.params.id);
    if (deleted) {
        res.json({ success: true, message: 'Presentation deleted from file system' });
    }
    else {
        res.status(404).json({ error: 'Presentation not found' });
    }
})));
// Storage management endpoints
app.get('/storage/stats', (req, res) => {
    try {
        const stats = fileStorage.getStorageStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});
app.post('/storage/backup', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const backupPath = yield fileStorage.createBackup();
    res.json({
        success: true,
        message: 'Backup created successfully',
        backupPath: backupPath
    });
})));
// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 VC Demo server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
    console.log(`💾 Files stored in: data/ directory`);
    console.log(`🔐 Using Digital Bazaar cryptographic verification`);
});
