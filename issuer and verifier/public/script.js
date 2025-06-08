class VCVerifier {
    constructor() {
        this.init();
    }

    init() {
        this.setupVerifierForm();
        this.loadStatus();
    }

    setupVerifierForm() {
        const verifierForm = document.getElementById('verifier-form');
        if (verifierForm) {
            verifierForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVerifierSubmit();
            });
        }

        // Auto-resize textarea
        const textarea = document.getElementById('presentation-json');
        if (textarea) {
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
            });
        }

        // Paste handler
        document.addEventListener('paste', (e) => {
            if (e.target === textarea) {
                setTimeout(() => {
                    this.formatJSON();
                }, 100);
            }
        });
    }

    formatJSON() {
        const textarea = document.getElementById('presentation-json');
        try {
            const parsed = JSON.parse(textarea.value);
            textarea.value = JSON.stringify(parsed, null, 2);
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
        } catch (error) {
            // Ignorar erro de formatação - deixar o usuário continuar digitando
        }
    }

    async handleVerifierSubmit() {
        const submitButton = document.querySelector('#verifier-form button[type="submit"]');
        const resultBox = document.getElementById('verifier-result');
        
        try {
            this.showLoading(submitButton, 'Verificando...');
            
            const presentationJson = document.getElementById('presentation-json').value.trim();
            
            if (!presentationJson) {
                throw new Error('Por favor, cole o JSON da apresentação verificável');
            }

            let presentation;
            try {
                presentation = JSON.parse(presentationJson);
            } catch (error) {
                throw new Error('JSON inválido. Verifique a formatação.');
            }

            // Validação básica
            if (!presentation.type || !presentation.type.includes('VerifiablePresentation')) {
                throw new Error('JSON não parece ser uma apresentação verificável válida');
            }

            const formData = {
                presentation: presentation,
                challenge: document.getElementById('verify-challenge').value,
                domain: document.getElementById('verify-domain').value
            };

            console.log('🔍 Iniciando verificação da VP...');

            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                const isValid = result.verified;
                const messageType = isValid ? 'success' : 'error';
                const message = isValid ? 
                    '✅ Apresentação verificada com sucesso!' : 
                    '❌ Falha na verificação da apresentação';
                
                this.showResult(resultBox, messageType, message, result);
                this.showStatus(`Verificação: ${isValid ? 'VÁLIDA ✅' : 'INVÁLIDA ❌'}`);

                console.log(`✅ Verificação concluída: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
            } else {
                this.showResult(resultBox, 'error', '❌ Erro ao verificar apresentação', result);
                this.showStatus('Erro na verificação');
            }
        } catch (error) {
            console.error('Erro na verificação:', error);
            this.showResult(resultBox, 'error', '❌ Erro de validação', { 
                error: error.message,
                hint: 'Verifique se o JSON está correto e completo'
            });
            this.showStatus('Erro na validação');
        } finally {
            this.hideLoading(submitButton, '🔍 Verificar Apresentação');
        }
    }

    showLoading(button, text) {
        if (button) {
            button.disabled = true;
            button.innerHTML = `<span class="loading"></span>${text}`;
        }
    }

    hideLoading(button, originalText) {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    showResult(resultBox, type, message, data) {
        if (resultBox) {
            resultBox.className = `result-box ${type}`;
            
            let content = `<h3>${message}</h3>`;
            
            if (type === 'success' && data.verified) {
                content += `
                    <div class="verification-summary">
                        <h4>📋 Resumo da Verificação:</h4>
                        <ul>
                            <li><strong>Status:</strong> ${data.verified ? 'VÁLIDA ✅' : 'INVÁLIDA ❌'}</li>
                            <li><strong>Holder:</strong> ${data.presentation?.holder || 'N/A'}</li>
                            <li><strong>Credenciais:</strong> ${data.presentation?.verifiableCredential?.length || 0}</li>
                            <li><strong>Challenge:</strong> ${data.challenge || 'N/A'}</li>
                            <li><strong>Domain:</strong> ${data.domain || 'N/A'}</li>
                        </ul>
                    </div>
                `;
            }
            
            content += `<details><summary>Ver detalhes técnicos</summary><pre>${JSON.stringify(data, null, 2)}</pre></details>`;
            
            resultBox.innerHTML = content;
            resultBox.style.display = 'block';
            
            // Scroll to result
            resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    showStatus(message) {
        const statusBox = document.getElementById('status');
        if (statusBox) {
            statusBox.textContent = message;
            statusBox.classList.add('show');
            
            setTimeout(() => {
                statusBox.classList.remove('show');
            }, 5000);
        }
    }

    async loadStatus() {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const status = await response.json();
                console.log('Sistema de verificação carregado');
            }
        } catch (error) {
            console.log('Sistema inicializado');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VCVerifier();
});