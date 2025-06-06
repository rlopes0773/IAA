const API_BASE = 'http://localhost:3001';

// Utility functions
function showTab(tabName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function showLoading(elementId) {
    document.getElementById(elementId).innerHTML = '<div class="loading"></div> Carregando...';
}

function showResult(elementId, data, isError = false) {
    const element = document.getElementById(elementId);
    
    // CASO ESPECIAL: Verificação falhada por REVOGAÇÃO
    if (data.verified === false && data.verificationFailedDue === 'credential_revoked') {
        element.innerHTML = `
            <div class="result error">
                <h4>🚫 CREDENCIAL REVOGADA</h4>
                <div class="alert-box error">
                    <p><strong>❌ VERIFICAÇÃO FALHOU</strong></p>
                    <p><strong>Motivo:</strong> A credencial foi revogada pelo emissor</p>
                    <p><strong>Revogada em:</strong> ${data.revocationDetails?.revokedAt || 'N/A'}</p>
                    <p><strong>Motivo da revogação:</strong> ${data.revocationDetails?.reason || 'Não especificado'}</p>
                </div>
                <details>
                    <summary>🔍 Detalhes Técnicos da Revogação</summary>
                    <div class="json-viewer">${JSON.stringify(data.revocationStatus, null, 2)}</div>
                </details>
            </div>
        `;
        return;
    }
    
    // CASO ESPECIAL: Falha na verificação de revogação
    if (data.verified === false && data.verificationFailedDue === 'revocation_check_failed') {
        element.innerHTML = `
            <div class="result error">
                <h4>⚠️ FALHA DE SEGURANÇA</h4>
                <div class="alert-box error">
                    <p><strong>❌ VERIFICAÇÃO FALHOU</strong></p>
                    <p><strong>Motivo:</strong> Não foi possível verificar se a credencial está revogada</p>
                    <p><strong>Política:</strong> Por segurança, credenciais sem verificação de revogação são rejeitadas</p>
                </div>
                <details>
                    <summary>🔍 Detalhes do Erro</summary>
                    <div class="json-viewer">${JSON.stringify(data, null, 2)}</div>
                </details>
            </div>
        `;
        return;
    }
    
    // CASO NORMAL: Verificação bem-sucedida
    if (data.verified === true && data.revocationStatus) {
        element.innerHTML = `
            <div class="result success">
                <h4>✅ VERIFICAÇÃO VÁLIDA</h4>
                <div class="verification-summary">
                    <div class="check-item">
                        <span class="check-icon">🔐</span>
                        <span>Verificação criptográfica: <strong>VÁLIDA</strong></span>
                    </div>
                    <div class="check-item">
                        <span class="check-icon">✅</span>
                        <span>Status de revogação: <strong>ATIVA</strong></span>
                    </div>
                    <div class="check-item">
                        <span class="check-icon">🔍</span>
                        <span>Campos revelados: <strong>${data.analysis?.revealedFields?.join(', ') || 'N/A'}</strong></span>
                    </div>
                    <div class="check-item">
                        <span class="check-icon">🙈</span>
                        <span>Campos ocultos: <strong>${data.analysis?.hiddenFields?.join(', ') || 'Nenhum'}</strong></span>
                    </div>
                    <div class="check-item">
                        <span class="check-icon">🔒</span>
                        <span>Nível de privacidade: <strong class="privacy-level ${data.analysis?.privacyLevel}">${data.analysis?.privacyLevel || 'N/A'}</strong></span>
                    </div>
                </div>
                <details>
                    <summary>🔍 Detalhes Técnicos Completos</summary>
                    <div class="json-viewer">${JSON.stringify(data, null, 2)}</div>
                </details>
            </div>
        `;
        return;
    }
    
    // CASO PADRÃO: Resultado normal
    const cssClass = isError ? 'error' : 'success';
    element.innerHTML = `
        <div class="result ${cssClass}">
            <h4>${isError ? '❌ Erro' : '✅ Sucesso'}</h4>
            <div class="json-viewer">${JSON.stringify(data, null, 2)}</div>
        </div>
    `;
}

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API Error');
        }
        
        return result;
    } catch (error) {
        throw new Error(`API Call failed: ${error.message}`);
    }
}

// Issuer functions
async function getIssuerInfo() {
    showLoading('issuerResults');
    try {
        const data = await apiCall('/issuer/info');
        showResult('issuerResults', data);
    } catch (error) {
        showResult('issuerResults', { error: error.message }, true);
    }
}

async function getIssuerTemplates() {
    showLoading('issuerResults');
    try {
        const data = await apiCall('/issuer/templates');
        showResult('issuerResults', data);
    } catch (error) {
        showResult('issuerResults', { error: error.message }, true);
    }
}

async function getIssuedCredentials() {
    showLoading('issuerResults');
    try {
        const data = await apiCall('/issuer/credentials');
        showResult('issuerResults', data);
    } catch (error) {
        showResult('issuerResults', { error: error.message }, true);
    }
}

