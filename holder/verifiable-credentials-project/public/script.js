// Estado global para credenciais e apresentações múltiplas
const credentialManager = {
    credentials: new Map(),
    selectedCredentials: new Set()
};

const presentationManager = {
    presentations: new Map(),
    selectedPresentation: null
};

const certificationFlow = {
    personalVC: null,
    requestId: null,
    challenge: null,
    domain: null
};

// Tab functionality (MELHORADA)
function showTab(tabName) {
    console.log(`Mudando para aba: ${tabName}`);
    
    // Remover classes ativas
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    
    // Adicionar classes ativas
    const targetTab = document.getElementById(`${tabName}-tab`);
    const targetButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetButton) targetButton.classList.add('active');
    
    // Carregar dados específicos da aba
    if (tabName === 'credential') {
        loadAllCredentials();
    } else if (tabName === 'presentation') {
        loadAllPresentations();
        
        // Garantir que a seção de display está visível
        const displaySection = document.querySelector('.presentation-display-section');
        if (displaySection) {
            displaySection.style.display = 'block';
        }
    }
}

// Carregar todas as credenciais do servidor (MODIFICADO para incluir ficheiros existentes)
async function loadAllCredentials() {
    try {
        console.log('📂 Carregando credenciais do storage...');
        
        // Primeiro carregar do storage
        const response = await fetch('/api/credentials');
        if (response.ok) {
            const result = await response.json();
            credentialManager.credentials.clear();
            
            result.credentials.forEach(credData => {
                credentialManager.credentials.set(credData.id, credData);
            });
            
            console.log(`✅ ${result.count} credencial(ais) carregada(s) do storage`);
        }
        
        // Depois carregar ficheiros existentes
        console.log('📁 Procurando ficheiros existentes...');
        const filesResponse = await fetch('/api/load-existing-files');
        if (filesResponse.ok) {
            const filesResult = await filesResponse.json();
            console.log(`📄 ${filesResult.loadedCount} credencial(ais) carregada(s) de ficheiros`);
            
            if (filesResult.loadedCount > 0) {
                // Recarregar do storage para incluir os novos
                const refreshResponse = await fetch('/api/credentials');
                if (refreshResponse.ok) {
                    const refreshResult = await refreshResponse.json();
                    credentialManager.credentials.clear();
                    
                    refreshResult.credentials.forEach(credData => {
                        credentialManager.credentials.set(credData.id, credData);
                    });
                }
                
                showNotification(`📁 ${filesResult.loadedCount} credencial(ais) carregada(s) de ficheiros existentes`, 'success');
            }
        }
        
        updateCredentialsList();
        console.log(`📊 Total de credenciais disponíveis: ${credentialManager.credentials.size}`);
        
    } catch (error) {
        console.error('Erro ao carregar credenciais:', error);
        showNotification('❌ Erro ao carregar credenciais', 'error');
    }
}

// Atualizar lista visual de credenciais (MODIFICADA para ordenar)
function updateCredentialsList() {
    const container = document.getElementById('credentials-list');
    if (!container) return;
    
    if (credentialManager.credentials.size === 0) {
        container.innerHTML = '<div class="no-credentials">Nenhuma credencial disponível</div>';
        document.getElementById('vp-creation-section').style.display = 'none';
        return;
    }
    
    // Ordenar credenciais: originalVC primeiro, depois por data
    const sortedCredentials = Array.from(credentialManager.credentials.entries())
        .sort(([idA, dataA], [idB, dataB]) => {
            if (idA === 'originalVC') return -1;
            if (idB === 'originalVC') return 1;
            return new Date(dataB.savedAt) - new Date(dataA.savedAt); // mais recentes primeiro
        });
    
    container.innerHTML = sortedCredentials
        .map(([id, data]) => createCredentialCard(id, data))
        .join('');
    
    updateVPCreationSection();
}

// Criar card de credencial (MELHORADO)
function createCredentialCard(id, data) {
    const isSelected = credentialManager.selectedCredentials.has(id);
    const isOriginal = id === 'originalVC';
    
    // Definir ícone baseado no tipo
    let typeIcon = '📄'; // default
    if (data.type === 'university_degree') {
        typeIcon = '🎓';
    } else if (data.type === 'personal_data') {
        typeIcon = '👤';
    }
    
    // Adicionar badge para credencial original
    const originalBadge = isOriginal ? '<span class="original-badge">ORIGINAL</span>' : '';
    
    return `
        <div class="credential-card ${isSelected ? 'selected' : ''} ${isOriginal ? 'original-credential' : ''}" data-type="${data.type}">
            <div class="credential-header">
                <div class="credential-info">
                    <span class="credential-icon">${typeIcon}</span>
                    <div>
                        <h4>${data.name} ${originalBadge}</h4>
                        <small>Salva em: ${new Date(data.savedAt).toLocaleString('pt-PT')}</small>
                        <small class="credential-id">ID: ${id}</small>
                        ${isOriginal ? '<small class="original-note">💡 Gera "originalVP" quando usada sozinha</small>' : ''}
                    </div>
                </div>
                <div class="credential-actions">
                    <input type="checkbox" 
                           id="select-${id}" 
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleCredentialSelection('${id}')">
                    <label for="select-${id}" class="checkbox-label">Incluir na VP</label>
                    <button onclick="viewCredential('${id}')" class="btn-small">👁️</button>
                    ${!isOriginal ? `<button onclick="removeCredential('${id}')" class="btn-small btn-danger">🗑️</button>` : ''}
                </div>
            </div>
            <div class="credential-preview">
                <div class="credential-details">
                    ${getCredentialPreview(data)}
                </div>
            </div>
        </div>
    `;
}

