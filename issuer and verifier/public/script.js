class VCInterface {
    constructor() {
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupForms();
        this.loadExistingData();
        this.setDefaultGraduationDate();
    }

    setDefaultGraduationDate() {
        // Set default graduation date to today
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        const graduationDateInput = document.getElementById('graduation-date');
        if (graduationDateInput && !graduationDateInput.value) {
            graduationDateInput.value = formattedDate;
        }
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;

                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    setupForms() {
        // Issuer form
        const issuerForm = document.getElementById('issuer-form');
        if (issuerForm) {
            issuerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleIssuerSubmit();
            });
        }

        // Verifier form  
        const verifierForm = document.getElementById('verifier-form');
        if (verifierForm) {
            verifierForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVerifierSubmit();
            });
        }

        // Grade validation
        const gradeInput = document.getElementById('final-grade');
        if (gradeInput) {
            gradeInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (value < 0 || value > 20) {
                    e.target.setCustomValidity('A nota deve estar entre 0 e 20');
                } else {
                    e.target.setCustomValidity('');
                }
            });
        }
    }

    async handleIssuerSubmit() {
        const submitButton = document.querySelector('#issuer-form button[type="submit"]');
        const resultBox = document.getElementById('issuer-result');
        
        try {
            this.showLoading(submitButton, 'Emitindo...');
            
            // Validate grade before submitting
            const finalGrade = parseFloat(document.getElementById('final-grade').value);
            if (finalGrade < 0 || finalGrade > 20) {
                throw new Error('A nota final deve estar entre 0 e 20');
            }
            
            const formData = {
                studentId: document.getElementById('student-id').value,
                studentName: document.getElementById('student-name').value,
                degreeName: document.getElementById('degree-name').value,
                finalGrade: finalGrade,
                graduationDate: document.getElementById('graduation-date').value,
                institution: document.getElementById('institution').value
            };

            const response = await fetch('/api/issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showResult(resultBox, 'success', 'Credencial emitida com sucesso!', {
                    message: result.message,
                    credentialSummary: {
                        issuer: result.verifiableCredential.issuer,
                        subject: result.verifiableCredential.credentialSubject.id,
                        degree: result.verifiableCredential.credentialSubject.degree.name,
                        description: result.verifiableCredential.credentialSubject.degree.description,
                        issuanceDate: result.verifiableCredential.issuanceDate,
                        expirationDate: result.verifiableCredential.expirationDate
                    },
                    fullCredential: result.verifiableCredential
                });
                this.showStatus(`Credencial criada para ${formData.studentName} com nota ${formData.finalGrade}`);
            } else {
                this.showResult(resultBox, 'error', 'Erro ao emitir credencial', result);
            }
        } catch (error) {
            this.showResult(resultBox, 'error', 'Erro de validação', { error: error.message });
        } finally {
            this.hideLoading(submitButton, 'Emitir Credencial');
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
                throw new Error('JSON da apresentação inválido');
            }

            const formData = {
                presentation: presentation,
                challenge: document.getElementById('verify-challenge').value,
                domain: document.getElementById('verify-domain').value
            };

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
                const message = isValid ? 'Apresentação verificada com sucesso!' : 'Falha na verificação da apresentação';
                
                this.showResult(resultBox, messageType, message, result);
                this.showStatus(`Verificação concluída: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
            } else {
                this.showResult(resultBox, 'error', 'Erro ao verificar apresentação', result);
            }
        } catch (error) {
            this.showResult(resultBox, 'error', 'Erro de validação', { error: error.message });
        } finally {
            this.hideLoading(submitButton, 'Verificar Apresentação');
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
            resultBox.innerHTML = `
                <strong>${message}</strong>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            resultBox.style.display = 'block';
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

    async loadExistingData() {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const status = await response.json();
                this.showStatus(`Sistema carregado. ${status.message || ''}`);
            }
        } catch (error) {
            console.log('Sistema inicializado');
        }
    }
}

// Initialize the interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VCInterface();
});