async function issueCredential() {
    showLoading('issueResults');
    try {
        const templateId = document.getElementById('issuerTemplate').value;
        const subjectId = document.getElementById('issuerSubjectId').value || "did:example:student-" + Date.now();
        const name = document.getElementById('issuerStudentName').value;
        const degreeDataText = document.getElementById('issuerDegreeData').value;
        const gpa = document.getElementById('issuerGpa').value;
        
        const degreeData = JSON.parse(degreeDataText);
        
        const credentialData = {
            subjectId,
            name,
            degree: degreeData,
            gpa
        };
        
        const data = await apiCall('/issuer/issue', 'POST', {
            templateId,
            credentialData
        });
        
        showResult('issueResults', data);
    } catch (error) {
        showResult('issueResults', { error: error.message }, true);
    }
}

// Holder functions
async function getHolderInfo() {
    showLoading('holderResults');
    try {
        const data = await apiCall('/holder/info');
        showResult('holderResults', data);
    } catch (error) {
        showResult('holderResults', { error: error.message }, true);
    }
}

async function getHolderCredentials() {
    showLoading('holderResults');
    try {
        const data = await apiCall('/holder/credentials');
        showResult('holderResults', data);
    } catch (error) {
        showResult('holderResults', { error: error.message }, true);
    }
}

async function getHolderPresentations() {
    showLoading('holderResults');
    try {
        const data = await apiCall('/holder/presentations');
        showResult('holderResults', data);
    } catch (error) {
        showResult('holderResults', { error: error.message }, true);
    }
}

async function receiveCredential() {
    showLoading('receiveResults');
    try {
        const credentialText = document.getElementById('holderCredentialJson').value;
        
        if (!credentialText.trim()) {
            throw new Error('Cole o JSON da credencial primeiro');
        }
        
        let parsedData = JSON.parse(credentialText);
        let credential = null;
        
        // Extrair credencial da resposta do issuer
        if (parsedData.credentialSubject) {
            credential = parsedData;
        } else if (parsedData.credential && parsedData.credential.credentialSubject) {
            credential = parsedData.credential;
        } else {
            throw new Error('Estrutura de credencial inválida');
        }
        
        const data = await apiCall('/holder/receive', 'POST', {
            credential,
            metadata: {
                receivedAt: new Date().toISOString(),
                source: 'manual-demo'
            }
        });
        
        showResult('receiveResults', {
            success: true,
            credentialId: data.credentialId,
            message: 'Credencial recebida com sucesso!'
        });
        
        setTimeout(getHolderCredentials, 500);
        
    } catch (error) {
        showResult('receiveResults', { error: error.message }, true);
    }
}

async function loadHolderCredentials() {
    try {
        const credentials = await apiCall('/holder/credentials');
        const select = document.getElementById('holderCredentialSelect');
        
        select.innerHTML = '<option value="">Selecione uma credencial...</option>';
        
        credentials.forEach(cred => {
            const option = document.createElement('option');
            option.value = cred.id;
            option.textContent = `${cred.id} (${cred.type.join(', ')})`;
            option.dataset.fields = JSON.stringify(cred.selectiveFields);
            select.appendChild(option);
        });
        
        select.onchange = function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.dataset.fields) {
                const fields = JSON.parse(selectedOption.dataset.fields);
                updateFieldsSelector(fields);
            }
        };
        
    } catch (error) {
        console.error('Error loading credentials:', error);
    }
}

function updateFieldsSelector(fields) {
    const fieldsSelector = document.getElementById('fieldsSelector');
    fieldsSelector.innerHTML = '';
    
    fields.forEach(field => {
        const fieldItem = document.createElement('div');
        fieldItem.className = 'field-item';
        fieldItem.innerHTML = `
            <input type="checkbox" id="field-${field}" value="${field}" checked>
            <label for="field-${field}">${field}</label>
        `;
        fieldsSelector.appendChild(fieldItem);
    });
}

async function createPresentation() {
    showLoading('presentationResults');
    try {
        const credentialId = document.getElementById('holderCredentialSelect').value;
        const challenge = document.getElementById('holderChallenge').value;
        const domain = document.getElementById('holderDomain').value;
        
        if (!credentialId) {
            throw new Error('Selecione uma credencial primeiro');
        }
        
        const selectedFields = [];
        const hiddenFields = [];
        
        document.querySelectorAll('#fieldsSelector input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.checked) {
                selectedFields.push(checkbox.value);
            } else {
                hiddenFields.push(checkbox.value);
            }
        });
        
        const data = await apiCall('/holder/present', 'POST', {
            credentialId,
            revealFields: selectedFields,
            hideFields: hiddenFields,
            challenge: challenge || undefined,
            domain: domain || undefined
        });
        
        showResult('presentationResults', data);
    } catch (error) {
        showResult('presentationResults', { error: error.message }, true);
    }
}

