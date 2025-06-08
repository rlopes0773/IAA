import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const credentialStorage = new Map();
const presentationStorage = new Map();

function generateCredentialName(credential) {
    const subject = credential.credentialSubject;
    
    if (credential.type?.includes('UniversityDegreeCredential')) {
        return `${subject.studentName} - ${subject.degreeName}`;
    }
    
    if (subject.certificationInfo) {
        return `${subject.name} - ${subject.certificationInfo.degreeName}`;
    }
    
    return `${subject.name} - Dados Pessoais`;
}

function getCredentialType(credential) {
    if (credential.type?.includes('UniversityDegreeCredential')) {
        return 'university_degree';
    }
    
    if (credential.credentialSubject.certificationInfo) {
        return 'academic_certification';
    }
    
    return 'personal_data';
}

function generateVPName(credentials, credentialNames) {
    if (credentials.length === 1) {
        const cred = credentials[0];
        const isOriginalPersonal = cred.type?.includes('PersonalDataCredential') && 
            !cred.credentialSubject.certificationInfo;
        
        if (isOriginalPersonal) {
            return 'VP Original (Dados Pessoais)';
        } else {
            return `VP - ${credentialNames[0]}`;
        }
    }
    
    const hasPersonal = credentials.some(c => c.type?.includes('PersonalDataCredential'));
    const degrees = credentials
        .filter(c => c.type?.includes('UniversityDegreeCredential'))
        .map(c => c.credentialSubject.degreeName);
    
    if (hasPersonal && degrees.length > 0) {
        return `VP - Dados Pessoais + ${degrees.length} Certificado(s)`;
    } else if (degrees.length > 0) {
        return `VP - ${degrees.join(', ')}`;
    }
    
    return `VP - ${credentials.length} Credenciais`;
}

async function executeHolderScript(challenge, domain, holderDid) {
    const env = {
        ...process.env,
        CHALLENGE: challenge || 'abc123',
        DOMAIN: domain || 'https://example.com/'
    };

    if (holderDid) {
        env.HOLDER_DID = holderDid;
    }

    const { stdout, stderr } = await execAsync('node holder.js', { 
        cwd: __dirname,
        env 
    });

    if (stderr) {
        console.warn('Holder script stderr:', stderr);
    }

    const vpPath = path.join(__dirname, 'vp.json');
    if (!fs.existsSync(vpPath)) {
        throw new Error('VP não foi criada');
    }

    const presentation = JSON.parse(fs.readFileSync(vpPath, 'utf8'));

    return {
        success: true,
        message: 'VP created successfully',
        presentation,
        logs: stdout
    };
}