// Nova função para gerar preview baseado no tipo
function getCredentialPreview(data) {
    const subject = data.credential.credentialSubject;
    
    if (data.type === 'university_degree') {
        return `
            <span><strong>Estudante:</strong> ${subject.studentName}</span>
            <span><strong>Grau:</strong> ${subject.degreeName}</span>
            <span><strong>Instituição:</strong> ${subject.institution}</span>
            <span><strong>Nota:</strong> ${subject.finalGrade}/20</span>
        `;
    } else {
        return `
            <span><strong>Nome:</strong> ${subject.name}</span>
            <span><strong>Nascimento:</strong> ${subject.birthDate}</span>
            <span><strong>Nacionalidade:</strong> ${subject.nationality}</span>
        `;
    }
}

// Funções para gerenciar seleção
window.toggleCredentialSelection = function(id) {
    if (credentialManager.selectedCredentials.has(id)) {
        credentialManager.selectedCredentials.delete(id);
    } else {
        credentialManager.selectedCredentials.add(id);
    }
    updateCredentialsList();
};

window.viewCredential = function(id) {
    const credentialData = credentialManager.credentials.get(id);
    if (credentialData) {
        displayJSON('vc-display', credentialData.credential);
    }
};

// Remover credencial (CORRIGIDO - proteger VC original)
window.removeCredential = async function(id) {
    const credentialData = credentialManager.credentials.get(id);
    if (!credentialData) {
        showNotification('❌ Credencial não encontrada', 'error');
        return;
    }
    
    // **IMPORTANTE: Proteger credencial original**
    if (id === 'originalVC') {
        if (!confirm('⚠️ ATENÇÃO: Esta é sua credencial ORIGINAL!\n\n' +
                    'A credencial original é especial e gera "originalVP" quando usada sozinha.\n' +
                    'Tem CERTEZA que deseja removê-la?\n\n' +
                    'Esta ação irá apagar o ficheiro físico e não pode ser desfeita!\n' +
                    'Recomendamos manter a credencial original.')) {
            showNotification('✅ Credencial original preservada', 'info');
            return;
        }
    }
    
    // Confirmação normal para outras credenciais
    if (id !== 'originalVC') {
        const confirmMessage = `Tem certeza que deseja remover esta credencial?\n\n` +
                              `Nome: ${credentialData.name}\n` +
                              `Tipo: ${credentialData.type}\n` +
                              `ID: ${id}\n\n` +
                              `⚠️ Esta ação irá apagar o ficheiro físico e não pode ser desfeita!`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
    }
    
    try {
        console.log(`🗑️ Removendo credencial: ${credentialData.name} (${id})`);
        
        const response = await fetch(`/api/credentials/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Remover do storage local
            credentialManager.credentials.delete(id);
            credentialManager.selectedCredentials.delete(id);
            
            // Atualizar interface
            updateCredentialsList();
            
            // Limpar display se estava a mostrar esta credencial
            const currentDisplay = document.getElementById('vc-display');
            if (currentDisplay && currentDisplay.innerHTML.includes(id)) {
                currentDisplay.innerHTML = '<p class="placeholder-text">Selecione uma credencial para visualizar</p>';
            }
            
            const message = result.filesDeleted > 0 ? 
                `✅ Credencial removida e ${result.filesDeleted} ficheiro(s) apagado(s)` :
                `✅ Credencial removida`;
            
            showNotification(message, 'success');
            console.log(`✅ Credencial ${id} removida com sucesso`);
            
            // Se removeu a original, avisar
            if (id === 'originalVC') {
                showNotification('⚠️ Credencial original removida! Considere criar uma nova.', 'warning', 6000);
            }
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao remover credencial');
        }
    } catch (error) {
        console.error('Erro ao remover credencial:', error);
        showNotification(`❌ Erro ao remover credencial: ${error.message}`, 'error');
    }
};

// Atualizar seção de criação de VP
function updateVPCreationSection() {
    const vpSection = document.getElementById('vp-creation-section');
    const selectedCount = credentialManager.selectedCredentials.size;
    
    if (selectedCount > 0) {
        vpSection.style.display = 'block';
        
        const counterElement = document.getElementById('selected-credentials-count');
        if (counterElement) {
            counterElement.textContent = `${selectedCount} credencial(ais) selecionada(s)`;
        }
        
        // Mostrar lista das credenciais selecionadas
        const selectedListElement = document.getElementById('selected-credentials-list');
        if (selectedListElement) {
            const selectedNames = Array.from(credentialManager.selectedCredentials)
                .map(id => credentialManager.credentials.get(id)?.name)
                .filter(name => name);
            
            selectedListElement.innerHTML = selectedNames
                .map(name => `<li>${name}</li>`)
                .join('');
        }
    } else {
        vpSection.style.display = 'none';
    }
}

// Load and display presentation (CORRIGIDA)
function loadPresentation(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const presentation = JSON.parse(e.target.result);
            
            // Validar se é uma apresentação válida
            if (!presentation.type || !presentation.type.includes('VerifiablePresentation')) {
                throw new Error('Arquivo não é uma apresentação verificável válida');
            }
            
            // Exibir a apresentação
            displayJSON('vp-display', presentation);
            
            // Salvar no storage local se ainda não existir
            const vpId = `uploaded_vp_${Date.now()}`;
            const presentationData = {
                id: vpId,
                presentation,
                createdAt: new Date().toISOString(),
                name: `VP Carregada - ${new Date().toLocaleDateString('pt-PT')}`,
                selectedCredentials: presentation.verifiableCredential ? 
                    presentation.verifiableCredential.map((_, index) => `Credencial ${index + 1}`) : [],
                challenge: 'N/A',
                domain: 'N/A',
                holder: presentation.holder
            };
            
            presentationManager.presentations.set(vpId, presentationData);
            updatePresentationsList();
            
            showNotification('✅ Apresentação carregada e exibida com sucesso!', 'success');
            
            // Garantir que a aba de apresentação está ativa
            showTab('presentation');
            
        } catch (error) {
            console.error('Erro ao carregar apresentação:', error);
            showNotification(`❌ Erro ao carregar apresentação: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Display JSON with syntax highlighting (MELHORADA)
function displayJSON(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Elemento ${elementId} não encontrado`);
        return;
    }
    
    // Garantir que o elemento está visível
    element.style.display = 'block';
    element.innerHTML = `<pre>${syntaxHighlight(JSON.stringify(data, null, 2))}</pre>`;
    
    // Se for vp-display, garantir que a seção está visível
    if (elementId === 'vp-display') {
        const presentationSection = element.closest('.presentation-display-section');
        if (presentationSection) {
            presentationSection.style.display = 'block';
        }
        
        // Scroll para o elemento
        element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        console.log('VP exibida no elemento vp-display');
    }
    
    // Se for vc-display, mostrar seção de VP se for credencial
    if (elementId === 'vc-display' && data.type?.includes('VerifiableCredential')) {
        const vpSection = document.getElementById('vp-creation-section');
        if (vpSection) {
            vpSection.style.display = 'block';
        }
    }
}

// Funções para gerenciar apresentações (MELHORADAS)
window.viewPresentation = function(id) {
    const presentationData = presentationManager.presentations.get(id);
    if (presentationData) {
        console.log('Carregando apresentação:', presentationData.name);
        
        // Exibir a apresentação
        displayJSON('vp-display', presentationData.presentation);
        
        // Marcar como selecionada
        presentationManager.selectedPresentation = id;
        updatePresentationsList();
        
        // Mostrar notificação
        showNotification(`Apresentação "${presentationData.name}" carregada`, 'info');
        
        // Garantir que estamos na aba correta
        const presentationTab = document.getElementById('presentation-tab');
        if (presentationTab && !presentationTab.classList.contains('active')) {
            showTab('presentation');
        }
        
        // Scroll para a visualização
        const vpDisplay = document.getElementById('vp-display');
        if (vpDisplay) {
            setTimeout(() => {
                vpDisplay.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    } else {
        console.error('Apresentação não encontrada:', id);
        showNotification('❌ Apresentação não encontrada', 'error');
    }
};

// Display JSON with syntax highlighting
function displayJSON(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = `<pre>${syntaxHighlight(JSON.stringify(data, null, 2))}</pre>`;
    element.style.display = 'block';
    
    // Show VP creation section if it's a credential
    if (elementId === 'vc-display' && data.type?.includes('VerifiableCredential')) {
        const vpSection = document.getElementById('vp-creation-section');
        if (vpSection) vpSection.style.display = 'block';
    }
}

// Simple syntax highlighting for JSON
function syntaxHighlight(json) {
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}

// Save credential to server (MODIFICADA para certificates)
async function saveCredentialToServer(credential, customName = null) {
    try {
        // Determinar endpoint baseado no tipo
        const isUniversityDegree = credential.type?.includes('UniversityDegreeCredential');
        const endpoint = isUniversityDegree ? '/api/save-certificate-auto' : '/api/save-credential';
        
        const requestBody = isUniversityDegree ? 
            { credential } : 
            { credential, customName };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || 'Falha ao salvar credencial');
        }
        
        const result = await response.json();
        
        // Adicionar à lista local
        credentialManager.credentials.set(result.credentialId, result.credentialData);
        updateCredentialsList();
        
        const message = isUniversityDegree ? 
            '🎓 Certificado universitário salvo automaticamente!' :
            '✅ Credencial salva com sucesso!';
        
        showNotification(message, 'success');
        return result.credentialId;
    } catch (error) {
        showNotification(`❌ Erro ao salvar credencial: ${error.message}`, 'error');
        throw error;
    }
}

// Load and display credential
async function loadCredential(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const credential = JSON.parse(e.target.result);
            displayJSON('vc-display', credential);
            await saveCredentialToServer(credential);
            showNotification('Credencial carregada com sucesso!', 'success');
        } catch (error) {
            showNotification(`Erro ao carregar credencial: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Load and display presentation
function loadPresentation(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const presentation = JSON.parse(e.target.result);
            
            // Validar se é uma apresentação válida
            if (!presentation.type || !presentation.type.includes('VerifiablePresentation')) {
                throw new Error('Arquivo não é uma apresentação verificável válida');
            }
            
            // Exibir a apresentação
            displayJSON('vp-display', presentation);
            
            // Salvar no storage local se ainda não existir
            const vpId = `uploaded_vp_${Date.now()}`;
            const presentationData = {
                id: vpId,
                presentation,
                createdAt: new Date().toISOString(),
                name: `VP Carregada - ${new Date().toLocaleDateString('pt-PT')}`,
                selectedCredentials: presentation.verifiableCredential ? 
                    presentation.verifiableCredential.map((_, index) => `Credencial ${index + 1}`) : [],
                challenge: 'N/A',
                domain: 'N/A',
                holder: presentation.holder
            };
            
            presentationManager.presentations.set(vpId, presentationData);
            updatePresentationsList();
            
            showNotification('✅ Apresentação carregada e exibida com sucesso!', 'success');
            
            // Garantir que a aba de apresentação está ativa
            showTab('presentation');
            
        } catch (error) {
            console.error('Erro ao carregar apresentação:', error);
            showNotification(`❌ Erro ao carregar apresentação: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// API call helper
async function apiCall(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro na requisição');
    return result;
}

// Handle form submission for personal data (MODIFICADO)
document.getElementById('personal-data-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        id: document.getElementById('holder-id').value,
        name: document.getElementById('holder-name').value,
        birthDate: document.getElementById('holder-birthdate').value,
        nationality: document.getElementById('holder-nationality').value
    };
    
    const resultArea = document.getElementById('personal-data-result');
    resultArea.innerHTML = `<div class="loading"><div class="spinner"></div><p>Solicitando credencial...</p></div>`;
    
    try {
        const result = await apiCall('http://localhost:3000/api/issue', formData);
        
        // Verificar se já existe uma credencial original
        const hasOriginal = credentialManager.credentials.has('originalVC');
        
        // Salvar sempre como originalVC para a primeira credencial de dados pessoais
        const credentialId = await saveCredentialToServer(
            result.verifiableCredential, 
            hasOriginal ? null : 'originalVC' // null = ID automático se já tem original
        );
        
        displayJSON('vc-display', result.verifiableCredential);
        
        const isOriginal = credentialId === 'originalVC';
        const statusMessage = isOriginal ? 
            'Credencial original armazenada como "originalVC"' :
            'Nova credencial de dados pessoais armazenada';
        
        resultArea.innerHTML = `
            <div class="success">
                <h3>✅ Credencial recebida!</h3>
                <p><strong>${statusMessage}</strong></p>
                <pre>${syntaxHighlight(JSON.stringify(result.verifiableCredential, null, 2))}</pre>
                <p>Credencial disponível na aba "Credencial".</p>
                <button onclick="showTab('credential')" class="btn-secondary">Ver Credenciais</button>
                ${isOriginal ? '<p><em>💡 Esta é sua credencial original - criará "originalVP" quando usada sozinha.</em></p>' : ''}
            </div>
        `;
    } catch (error) {
        resultArea.innerHTML = `
            <div class="error">
                <h3>❌ Erro ao solicitar credencial</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
});

// Carregar todas as apresentações do servidor (MODIFICADO para incluir ficheiros existentes)
async function loadAllPresentations() {
    try {
        console.log('🎭 Carregando apresentações do storage...');
        
        // Primeiro carregar do storage
        const response = await fetch('/api/presentations');
        if (response.ok) {
            const result = await response.json();
            presentationManager.presentations.clear();
            
            result.presentations.forEach(presData => {
                presentationManager.presentations.set(presData.id, presData);
            });
            
            console.log(`✅ ${result.count} apresentação(ões) carregada(s) do storage`);
        }
        
        // Depois carregar ficheiros existentes
        console.log('📁 Procurando ficheiros de apresentação existentes...');
        const filesResponse = await fetch('/api/load-existing-presentations');
        if (filesResponse.ok) {
            const filesResult = await filesResponse.json();
            console.log(`🎭 ${filesResult.loadedCount} apresentação(ões) carregada(s) de ficheiros`);
            
            if (filesResult.loadedCount > 0) {
                // Recarregar do storage para incluir os novos
                const refreshResponse = await fetch('/api/presentations');
                if (refreshResponse.ok) {
                    const refreshResult = await refreshResponse.json();
                    presentationManager.presentations.clear();
                    
                    refreshResult.presentations.forEach(presData => {
                        presentationManager.presentations.set(presData.id, presData);
                    });
                }
                
                showNotification(`🎭 ${filesResult.loadedCount} apresentação(ões) carregada(s) de ficheiros existentes`, 'success', 4000);
            }
        }
        
        updatePresentationsList();
        console.log(`📊 Total de apresentações disponíveis: ${presentationManager.presentations.size}`);
        
    } catch (error) {
        console.error('Erro ao carregar apresentações:', error);
        showNotification('❌ Erro ao carregar apresentações', 'error');
    }
}

// Atualizar lista visual de apresentações
function updatePresentationsList() {
    const container = document.getElementById('presentations-list');
    if (!container) return;
    
    if (presentationManager.presentations.size === 0) {
        container.innerHTML = '<div class="no-presentations">Nenhuma apresentação disponível</div>';
        return;
    }
    
    // Ordenar apresentações por data (mais recentes primeiro)
    const sortedPresentations = Array.from(presentationManager.presentations.entries())
        .sort(([idA, dataA], [idB, dataB]) => new Date(dataB.createdAt) - new Date(dataA.createdAt));
    
    container.innerHTML = sortedPresentations
        .map(([id, data]) => createPresentationCard(id, data))
        .join('');
}

// Criar card de apresentação
function createPresentationCard(id, data) {
    const isSelected = presentationManager.selectedPresentation === id;
    
    return `
        <div class="presentation-card ${isSelected ? 'selected' : ''}">
            <div class="presentation-header">
                <div class="presentation-info">
                    <span class="presentation-icon">🎭</span>
                    <div>
                        <h4>${data.name}</h4>
                        <small>Criada em: ${new Date(data.createdAt).toLocaleString('pt-PT')}</small>
                        <small>Holder: ${data.holder}</small>
                    </div>
                </div>
                <div class="presentation-actions">
                    <button onclick="viewPresentation('${id}')" class="btn-small">👁️</button>
                    <button onclick="downloadPresentation('${id}')" class="btn-small">💾</button>
                    <button onclick="removePresentation('${id}')" class="btn-small btn-danger">🗑️</button>
                </div>
            </div>
            <div class="presentation-preview">
                <div class="presentation-details">
                    <span><strong>Credenciais incluídas:</strong> ${data.selectedCredentials.join(', ')}</span>
                    <span><strong>Challenge:</strong> ${data.challenge}</span>
                    <span><strong>Domain:</strong> ${data.domain}</span>
                </div>
            </div>
        </div>
    `;
}

// Funções para gerenciar apresentações
window.viewPresentation = function(id) {
    const presentationData = presentationManager.presentations.get(id);
    if (presentationData) {
        console.log('Carregando apresentação:', presentationData.name);
        
        // Exibir a apresentação
        displayJSON('vp-display', presentationData.presentation);
        
        // Marcar como selecionada
        presentationManager.selectedPresentation = id;
        updatePresentationsList();
        
        // Mostrar notificação
        showNotification(`Apresentação "${presentationData.name}" carregada`, 'info');
        
        // Garantir que estamos na aba correta
        const presentationTab = document.getElementById('presentation-tab');
        if (presentationTab && !presentationTab.classList.contains('active')) {
            showTab('presentation');
        }
        
        // Scroll para a visualização
        const vpDisplay = document.getElementById('vp-display');
        if (vpDisplay) {
            setTimeout(() => {
                vpDisplay.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 100);
        }
    } else {
        console.error('Apresentação não encontrada:', id);
        showNotification('❌ Apresentação não encontrada', 'error');
    }
};

window.downloadPresentation = function(id) {
    const presentationData = presentationManager.presentations.get(id);
    if (presentationData) {
        const blob = new Blob([JSON.stringify(presentationData.presentation, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${presentationData.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('📁 Apresentação baixada com sucesso!', 'success');
    }
};

window.removePresentation = async function(id) {
    const presentationData = presentationManager.presentations.get(id);
    if (!presentationData) {
        showNotification('❌ Apresentação não encontrada', 'error');
        return;
    }
    
    const confirmMessage = `Tem certeza que deseja remover esta apresentação?\n\n` +
                          `Nome: ${presentationData.name}\n` +
                          `ID: ${id}\n` +
                          `Credenciais: ${presentationData.selectedCredentials.length}\n\n` +
                          `⚠️ Esta ação irá apagar o ficheiro físico e não pode ser desfeita!`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log(`🗑️ Removendo apresentação: ${presentationData.name} (${id})`);
        
        const response = await fetch(`/api/presentations/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Remover do storage local
            presentationManager.presentations.delete(id);
            if (presentationManager.selectedPresentation === id) {
                presentationManager.selectedPresentation = null;
            }
            
            // Atualizar interface
            updatePresentationsList();
            
            // Limpar display se estava a mostrar esta apresentação
            const currentDisplay = document.getElementById('vp-display');
            if (currentDisplay && currentDisplay.innerHTML.includes(id)) {
                currentDisplay.innerHTML = '<p class="placeholder-text">Selecione uma apresentação para visualizar</p>';
            }
            
            showNotification('✅ Apresentação removida com sucesso', 'success');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao remover apresentação');
        }
    } catch (error) {
        console.error('Erro ao remover apresentação:', error);
        showNotification(`❌ Erro ao remover apresentação: ${error.message}`, 'error');
    }
};

// Create VP form handler (MODIFICADO para nome personalizado)
document.getElementById('create-vp-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (credentialManager.selectedCredentials.size === 0) {
        showNotification('❌ Selecione pelo menos uma credencial para criar a VP', 'error');
        return;
    }
    
    const submitButton = this.querySelector('button[type="submit"]');
    if (submitButton.disabled) {
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = 'Criando VP...';
    
    try {
        console.log('🎭 Iniciando criação de ÚNICA VP...');
        console.log('📋 Credenciais selecionadas:', Array.from(credentialManager.selectedCredentials));
        
        const selectedIds = Array.from(credentialManager.selectedCredentials);
        console.log('🔍 Verificando credenciais no storage:');
        selectedIds.forEach(id => {
            const credData = credentialManager.credentials.get(id);
            if (credData) {
                console.log(`  ✅ ${id}: ${credData.name} (${credData.type})`);
            } else {
                console.log(`  ❌ ${id}: NÃO ENCONTRADA`);
            }
        });
        
        const formData = {
            challenge: document.getElementById('vp-challenge').value,
            domain: document.getElementById('vp-domain').value,
            holderDid: document.getElementById('vp-holder-did').value || undefined,
            selectedCredentials: selectedIds,
            customName: document.getElementById('vp-custom-name').value || undefined
        };
        
        console.log('📤 Enviando dados para servidor (UMA VEZ):', formData);
        
        // **IMPORTANTE: Apenas uma requisição**
        const response = await fetch('/api/create-presentation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao criar apresentação');
        }
        
        console.log('✅ ÚNICA VP criada com sucesso:', result);
        
        // Verificar quantas credenciais estão na VP criada
        const vpCredentials = result.presentation?.verifiableCredential || [];
        console.log(`📊 VP contém ${vpCredentials.length} credencial(ais) - esperado: ${selectedIds.length}`);
        
        if (vpCredentials.length === selectedIds.length) {
            console.log('✅ Perfeito! VP contém exatamente as credenciais esperadas');
        } else {
            console.warn(`⚠️ Mismatch: Esperado ${selectedIds.length}, obtido ${vpCredentials.length}`);
        }
        
        displayJSON('vp-display', result.presentation);
        
        // Adicionar VP à lista local
        presentationManager.presentations.set(result.presentationId, result.presentationData);
        updatePresentationsList();
        
        resultArea.innerHTML = `
            <div class="success">
                <h3>✅ ÚNICA Apresentação criada!</h3>
                <p><strong>Nome:</strong> ${result.presentationData.name}</p>
                <p><strong>ID:</strong> ${result.presentationId}</p>
                <p><strong>Arquivo:</strong> ${result.vpFileName}</p>
                <p><strong>Credenciais incluídas:</strong> ${result.selectedCredentialsCount} de ${selectedIds.length} selecionadas</p>
                <p><strong>IDs das credenciais:</strong> ${result.selectedCredentialIds.join(', ')}</p>
                <button onclick="showTab('presentation')" class="btn-secondary">Ver Apresentações</button>
            </div>
        `;
        
        // Limpar seleções
        credentialManager.selectedCredentials.clear();
        document.getElementById('vp-custom-name').value = '';
        updateCredentialsList();
        
        // **REMOVER: Não mostrar notificação de sucesso redundante**
        // showNotification('✅ VP única criada com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao criar apresentação:', error);
        const resultArea = document.getElementById('vp-creation-result');
        resultArea.innerHTML = `
            <div class="error">
                <h3>❌ Erro ao criar apresentação</h3>
                <p>${error.message}</p>
                <p><strong>Debug:</strong> Credenciais selecionadas: ${Array.from(credentialManager.selectedCredentials).join(', ')}</p>
            </div>
        `;
        // **REMOVER: Não mostrar popup de erro redundante**
        // showNotification(`❌ Erro: ${error.message}`, 'error');
    } finally {
        // **IMPORTANTE: Reabilitar botão**
        submitButton.disabled = false;
        submitButton.textContent = 'Criar Apresentação com Credenciais Selecionadas';
    }
});

// Load existing files on page load
async function loadExistingFiles() {
    try {
        await loadAllCredentials();
        await loadAllPresentations();
    } catch (error) {
        showNotification('❌ Erro ao carregar ficheiros existentes', 'error');
    }
}

// Inicializar quando página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadAllCredentials();
    loadAllPresentations();
    loadExistingFiles();
    
    // Event listeners para certificações
    const checkVcBtn = document.getElementById('check-vc-btn');
    if (checkVcBtn) {
        checkVcBtn.addEventListener('click', checkPersonalVC);
    }
    
    const certificationForm = document.getElementById('certification-form');
    if (certificationForm) {
        certificationForm.addEventListener('submit', handleCertificationRequest);
    }
    
    const authenticateBtn = document.getElementById('authenticate-btn');
    if (authenticateBtn) {
        authenticateBtn.addEventListener('click', handleAuthentication);
    }
    
    // Definir data padrão de graduação
    const graduationDateInput = document.getElementById('cert-graduation-date');
    if (graduationDateInput && !graduationDateInput.value) {
        const today = new Date();
        graduationDateInput.value = today.toISOString().split('T')[0];
    }
});

// Verificar se existe credencial de dados pessoais (NOVA FUNÇÃO)
async function checkPersonalVC() {
    const checkBtn = document.getElementById('check-vc-btn');
    const statusDiv = document.getElementById('vc-status');
    const requestSection = document.getElementById('request-certification');
    
    try {
        checkBtn.disabled = true;
        checkBtn.textContent = 'Verificando...';
        statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Procurando credencial de dados pessoais...</p></div>';
        
        // Procurar por credencial de dados pessoais no storage
        let personalVC = null;
        let personalVCId = null;
        
        for (const [id, credData] of credentialManager.credentials.entries()) {
            if (credData.type === 'personal_data' && !credData.credential.credentialSubject.certificationInfo) {
                personalVC = credData.credential;
                personalVCId = id;
                break;
            }
        }
        
        if (!personalVC) {
            statusDiv.innerHTML = `
                <div class="error">
                    <h4>❌ Credencial de Dados Pessoais Não Encontrada</h4>
                    <p>Você precisa ter uma credencial de dados pessoais para solicitar certificação.</p>
                    <div class="actions">
                        <button onclick="showTab('create')" class="btn-secondary">Criar Credencial de Dados Pessoais</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Validar estrutura da credencial
        const subject = personalVC.credentialSubject;
        if (!subject.name || !subject.birthDate || !subject.nationality) {
            statusDiv.innerHTML = `
                <div class="error">
                    <h4>❌ Credencial Incompleta</h4>
                    <p>A credencial de dados pessoais encontrada está incompleta.</p>
                    <p><strong>Necessário:</strong> nome, data de nascimento e nacionalidade</p>
                </div>
            `;
            return;
        }
        
        // Armazenar referência da credencial para uso posterior
        certificationFlow.personalVC = personalVC;
        certificationFlow.personalVCId = personalVCId;
        
        statusDiv.innerHTML = `
            <div class="success">
                <h4>✅ Credencial de Dados Pessoais Encontrada</h4>
                <div class="credential-summary">
                    <p><strong>Nome:</strong> ${subject.name}</p>
                    <p><strong>Data de Nascimento:</strong> ${subject.birthDate}</p>
                    <p><strong>Nacionalidade:</strong> ${subject.nationality}</p>
                    <p><strong>ID da Credencial:</strong> ${personalVCId}</p>
                </div>
                <p class="success-note">✅ Você pode prosseguir com a solicitação de certificação.</p>
            </div>
        `;
        
        // Mostrar seção de solicitação
        requestSection.style.display = 'block';
        requestSection.scrollIntoView({ behavior: 'smooth' });
        
        showNotification('✅ Credencial de dados pessoais verificada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao verificar credencial:', error);
        statusDiv.innerHTML = `
            <div class="error">
                <h4>❌ Erro na Verificação</h4>
                <p>${error.message}</p>
            </div>
        `;
        showNotification('❌ Erro ao verificar credencial', 'error');
    } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = 'Verificar VC de Dados Pessoais';
    }
}

// Solicitar certificação (NOVA FUNÇÃO)
async function handleCertificationRequest(event) {
    event.preventDefault();
    
    if (!certificationFlow.personalVC) {
        showNotification('❌ Primeiro verifique sua credencial de dados pessoais', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const resultDiv = document.getElementById('certification-result');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Solicitando...';
        
        const formData = {
            degreeName: document.getElementById('cert-degree-name').value,
            institution: document.getElementById('cert-institution').value,
            finalGrade: parseFloat(document.getElementById('cert-final-grade').value),
            graduationDate: document.getElementById('cert-graduation-date').value
        };
        
        // Validações
        if (formData.finalGrade < 0 || formData.finalGrade > 20) {
            throw new Error('A nota final deve estar entre 0 e 20');
        }
        
        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Solicitando challenge...</p></div>';
        
        const response = await fetch('http://localhost:3000/api/request-certification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao solicitar certificação');
        }
        
        // Armazenar dados do challenge
        certificationFlow.requestId = result.requestId;
        certificationFlow.challenge = result.challenge;
        certificationFlow.domain = result.domain;
        
        resultDiv.innerHTML = `
            <div class="success">
                <h4>✅ Challenge Gerado</h4>
                <p>Challenge para autenticação criado com sucesso.</p>
                <div class="challenge-info">
                    <p><strong>Request ID:</strong> ${result.requestId}</p>
                    <p><strong>Challenge:</strong> <code>${result.challenge}</code></p>
                    <p><strong>Domain:</strong> <code>${result.domain}</code></p>
                </div>
            </div>
        `;
        
        // Mostrar seção de autenticação
        const authSection = document.getElementById('authentication-step');
        const challengeInfo = document.getElementById('challenge-info');
        
        challengeInfo.innerHTML = `
            <h4>🔐 Informações para Criação da VP</h4>
            <p>Use os dados abaixo para criar uma VP de autenticação com sua credencial de dados pessoais:</p>
            <ul>
                <li><strong>Challenge:</strong> <code>${result.challenge}</code></li>
                <li><strong>Domain:</strong> <code>${result.domain}</code></li>
                <li><strong>Credencial:</strong> Seus dados pessoais (${certificationFlow.personalVC.credentialSubject.name})</li>
            </ul>
            <p><small>💡 Vá para a aba "Credencial", selecione sua credencial de dados pessoais, e crie uma VP usando o challenge acima.</small></p>
        `;
        
        authSection.style.display = 'block';
        authSection.scrollIntoView({ behavior: 'smooth' });
        
        showNotification('🔐 Challenge gerado! Prossiga para autenticação.', 'success');
        
    } catch (error) {
        console.error('Erro na solicitação:', error);
        resultDiv.innerHTML = `
            <div class="error">
                <h4>❌ Erro na Solicitação</h4>
                <p>${error.message}</p>
            </div>
        `;
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Solicitar Challenge';
    }
}

// Autenticar e obter certificação (CORRIGIDA - definir saveResult)
async function handleAuthentication() {
    if (!certificationFlow.requestId || !certificationFlow.challenge) {
        showNotification('❌ Primeiro solicite um challenge de certificação', 'error');
        return;
    }
    
    const authBtn = document.getElementById('authenticate-btn');
    const resultDiv = document.getElementById('authentication-result');
    
    try {
        authBtn.disabled = true;
        authBtn.textContent = 'Autenticando...';
        
        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Criando VP de autenticação...</p></div>';
        
        // Criar VP com a credencial de dados pessoais usando o challenge fornecido
        const vpData = {
            challenge: certificationFlow.challenge,
            domain: certificationFlow.domain,
            selectedCredentials: [certificationFlow.personalVCId],
            customName: `VP Autenticação - ${certificationFlow.personalVC.credentialSubject.name}`
        };
        
        console.log('Criando VP para autenticação:', vpData);
        
        const vpResponse = await fetch('/api/create-presentation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vpData)
        });
        
        if (!vpResponse.ok) {
            const vpError = await vpResponse.json();
            throw new Error(`Erro ao criar VP: ${vpError.error}`);
        }
        
        const vpResult = await vpResponse.json();
        
        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Enviando VP para autenticação...</p></div>';
        
        // Enviar VP para autenticação e obter certificação
        const authResponse = await fetch('http://localhost:3000/api/authenticate-and-issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestId: certificationFlow.requestId,
                presentation: vpResult.presentation
            })
        });
        
        const authResult = await authResponse.json();
        
        if (!authResponse.ok) {
            throw new Error(authResult.error || 'Erro na autenticação');
        }
        
        // **IMPORTANTE: Definir saveResult antes de usar**
        let saveResult = null;
        
        // Salvar certificado automaticamente
        try {
            const certificateResponse = await fetch('/api/save-certificate-auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: authResult.verifiableCredential })
            });
            
            if (certificateResponse.ok) {
                saveResult = await certificateResponse.json();
                credentialManager.credentials.set(saveResult.credentialId, saveResult.credentialData);
                updateCredentialsList();
                console.log('✅ Certificado salvo automaticamente:', saveResult.filename);
            } else {
                console.warn('⚠️ Falha ao salvar certificado automaticamente');
                saveResult = { filename: 'Certificado não salvo automaticamente' };
            }
        } catch (saveError) {
            console.warn('⚠️ Erro ao salvar certificado:', saveError.message);
            saveResult = { filename: 'Erro no salvamento automático' };
        }
        
        resultDiv.innerHTML = `
            <div class="success">
                <h4>✅ Certificação Concluída!</h4>
                <p>Seu certificado universitário foi emitido com sucesso.</p>
                
                <div class="certificate-summary">
                    <h5>📜 Detalhes do Certificado:</h5>
                    <ul>
                        <li><strong>Estudante:</strong> ${authResult.verifiableCredential.credentialSubject.studentName}</li>
                        <li><strong>Grau:</strong> ${authResult.verifiableCredential.credentialSubject.degreeName}</li>
                        <li><strong>Instituição:</strong> ${authResult.verifiableCredential.credentialSubject.institution}</li>
                        <li><strong>Nota Final:</strong> ${authResult.verifiableCredential.credentialSubject.finalGrade}/20</li>
                        <li><strong>Data de Graduação:</strong> ${authResult.verifiableCredential.credentialSubject.graduationDate}</li>
                        <li><strong>Status do Salvamento:</strong> ${saveResult ? saveResult.filename : 'Não salvo'}</li>
                    </ul>
                </div>
                
                <div class="action-buttons">
                    <button onclick="showTab('credential')" class="btn-secondary">Ver Credenciais</button>
                    <button onclick="downloadCertificate()" class="btn-secondary">💾 Baixar Certificado</button>
                </div>
            </div>
        `;
        
        // Mostrar seção de conclusão
        const completeSection = document.getElementById('certification-complete');
        const finalResult = document.getElementById('final-result');
        
        finalResult.innerHTML = `
            <div class="success">
                <h4>🎉 Processo de Certificação Concluído!</h4>
                <p>Seu certificado universitário foi emitido e ${saveResult ? 'salvo automaticamente' : 'está disponível para download'}.</p>
                ${saveResult ? `<p><strong>Certificado salvo como:</strong> ${saveResult.filename}</p>` : '<p><strong>Faça o download manual usando o botão acima.</strong></p>'}
            </div>
        `;
        
        completeSection.style.display = 'block';
        completeSection.scrollIntoView({ behavior: 'smooth' });
        
        // Limpar dados do fluxo
        certificationFlow.requestId = null;
        certificationFlow.challenge = null;
        certificationFlow.domain = null;
        
        showNotification('🎓 Certificado universitário emitido com sucesso!', 'success');
        
        // Salvar certificado para download
        window.latestCertificate = authResult.verifiableCredential;
        
    } catch (error) {
        console.error('Erro na autenticação:', error);
        resultDiv.innerHTML = `
            <div class="error">
                <h4>❌ Erro na Autenticação</h4>
                <p>${error.message}</p>
                <p><small>Verifique se você criou uma VP com o challenge correto.</small></p>
                <div class="action-buttons">
                    <button onclick="showTab('credential')" class="btn-secondary">Ir para Credenciais</button>
                    <button onclick="location.reload()" class="btn-secondary">🔄 Reiniciar Processo</button>
                </div>
            </div>
        `;
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        authBtn.disabled = false;
        authBtn.textContent = 'Autenticar e Solicitar Certificação';
    }
}

// Função para baixar certificado (NOVA FUNÇÃO)
window.downloadCertificate = function() {
    if (window.latestCertificate) {
        const blob = new Blob([JSON.stringify(window.latestCertificate, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate_${window.latestCertificate.credentialSubject.studentName.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('💾 Certificado baixado com sucesso!', 'success');
    } else {
        showNotification('❌ Nenhum certificado disponível para download', 'error');
    }
};

// Nova função de debug
window.debugCredentials = async function() {
    try {
        console.log('🔍 DEBUG: Credenciais no storage local:');
        for (const [id, data] of credentialManager.credentials.entries()) {
            console.log(`  📄 ${id}: ${data.name} (${data.type})`);
        }
        
        console.log('🔍 DEBUG: Credenciais selecionadas:');
        for (const id of credentialManager.selectedCredentials) {
            console.log(`  🎯 ${id}`);
        }
        
        // Verificar no servidor também
        const response = await fetch('/api/debug/credentials');
        if (response.ok) {
            const serverData = await response.json();
            console.log('🔍 DEBUG: Credenciais no servidor:');
            serverData.credentials.forEach(cred => {
                console.log(`  📄 ${cred.id}: ${cred.name} (${cred.type})`);
            });
        }
        
        showNotification('🔍 Debug info no console do navegador', 'info');
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Nova função de debug para ficheiros
window.debugFiles = async function() {
    try {
        console.log('🔍 DEBUG: Verificando ficheiros no disco...');
        
        const response = await fetch('/api/debug/files');
        if (response.ok) {
            const data = await response.json();
            console.log('📁 Ficheiros no disco:');
            data.files.forEach(file => {
                console.log(`  📄 ${file.filename} (${file.type}) - ${file.size} bytes`);
                console.log(`     Criado: ${new Date(file.created).toLocaleString('pt-PT')}`);
                console.log(`     Modificado: ${new Date(file.modified).toLocaleString('pt-PT')}`);
            });
            
            showNotification(`🔍 ${data.count} ficheiros encontrados - veja o console`, 'info');
        }
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Nova função para forçar limpeza de ficheiros órfãos
window.cleanupOrphanFiles = async function() {
    if (!confirm('⚠️ Isto irá apagar TODOS os ficheiros .json que não estão no storage. Continuar?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/cleanup-orphans', { method: 'POST' });
        if (response.ok) {
            const result = await response.json();
            showNotification(`🧹 ${result.deletedCount} ficheiro(s) órfão(s) apagado(s)`, 'success');
            console.log('Ficheiros apagados:', result.deletedFiles);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
        showNotification('❌ Erro na limpeza', 'error');
    }
};