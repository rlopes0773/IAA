// Tab functionality
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
}

// Load and display credential
async function loadCredential(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const credential = JSON.parse(e.target.result);
                displayJSON('vc-display', credential);
                await saveCredentialToServer(credential);
            } catch (error) {
                displayError('vc-display', 'Erro ao carregar credencial: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

// Save credential to server
async function saveCredentialToServer(credential) {
    try {
        const response = await fetch('/api/save-credential', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('✅ Credencial salva com sucesso!', 'success');
        } else {
            throw new Error(result.error || 'Erro ao salvar credencial');
        }
    } catch (error) {
        showNotification('❌ Erro ao salvar credencial: ' + error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.innerHTML = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 300px;
    `;
    
    if (type === 'success') {
        notification.style.background = '#d4edda';
        notification.style.color = '#155724';
        notification.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        notification.style.background = '#f8d7da';
        notification.style.color = '#721c24';
        notification.style.border = '1px solid #f5c6cb';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Load and display presentation
function loadPresentation(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const presentation = JSON.parse(e.target.result);
                displayJSON('vp-display', presentation);
            } catch (error) {
                displayError('vp-display', 'Erro ao carregar apresentação: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

// Display JSON with syntax highlighting
function displayJSON(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const jsonString = JSON.stringify(data, null, 2);
    element.innerHTML = `<pre>${syntaxHighlight(jsonString)}</pre>`;
    element.style.display = 'block';
}

// Display error message
function displayError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = `<div style="color: #dc3545; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; margin: 10px 0;">${message}</div>`;
    element.style.display = 'block';
}

// Simple syntax highlighting for JSON
function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Handle form submission for creating new presentation
document.getElementById('create-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const challenge = document.getElementById('challenge').value;
    const domain = document.getElementById('domain').value;
    const holderDid = document.getElementById('holder-did').value;
    
    const resultArea = document.getElementById('create-result');
    resultArea.style.display = 'block';
    resultArea.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Criando apresentação...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/create-presentation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ challenge, domain, holderDid })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            resultArea.innerHTML = `
                <div class="success">
                    <h3>✅ Apresentação criada com sucesso!</h3>
                    <pre>${syntaxHighlight(JSON.stringify(result.presentation, null, 2))}</pre>
                </div>
            `;
            
            if (result.presentation) {
                displayJSON('vp-display', result.presentation);
            }
            
            showNotification('✅ Apresentação criada com sucesso!', 'success');
        } else {
            throw new Error(result.error || 'Erro desconhecido');
        }
    } catch (error) {
        resultArea.innerHTML = `
            <div class="error">
                <h3>❌ Erro ao criar apresentação</h3>
                <p><strong>Erro:</strong> ${error.message}</p>
                <p><strong>Solução:</strong> Certifique-se de que você fez upload de uma credencial válida primeiro.</p>
            </div>
        `;
    }
});

// Drag and drop functionality
function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, e => {
                area.style.borderColor = '#667eea';
                area.style.backgroundColor = '#f8f9ff';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, e => {
                area.style.borderColor = '#ccc';
                area.style.backgroundColor = '';
            });
        });
        
        area.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            const fileInput = area.querySelector('input[type="file"]');
            
            if (files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });
}

// Load existing files on page load
async function loadExistingFiles() {
    try {
        const vcResponse = await fetch('/api/files/vc.json');
        if (vcResponse.ok) {
            const credential = await vcResponse.json();
            displayJSON('vc-display', credential);
        }
        
        const vpResponse = await fetch('/api/files/vp.json');
        if (vpResponse.ok) {
            const presentation = await vpResponse.json();
            displayJSON('vp-display', presentation);
        }
    } catch (error) {
        // Silently ignore errors for missing files
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    loadExistingFiles();
});