// Verifier functions
async function getVerifierInfo() {
    showLoading('verifierResults');
    try {
        const data = await apiCall('/verifier/info');
        showResult('verifierResults', data);
    } catch (error) {
        showResult('verifierResults', { error: error.message }, true);
    }
}

async function getVerifierTemplates() {
    showLoading('verifierResults');
    try {
        const data = await apiCall('/verifier/templates');
        showResult('verifierResults', data);
    } catch (error) {
        showResult('verifierResults', { error: error.message }, true);
    }
}

async function getVerificationHistory() {
    showLoading('verifierResults');
    try {
        const data = await apiCall('/verifier/history');
        showResult('verifierResults', data);
    } catch (error) {
        showResult('verifierResults', { error: error.message }, true);
    }
}

async function verifyPresentation() {
    showLoading('verificationResults');
    try {
        const presentationText = document.getElementById('verifierPresentation').value;
        
        if (!presentationText.trim()) {
            throw new Error('Cole uma apresentação JSON para verificar');
        }
        
        const presentation = JSON.parse(presentationText);
        
        const data = await apiCall('/verifier/verify', 'POST', {
            presentation
        });
        
        showResult('verificationResults', data);
    } catch (error) {
        showResult('verificationResults', { error: error.message }, true);
    }
}

// Revocation functions
async function getRevokedCredentials() {
    showLoading('revocationResults');
    try {
        const data = await apiCall('/issuer/revoked');
        showResult('revocationResults', data);
    } catch (error) {
        showResult('revocationResults', { error: error.message }, true);
    }
}

async function getRevocationStats() {
    showLoading('revocationResults');
    try {
        const data = await apiCall('/issuer/revocation-stats');
        showResult('revocationResults', data);
    } catch (error) {
        showResult('revocationResults', { error: error.message }, true);
    }
}

async function revokeCredential() {
    showLoading('revokeResults');
    try {
        const credentialId = document.getElementById('revokeCredentialId').value;
        const reason = document.getElementById('revokeReason').value;
        
        if (!credentialId.trim()) {
            throw new Error('ID da credencial é obrigatório');
        }
        
        const data = await apiCall('/issuer/revoke', 'POST', {
            credentialId: credentialId.trim(),
            reason,
            metadata: {
                revokedVia: 'web-interface',
                timestamp: new Date().toISOString()
            }
        });
        
        showResult('revokeResults', {
            success: true,
            message: `Credencial ${credentialId} foi revogada com sucesso`,
            revocationInfo: data
        });
        
        document.getElementById('revokeCredentialId').value = '';
        setTimeout(getRevocationStats, 500);
        
    } catch (error) {
        showResult('revokeResults', { error: error.message }, true);
    }
}

// Adicionar esta função para debug:

async function debugVerifierStatus() {
    try {
        const status = await apiCall('/verifier/info');
        console.log('🔍 Verifier Status:', status);
        
        if (!status.serviceStatus.fullyInitialized) {
            alert('⚠️ Verifier não está totalmente inicializado!');
        } else {
            alert('✅ Verifier está funcionando corretamente');
        }
    } catch (error) {
        console.error('Debug error:', error);
        alert('❌ Erro ao verificar status: ' + error.message);
    }
}

// Adicionar esta função de debug:

async function debugPresentationStructure() {
    try {
        console.log('🔍 Testing presentation creation...');
        
        // Primeiro, criar uma credencial de teste
        const credentialResult = await apiCall('/issuer/issue', {
            templateId: 'UniversityDegree',
            credentialData: {
                subjectId: 'did:example:student123',
                name: 'Test Student',
                degree: {
                    type: 'BachelorDegree',
                    university: 'Test University',
                    graduationDate: '2023-06-15'
                },
                gpa: 3.8
            },
            selectiveFields: ['name', 'university']
        });
        
        console.log('✅ Credential created:', credentialResult);
        
        // Receber no holder
        const receiveResult = await apiCall('/holder/credentials', {
            method: 'POST',
            body: JSON.stringify({
                credential: credentialResult.credential
            })
        });
        
        console.log('✅ Credential received in holder:', receiveResult);
        
        // Criar apresentação
        const presentationResult = await apiCall('/holder/present', {
            credentialId: receiveResult.credentialId,
            challenge: 'test-challenge-' + Date.now(),
            domain: 'test.example.com'
        });
        
        console.log('✅ Presentation created:', presentationResult);
        console.log('📋 Presentation type:', presentationResult.presentation?.type);
        console.log('📋 Presentation structure:', JSON.stringify(presentationResult.presentation, null, 2));
        
        alert('✅ Debug completo - veja o console para detalhes');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        alert('❌ Erro no debug: ' + error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 VC Demo Interface loaded');
    
    fetch(`${API_BASE}/health`)
        .then(response => response.json())
        .then(data => console.log('✅ API connection OK:', data))
        .catch(error => {
            console.error('❌ API connection failed:', error);
            alert('⚠️ Backend API não disponível. Execute: node server.js');
        });
});