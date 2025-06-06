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
// Instanciar file storage
const fileStorage = new fileStorage_1.default();
const revocationRegistry = new revocation_1.RevocationRegistry();
const issuer = new issuer_1.Issuer();
const holder = new holder_1.Holder();
const verifier = new verifier_1.Verifier(revocationRegistry);
// Servir a página principal
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// Issue credential
app.post('/issue', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const credential = yield issuer.issueCredential(req.body.subject, req.body.type, req.body);
        const credentialId = credential.id || `credential-${Date.now()}`;
        // Adicionar ID se não existir
        credential.id = credentialId;
        // Salvar em ficheiro
        yield fileStorage.saveCredential(credentialId, credential);
        res.json(Object.assign(Object.assign({}, credential), { storedId: credentialId, storage: 'file' }));
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Get all credentials
app.get('/credentials', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const credentials = yield fileStorage.loadAllCredentials();
        const formattedCredentials = credentials.map(data => (Object.assign(Object.assign({ id: data.id }, data.credential), { preview: data.preview, savedAt: data.savedAt })));
        res.json(formattedCredentials);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Get specific credential
app.get('/credentials/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fileStorage.loadCredential(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Credential not found' });
        }
        res.json(data.credential);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Create presentation with selected credentials
app.post('/present', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { credentialIds, challenge, holderDid } = req.body;
        // Buscar credenciais selecionadas dos ficheiros
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
        const presentation = yield holder.createPresentation(selectedCredentials, challenge);
        const presentationId = presentation.id || `presentation-${Date.now()}`;
        // Adicionar ID se não existir
        presentation.id = presentationId;
        // Salvar em ficheiro
        yield fileStorage.savePresentation(presentationId, presentation);
        res.json(Object.assign(Object.assign({}, presentation), { storedId: presentationId, storage: 'file' }));
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Get all presentations
app.get('/presentations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const presentations = yield fileStorage.loadAllPresentations();
        const formattedPresentations = presentations.map(data => (Object.assign(Object.assign({ id: data.id }, data.presentation), { preview: data.preview, savedAt: data.savedAt })));
        res.json(formattedPresentations);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Get specific presentation
app.get('/presentations/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        res.json(data.presentation);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Verify specific presentation
app.post('/verify/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        // Opções de verificação do corpo da requisição
        const verificationOptions = req.body || {};
        const result = yield verifier.verify(data.presentation, verificationOptions);
        res.json(Object.assign(Object.assign({}, result), { source: 'file', timestamp: new Date().toISOString() }));
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
}));
// Novo endpoint para verificação com contexto específico
app.post('/verify/:id/context', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        const context = req.body;
        // Use the verify method with context as part of the options
        const result = yield verifier.verify(data.presentation, { context });
        res.json(Object.assign(Object.assign({}, result), { source: 'file', context: context, timestamp: new Date().toISOString() }));
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
}));
// Revoke presentation
app.post('/revoke/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield fileStorage.loadPresentation(req.params.id);
        if (!data) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        const result = revocationRegistry.revokePresentation({ presentationId: req.params.id });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
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
app.delete('/credentials/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield fileStorage.deleteCredential(req.params.id);
        if (deleted) {
            res.json({ success: true, message: 'Credential deleted from file system' });
        }
        else {
            res.status(404).json({ error: 'Credential not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Delete presentation
app.delete('/presentations/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield fileStorage.deletePresentation(req.params.id);
        if (deleted) {
            res.json({ success: true, message: 'Presentation deleted from file system' });
        }
        else {
            res.status(404).json({ error: 'Presentation not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
// Storage statistics
app.get('/storage/stats', (req, res) => {
    try {
        const stats = fileStorage.getStorageStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
});
// Create backup
app.post('/storage/backup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const backupPath = yield fileStorage.createBackup();
        res.json({
            success: true,
            message: 'Backup created successfully',
            backupPath: backupPath
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`VC Demo server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Files stored in: data/ directory`);
});