async function createMultiCredentialPresentation(selectedCredentialIds, challenge, domain, holderDid, customName, res) {
    try {
        console.log(`🎭 Creating SINGLE VP with ${selectedCredentialIds.length} selected credentials:`, selectedCredentialIds);
        
        const operationKey = `vp_creation_${selectedCredentialIds.sort().join('_')}_${challenge}_${domain}`;
        
        if (global.creatingVP && global.creatingVP[operationKey]) {
            console.log('⚠️ VP creation already in progress for these credentials, skipping...');
            return res.status(409).json({
                error: 'VP creation already in progress for these credentials',
                message: 'Please wait for the current operation to complete'
            });
        }
        
        if (!global.creatingVP) global.creatingVP = {};
        global.creatingVP[operationKey] = true;
        
        try {
            console.log('🗂️ Current storage contents:');
            
            for (const [id, data] of credentialStorage.entries()) {
                console.log(`   📄 ${id}: ${data.name} (${data.type})`);
            }
            
            const selectedCredentials = [];
            const credentialNames = [];
            const notFoundIds = [];
            
            for (const id of selectedCredentialIds) {
                const credentialData = credentialStorage.get(id);
                if (credentialData) {
                    selectedCredentials.push(credentialData.credential);
                    credentialNames.push(credentialData.name);
                    console.log(`✅ Added credential: ${credentialData.name} (${credentialData.type})`);
                } else {
                    console.warn(`⚠️ Credencial ${id} não encontrada no storage`);
                    notFoundIds.push(id);
                }
            }
            
            if (notFoundIds.length > 0) {
                console.error('❌ Credenciais não encontradas:', notFoundIds);
                return res.status(400).json({
                    error: `Credenciais não encontradas: ${notFoundIds.join(', ')}`,
                    availableCredentials: Array.from(credentialStorage.keys()),
                    requestedCredentials: selectedCredentialIds
                });
            }
            
            if (selectedCredentials.length === 0) {
                return res.status(400).json({
                    error: 'Nenhuma credencial válida encontrada nas seleções'
                });
            }
            
            console.log(`✅ Successfully found ${selectedCredentials.length} credentials for SINGLE VP`);
            
            const vpName = customName || generateVPName(selectedCredentials, credentialNames);
            const vpId = `vp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            console.log(`🎭 Creating SINGLE VP with ID: ${vpId} and name: "${vpName}"`);
            
            // **CRÍTICO: Preservar vc.json original antes de qualquer operação**
            const vcJsonPath = path.join(__dirname, 'vc.json');
            const vcBackupPath = path.join(__dirname, 'vc_backup_temp.json');
            let vcBackupCreated = false;
            
            if (fs.existsSync(vcJsonPath)) {
                try {
                    const originalVcContent = fs.readFileSync(vcJsonPath, 'utf8');
                    fs.writeFileSync(vcBackupPath, originalVcContent);
                    vcBackupCreated = true;
                    console.log('💾 vc.json backup criado para preservar original');
                } catch (backupError) {
                    console.warn('⚠️ Erro ao criar backup do vc.json:', backupError.message);
                }
            }
            
            try {
                // Criar arquivo temporário com múltiplas credenciais
                const tempMultiVcFile = `multi_vc_${vpId}.json`;
                const multiVcData = {
                    credentials: selectedCredentials,
                    selectedCount: selectedCredentials.length,
                    selectedIds: selectedCredentialIds,
                    vpName,
                    vpId,
                    operationKey,
                    debug: {
                        createdAt: new Date().toISOString(),
                        credentialTypes: selectedCredentials.map(c => c.type),
                        credentialIds: selectedCredentials.map(c => c.id),
                        note: 'This file should create EXACTLY ONE VP'
                    }
                };
                
                const multiVcFilePath = path.join(__dirname, tempMultiVcFile);
                fs.writeFileSync(multiVcFilePath, JSON.stringify(multiVcData, null, 2));
                console.log(`📁 Created SINGLE multi-credential file: ${tempMultiVcFile}`);
                
                // **IMPORTANTE: Remover apenas vc.json temporariamente para processamento**
                if (fs.existsSync(vcJsonPath)) {
                    fs.unlinkSync(vcJsonPath);
                    console.log('🗑️ Removed vc.json temporarily for multi-credential processing');
                }
                
                // Limpar qualquer vp.json existente
                const vpJsonPath = path.join(__dirname, 'vp.json');
                if (fs.existsSync(vpJsonPath)) {
                    fs.unlinkSync(vpJsonPath);
                    console.log('🗑️ Removed old vp.json');
                }
                
                console.log(`🔧 Executing holder script ONCE for VP: ${vpId}`);
                const result = await executeHolderScript(challenge, domain, holderDid);
                
                const vpCredentials = result.presentation?.verifiableCredential || [];
                console.log(`📊 Final VP "${vpId}" contains ${vpCredentials.length} credential(s)`);
                
                if (vpCredentials.length !== selectedCredentials.length) {
                    console.warn(`⚠️ Mismatch: Expected ${selectedCredentials.length} credentials, got ${vpCredentials.length}`);
                } else {
                    console.log(`✅ Perfect! VP contains exactly ${selectedCredentials.length} credentials as expected`);
                }
                
                // Salvar VP no storage
                const presentationData = {
                    id: vpId,
                    presentation: result.presentation,
                    createdAt: new Date().toISOString(),
                    name: vpName,
                    selectedCredentials: credentialNames,
                    selectedCredentialIds,
                    challenge,
                    domain,
                    holder: result.presentation.holder
                };
                
                presentationStorage.set(vpId, presentationData);
                
                // Salvar VP com nome único
                const vpFileName = `${vpId}.json`;
                fs.writeFileSync(path.join(__dirname, vpFileName), JSON.stringify(result.presentation, null, 2));
                
                // **CRÍTICO: Restaurar vc.json original**
                if (vcBackupCreated && fs.existsSync(vcBackupPath)) {
                    try {
                        const backupContent = fs.readFileSync(vcBackupPath, 'utf8');
                        fs.writeFileSync(vcJsonPath, backupContent);
                        console.log('✅ vc.json original restaurado com sucesso');
                    } catch (restoreError) {
                        console.error('❌ Erro ao restaurar vc.json:', restoreError.message);
                    }
                }
                
                // Cleanup do arquivo temporário
                try {
                    fs.unlinkSync(multiVcFilePath);
                    console.log(`🧹 Cleaned up ${tempMultiVcFile}`);
                } catch (cleanupError) {
                    console.warn('Cleanup warning:', cleanupError.message);
                }
                
                // Cleanup do backup temporário
                if (vcBackupCreated && fs.existsSync(vcBackupPath)) {
                    try {
                        fs.unlinkSync(vcBackupPath);
                        console.log('🧹 Cleaned up vc.json backup');
                    } catch (cleanupError) {
                        console.warn('Backup cleanup warning:', cleanupError.message);
                    }
                }
                
                result.selectedCredentialsCount = selectedCredentials.length;
                result.selectedCredentialIds = selectedCredentialIds;
                result.presentationId = vpId;
                result.presentationData = presentationData;
                result.vpFileName = vpFileName;
                result.message = `SINGLE Presentation "${vpName}" created with ${selectedCredentials.length} selected credential(s)`;
                
                console.log(`✅ SINGLE VP "${vpName}" criada com sucesso: ${vpId}`);
                
                res.json(result);
                
            } catch (holderError) {
                // **CRÍTICO: Em caso de erro, sempre restaurar vc.json**
                if (vcBackupCreated && fs.existsSync(vcBackupPath)) {
                    try {
                        const backupContent = fs.readFileSync(vcBackupPath, 'utf8');
                        fs.writeFileSync(vcJsonPath, backupContent);
                        console.log('🔄 vc.json restaurado após erro');
                    } catch (restoreError) {
                        console.error('❌ Erro crítico ao restaurar vc.json:', restoreError.message);
                    }
                }
                throw holderError;
            }
            
        } finally {
            // Limpar flag de operação
            if (global.creatingVP) {
                delete global.creatingVP[operationKey];
            }
            
            // **SEGURANÇA: Verificar se vc.json existe, se não, tentar restaurar**
            const vcJsonPath = path.join(__dirname, 'vc.json');
            const vcBackupPath = path.join(__dirname, 'vc_backup_temp.json');
            
            if (!fs.existsSync(vcJsonPath) && fs.existsSync(vcBackupPath)) {
                try {
                    const backupContent = fs.readFileSync(vcBackupPath, 'utf8');
                    fs.writeFileSync(vcJsonPath, backupContent);
                    console.log('🔄 vc.json restaurado no finally');
                } catch (finalRestoreError) {
                    console.error('❌ Erro final ao restaurar vc.json:', finalRestoreError.message);
                }
            }
            
            // Cleanup do backup se ainda existir
            if (fs.existsSync(vcBackupPath)) {
                try {
                    fs.unlinkSync(vcBackupPath);
                } catch (cleanupError) {
                    console.warn('Final backup cleanup warning:', cleanupError.message);
                }
            }
        }
        
    } catch (error) {
        console.error('Error creating multi-credential presentation:', error);
        
        // Limpar flag de operação em caso de erro
        if (global.creatingVP && operationKey) {
            delete global.creatingVP[operationKey];
        }
        
        res.status(500).json({ 
            error: 'Failed to create multi-credential presentation',
            details: error.message
        });
    }
}

app.get('/api/files/:filename', (req, res) => {
    const filePath = path.join(__dirname, req.params.filename);
    
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed to parse file', details: error.message });
        }
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.post('/api/save-credential', (req, res) => {
    try {
        const { credential, customName } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'No credential provided' });
        }
        
        const isFirstPersonalData = !customName && 
            credential.type?.includes('PersonalDataCredential') && 
            !credential.credentialSubject.certificationInfo;
        
        const credentialId = customName || 
            (isFirstPersonalData ? 'originalVC' : `credential_${Date.now()}`);
        
        fs.writeFileSync(path.join(__dirname, 'vc.json'), JSON.stringify(credential, null, 2));
        
        if (credentialStorage.has(credentialId)) {
            return res.status(409).json({ error: 'Credential with this ID already exists' });
        }
        
        const credentialData = {
            id: credentialId,
            credential,
            savedAt: new Date().toISOString(),
            name: generateCredentialName(credential),
            type: getCredentialType(credential)
        };
        
        credentialStorage.set(credentialId, credentialData);
        
        res.json({ 
            message: 'Credential saved successfully', 
            filename: 'vc.json',
            credentialId,
            credentialData
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save credential', details: error.message });
    }
});

app.get('/api/credentials', (req, res) => {
    try {
        const credentials = Array.from(credentialStorage.values());
        res.json({
            success: true,
            count: credentials.length,
            credentials
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list credentials', details: error.message });
    }
});

app.get('/api/credentials/:id', (req, res) => {
    try {
        const credentialData = credentialStorage.get(req.params.id);
        if (!credentialData) {
            return res.status(404).json({ error: 'Credential not found' });
        }
        res.json(credentialData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get credential', details: error.message });
    }
});

// Remover credencial (CORRIGIDO - proteger vc.json original)
app.delete('/api/credentials/:id', (req, res) => {
    try {
        const credentialId = req.params.id;
        
        // **IMPORTANTE: Verificar se é a credencial original**
        if (credentialId === 'originalVC') {
            const confirmHeader = req.headers['x-confirm-original'];
            if (confirmHeader !== 'true') {
                return res.status(400).json({ 
                    error: 'Tentativa de remover credencial original bloqueada',
                    message: 'A credencial original (vc.json) está protegida. Use confirmação explícita.',
                    isOriginal: true,
                    hint: 'Esta credencial é necessária para funcionalidades básicas do sistema'
                });
            }
            console.log('⚠️ Remoção da credencial original confirmada pelo usuário');
        }
        
        const credentialData = credentialStorage.get(credentialId);
        
        if (!credentialData) {
            return res.status(404).json({ error: 'Credential not found' });
        }
        
        // Remover do storage
        const deleted = credentialStorage.delete(credentialId);
        
        if (deleted) {
            // **NOVO: Apagar ficheiro físico associado (com proteção especial para vc.json)**
            const possibleFiles = [
                `${credentialId}.json`,
                `certificate_${credentialId}.json`,
                `credential_${credentialId}.json`
            ];
            
            // Para credencial original, incluir vc.json apenas se confirmado
            if (credentialId === 'originalVC' && req.headers['x-confirm-original'] === 'true') {
                possibleFiles.push('vc.json');
                console.log('⚠️ vc.json incluído para remoção (confirmado pelo usuário)');
            }
            
            // Para certificados universitários, tentar também outros padrões
            if (credentialData.type === 'university_degree') {
                const degreeName = credentialData.credential.credentialSubject.degreeName;
                if (degreeName) {
                    const normalizedName = degreeName.replace(/\s+/g, '_').toLowerCase();
                    possibleFiles.push(`certificate_cert_${normalizedName}_*.json`);
                }
            }
            
            // Tentar apagar ficheiros
            let filesDeleted = 0;
            possibleFiles.forEach(filename => {
                try {
                    const filePath = path.join(__dirname, filename);
                    if (fs.existsSync(filePath)) {
                        // **PROTEÇÃO EXTRA: Dupla verificação para vc.json**
                        if (filename === 'vc.json' && credentialId === 'originalVC') {
                            if (req.headers['x-confirm-original'] !== 'true') {
                                console.log('🛡️ vc.json protegido - remoção bloqueada');
                                return;
                            }
                            console.log('⚠️ Removendo vc.json (CONFIRMADO)');
                        }
                        
                        fs.unlinkSync(filePath);
                        filesDeleted++;
                        console.log(`🗑️ Ficheiro apagado: ${filename}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Erro ao apagar ficheiro ${filename}:`, error.message);
                }
            });
            
            // Para certificados com timestamp, procurar padrão
            if (credentialData.type === 'university_degree' && filesDeleted === 0) {
                try {
                    const files = fs.readdirSync(__dirname);
                    const certFiles = files.filter(f => 
                        f.startsWith('certificate_') && 
                        f.includes(credentialId.split('_').slice(-1)[0]) && // último timestamp
                        f.endsWith('.json')
                    );
                    
                    certFiles.forEach(filename => {
                        try {
                            const filePath = path.join(__dirname, filename);
                            fs.unlinkSync(filePath);
                            filesDeleted++;
                            console.log(`🗑️ Ficheiro de certificado apagado: ${filename}`);
                        } catch (error) {
                            console.warn(`⚠️ Erro ao apagar certificado ${filename}:`, error.message);
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ Erro ao procurar ficheiros de certificado:', error.message);
                }
            }
            
            const isOriginal = credentialId === 'originalVC';
            console.log(`${isOriginal ? '⚠️' : '✅'} Credencial ${credentialId} removida do storage (${filesDeleted} ficheiro(s) apagado(s))`);
            
            res.json({ 
                message: isOriginal ? 'Original credential removed (warning!)' : 'Credential removed successfully',
                filesDeleted,
                credentialId,
                wasOriginal: isOriginal,
                vcJsonProtected: isOriginal && req.headers['x-confirm-original'] !== 'true'
            });
        } else {
            res.status(404).json({ error: 'Failed to remove credential' });
        }
    } catch (error) {
        console.error('Error removing credential:', error);
        res.status(500).json({ error: 'Failed to remove credential', details: error.message });
    }
});

app.get('/api/presentations', (req, res) => {
    try {
        const presentations = Array.from(presentationStorage.values());
        res.json({
            success: true,
            count: presentations.length,
            presentations
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list presentations', details: error.message });
    }
});

app.get('/api/presentations/:id', (req, res) => {
    try {
        const presentationData = presentationStorage.get(req.params.id);
        if (!presentationData) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        res.json(presentationData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get presentation', details: error.message });
    }
});

app.delete('/api/presentations/:id', (req, res) => {
    try {
        const presentationId = req.params.id;
        const presentationData = presentationStorage.get(presentationId);
        
        if (!presentationData) {
            return res.status(404).json({ error: 'Presentation not found' });
        }
        
        const deleted = presentationStorage.delete(presentationId);
        
        if (deleted) {
            const possibleFiles = [
                `${presentationId}.json`,
                'vp.json',
                'originalVP.json'
            ];
            
            if (presentationId.startsWith('vp_')) {
                possibleFiles.push(`${presentationId}.json`);
            }
            
            let filesDeleted = 0;
            possibleFiles.forEach(filename => {
                try {
                    const filePath = path.join(__dirname, filename);
                    if (fs.existsSync(filePath)) {
                        if (filename === 'vp.json' && presentationId !== 'default_vp') {
                            return;
                        }
                        if (filename === 'originalVP.json' && presentationId !== 'original_vp') {
                            return;
                        }
                        
                        fs.unlinkSync(filePath);
                        filesDeleted++;
                    }
                } catch (error) {
                    console.warn(`Erro ao apagar ficheiro ${filename}:`, error.message);
                }
            });
            
            try {
                const files = fs.readdirSync(__dirname);
                const vpFiles = files.filter(f => 
                    f.includes(presentationId) && 
                    f.endsWith('.json') &&
                    (f.startsWith('vp_') || f.includes('presentation'))
                );
                
                vpFiles.forEach(filename => {
                    try {
                        const filePath = path.join(__dirname, filename);
                        fs.unlinkSync(filePath);
                        filesDeleted++;
                    } catch (error) {
                        console.warn(`Erro ao apagar ficheiro VP ${filename}:`, error.message);
                    }
                });
            } catch (error) {
                console.warn('Erro ao procurar ficheiros VP:', error.message);
            }
            
            res.json({ 
                message: 'Presentation removed successfully',
                filesDeleted,
                presentationId
            });
        } else {
            res.status(404).json({ error: 'Failed to remove presentation' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove presentation', details: error.message });
    }
});

app.post('/api/create-presentation', async (req, res) => {
    try {
        const { challenge, domain, holderDid, selectedCredentials, customName } = req.body;
        
        if (selectedCredentials && selectedCredentials.length > 0) {
            return await createMultiCredentialPresentation(selectedCredentials, challenge, domain, holderDid, customName, res);
        }
        
        const vcPath = path.join(__dirname, 'vc.json');
        if (!fs.existsSync(vcPath)) {
            return res.status(404).json({ error: 'No credential file found. Please upload a credential first.' });
        }

        const result = await executeHolderScript(challenge, domain, holderDid);
        
        const vpId = 'default_vp';
        const presentationData = {
            id: vpId,
            presentation: result.presentation,
            createdAt: new Date().toISOString(),
            name: 'Default VP',
            selectedCredentials: ['vc.json'],
            challenge,
            domain
        };
        
        presentationStorage.set(vpId, presentationData);
        
        result.presentationId = vpId;
        result.presentationData = presentationData;
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to create presentation',
            details: error.message
        });
    }
});

app.post('/api/save-new-credential', (req, res) => {
    try {
        const { credential, filename = 'new_vc.json' } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'No credential provided' });
        }
        
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, JSON.stringify(credential, null, 2));
        
        let credentialId;
        const credentialType = getCredentialType(credential);
        
        if (credentialType === 'university_degree') {
            const degreeName = credential.credentialSubject.degreeName.replace(/\s+/g, '_').toLowerCase();
            const timestamp = Date.now();
            credentialId = `cert_${degreeName}_${timestamp}`;
        } else {
            credentialId = `credential_${Date.now()}`;
        }
        
        const credentialData = {
            id: credentialId,
            credential,
            savedAt: new Date().toISOString(),
            name: generateCredentialName(credential),
            type: credentialType
        };
        
        credentialStorage.set(credentialId, credentialData);
        
        res.json({ 
            message: `Credential saved successfully as ${filename}`, 
            filename, 
            path: filePath,
            credentialId,
            credentialData
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save credential', details: error.message });
    }
});

app.post('/api/save-certificate-auto', (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'No credential provided' });
        }
        
        if (!credential.type?.includes('UniversityDegreeCredential')) {
            return res.status(400).json({ error: 'Not a university degree credential' });
        }
        
        const subject = credential.credentialSubject;
        const degreeName = subject.degreeName?.replace(/\s+/g, '_').toLowerCase() || 'degree';
        const timestamp = Date.now();
        
        const credentialId = `cert_${degreeName}_${timestamp}`;
        const filename = `certificate_${credentialId}.json`;
        
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, JSON.stringify(credential, null, 2));
        
        const credentialData = {
            id: credentialId,
            credential,
            savedAt: new Date().toISOString(),
            name: `🎓 ${subject.studentName} - ${subject.degreeName}`,
            type: 'university_degree'
        };
        
        credentialStorage.set(credentialId, credentialData);
        
        res.json({ 
            message: 'Certificate saved successfully', 
            filename, 
            credentialId,
            credentialData
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save certificate', details: error.message });
    }
});

app.get('/api/load-existing-files', (req, res) => {
    try {
        const files = fs.readdirSync(__dirname);
        const credentialFiles = files.filter(f => 
            f.endsWith('.json') && 
            (f.startsWith('certificate_') || 
             f.startsWith('credential_') || 
             f === 'vc.json' ||
             f.match(/^cert_.*\.json$/))
        );
        
        let loadedCount = 0;
        const loadedCredentials = [];
        
        credentialFiles.forEach(filename => {
            try {
                const filePath = path.join(__dirname, filename);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const credential = JSON.parse(fileContent);
                
                if (credential.type && credential.type.includes('VerifiableCredential')) {
                    let credentialId;
                    const credentialType = getCredentialType(credential);
                    
                    if (filename === 'vc.json') {
                        credentialId = 'originalVC';
                    } else if (credentialType === 'university_degree') {
                        const degreeName = credential.credentialSubject.degreeName?.replace(/\s+/g, '_').toLowerCase();
                        const timestamp = credential.issuanceDate ? new Date(credential.issuanceDate).getTime() : Date.now();
                        credentialId = `cert_${degreeName}_${timestamp}`;
                    } else {
                        const timestamp = credential.issuanceDate ? new Date(credential.issuanceDate).getTime() : Date.now();
                        credentialId = `credential_${timestamp}`;
                    }
                    
                    if (!credentialStorage.has(credentialId)) {
                        const credentialData = {
                            id: credentialId,
                            credential,
                            savedAt: credential.issuanceDate || new Date().toISOString(),
                            name: generateCredentialName(credential),
                            type: credentialType,
                            filename: filename
                        };
                        
                        credentialStorage.set(credentialId, credentialData);
                        loadedCredentials.push({
                            id: credentialId,
                            name: credentialData.name,
                            type: credentialType,
                            filename: filename
                        });
                        loadedCount++;
                    }
                }
            } catch (error) {
                console.warn(`Erro ao carregar ${filename}:`, error.message);
            }
        });
        
        res.json({
            success: true,
            message: `${loadedCount} credencial(ais) carregada(s) de ficheiros existentes`,
            loadedCount,
            loadedCredentials,
            totalInStorage: credentialStorage.size
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to load existing files', 
            details: error.message 
        });
    }
});

app.get('/api/load-existing-presentations', (req, res) => {
    try {
        const files = fs.readdirSync(__dirname);
        const vpFiles = files.filter(f => 
            f.endsWith('.json') && 
            (f.startsWith('vp_') || 
             f === 'vp.json' ||
             f === 'originalVP.json')
        );
        
        let loadedCount = 0;
        const loadedPresentations = [];
        
        vpFiles.forEach(filename => {
            try {
                const filePath = path.join(__dirname, filename);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const presentation = JSON.parse(fileContent);
                
                if (presentation.type && presentation.type.includes('VerifiablePresentation')) {
                    let presentationId;
                    if (filename === 'vp.json') {
                        presentationId = 'default_vp';
                    } else if (filename === 'originalVP.json') {
                        presentationId = 'original_vp';
                    } else {
                        presentationId = filename.replace('.json', '');
                    }
                    
                    if (!presentationStorage.has(presentationId)) {
                        const credentialNames = [];
                        const credentialIds = [];
                        
                        if (presentation.verifiableCredential) {
                            presentation.verifiableCredential.forEach((cred, index) => {
                                if (cred.credentialSubject) {
                                    const name = cred.credentialSubject.studentName || 
                                                cred.credentialSubject.name || 
                                                `Credencial ${index + 1}`;
                                    credentialNames.push(name);
                                    credentialIds.push(cred.id || `cred_${index}`);
                                }
                            });
                        }
                        
                        const vpName = filename === 'originalVP.json' ? 'VP Original' :
                                      filename === 'vp.json' ? 'VP Padrão' :
                                      `VP - ${credentialNames.length} credencial(ais)`;
                        
                        const presentationData = {
                            id: presentationId,
                            presentation,
                            createdAt: presentation.proof?.created || new Date().toISOString(),
                            name: vpName,
                            selectedCredentials: credentialNames,
                            selectedCredentialIds: credentialIds,
                            challenge: presentation.proof?.challenge || 'N/A',
                            domain: presentation.proof?.domain || 'N/A',
                            holder: presentation.holder,
                            filename: filename
                        };
                        
                        presentationStorage.set(presentationId, presentationData);
                        loadedPresentations.push({
                            id: presentationId,
                            name: vpName,
                            credentialsCount: credentialNames.length,
                            filename: filename
                        });
                        loadedCount++;
                    }
                }
            } catch (error) {
                console.warn(`Erro ao carregar apresentação ${filename}:`, error.message);
            }
        });
        
        res.json({
            success: true,
            message: `${loadedCount} apresentação(ões) carregada(s) de ficheiros existentes`,
            loadedCount,
            loadedPresentations,
            totalInStorage: presentationStorage.size
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to load existing presentations', 
            details: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
    const contextsDir = path.join(__dirname, 'contexts');
    if (fs.existsSync(contextsDir)) {
        console.log(`📁 Contexts directory found`);
    }
});