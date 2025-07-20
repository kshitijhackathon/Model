/**
 * JavaScript for PDF Document Structure Analyzer
 * Handles file uploads, drag & drop, and UI interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    const processingStatus = document.getElementById('processingStatus');

    // File input change handler
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const files = this.files;
            if (files.length > 0) {
                updateFilePreview(files);
            }
        });

        // Add drag and drop functionality
        setupDragAndDrop();
    }

    // Form submission handler
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const files = fileInput.files;
            
            if (files.length === 0) {
                e.preventDefault();
                showAlert('Please select at least one PDF file.', 'error');
                return;
            }

            // Validate file types and sizes
            for (let file of files) {
                if (!file.type.includes('pdf')) {
                    e.preventDefault();
                    showAlert(`${file.name} is not a valid PDF file.`, 'error');
                    return;
                }
                
                if (file.size > 100 * 1024 * 1024) { // 100MB
                    e.preventDefault();
                    showAlert(`${file.name} is too large. Maximum size is 100MB.`, 'error');
                    return;
                }
            }

            // Show processing status
            showProcessingStatus();
        });
    }

    function setupDragAndDrop() {
        const dropZone = createDropZone();
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
    }

    function createDropZone() {
        const cardBody = fileInput.closest('.card-body');
        const dropZone = document.createElement('div');
        dropZone.className = 'file-drop-zone mt-3';
        dropZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
            <h5>Drag & Drop PDF Files Here</h5>
            <p class="text-muted">Or click to browse files</p>
        `;
        
        dropZone.addEventListener('click', () => fileInput.click());
        cardBody.appendChild(dropZone);
        
        return dropZone;
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        e.currentTarget.classList.add('dragover');
    }

    function unhighlight(e) {
        e.currentTarget.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        // Filter PDF files
        const pdfFiles = Array.from(files).filter(file => 
            file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
        );
        
        if (pdfFiles.length === 0) {
            showAlert('Please drop only PDF files.', 'error');
            return;
        }
        
        // Create a new FileList
        const dataTransfer = new DataTransfer();
        pdfFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        updateFilePreview(pdfFiles);
        showAlert(`${pdfFiles.length} PDF file(s) ready for processing.`, 'success');
    }

    function updateFilePreview(files) {
        let existingPreview = document.getElementById('filePreview');
        if (existingPreview) {
            existingPreview.remove();
        }

        const preview = document.createElement('div');
        preview.id = 'filePreview';
        preview.className = 'mt-3';
        
        const fileList = document.createElement('div');
        fileList.className = 'list-group';
        
        Array.from(files).forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            const sizeText = formatFileSize(file.size);
            const icon = file.type.includes('pdf') ? 'fa-file-pdf text-danger' : 'fa-file text-secondary';
            
            item.innerHTML = `
                <div>
                    <i class="fas ${icon} me-2"></i>
                    <strong>${file.name}</strong>
                    <small class="text-muted ms-2">(${sizeText})</small>
                </div>
                <span class="badge bg-primary rounded-pill">${index + 1}</span>
            `;
            
            fileList.appendChild(item);
        });
        
        preview.appendChild(fileList);
        fileInput.closest('.card-body').appendChild(preview);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showProcessingStatus() {
        // Show Adobe loading page
        showAdobeLoadingPage();
        
        if (processingStatus) {
            processingStatus.style.display = 'block';
            processingStatus.classList.add('processing-animation');
            
            // Disable submit button with Adobe styling
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="adobe-loader" style="width: 20px; height: 20px; border-width: 2px;"></div> <span class="ms-2">AI Processing...</span>';
                submitBtn.style.background = 'linear-gradient(135deg, #666 0%, #999 100%)';
            }
            
            // Add processing sound effect (optional)
            playProcessingSound();
        }
    }
    
    function showAdobeLoadingPage() {
        // Create full-screen Adobe loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'adobe-loading-overlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1E1E1E;
            background-image: 
                radial-gradient(circle at 20% 50%, rgba(255,0,0,0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(144,19,254,0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(0,102,204,0.15) 0%, transparent 50%);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.5s ease-in-out;
        `;
        
        loadingOverlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="position: relative; width: 120px; height: 120px; margin: 0 auto 30px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #FF0000 0%, #9013FE 50%, #0066CC 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 40px rgba(255, 0, 0, 0.6); animation: adobe-pulse 2s ease-in-out infinite;">
                        <i class="fas fa-sync-alt" style="font-size: 40px; color: white; text-shadow: 0 0 20px rgba(255, 255, 255, 0.8); animation: spin 1.5s linear infinite;"></i>
                    </div>
                    <div style="position: absolute; top: 0; left: 0; width: 120px; height: 120px; border: 3px solid transparent; border-radius: 50%; border-top: 3px solid #FF0000; border-right: 3px solid #9013FE; border-bottom: 3px solid #0066CC; animation: spin 1.5s linear infinite;"></div>
                </div>
                <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 15px; background: linear-gradient(135deg, #FF0000 0%, #9013FE 50%, #0066CC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Adobe AI Processing</div>
                <div style="font-size: 1rem; color: rgba(255, 255, 255, 0.8); margin-bottom: 30px;">Analyzing PDF document structure...</div>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
        
        // Add animation styles if not exists
        if (!document.querySelector('#adobe-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'adobe-loading-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes adobe-pulse {
                    0%, 100% { 
                        transform: translate(-50%, -50%) scale(1); 
                        box-shadow: 0 0 40px rgba(255, 0, 0, 0.6);
                    }
                    50% { 
                        transform: translate(-50%, -50%) scale(1.1); 
                        box-shadow: 0 0 60px rgba(144, 19, 254, 0.8);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        return loadingOverlay;
    }
    
    function hideAdobeLoadingPage() {
        const overlay = document.getElementById('adobe-loading-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.5s ease-in-out';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 500);
        }
    }

    function hideProcessingStatus() {
        // Hide Adobe loading page
        hideAdobeLoadingPage();
        
        if (processingStatus) {
            processingStatus.style.display = 'none';
            processingStatus.classList.remove('processing-animation');
            
            // Enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Process PDFs';
                submitBtn.style.background = ''; // Reset to default
            }
        }
    }
    
    function playProcessingSound() {
        // Create a subtle processing sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Silently fail if audio context not supported
        }
    }

    function showAlert(message, type = 'info') {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const main = document.querySelector('main.container');
        main.insertBefore(alertContainer, main.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, 5000);
    }
});

// Global functions for template use
window.toggleResult = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const collapse = new bootstrap.Collapse(element);
        collapse.toggle();
        
        // Add Adobe-style animation
        setTimeout(() => {
            const outlineItems = element.querySelectorAll('.outline-item');
            outlineItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        item.style.transition = 'all 0.4s cubic-bezier(0.23, 1, 0.320, 1)';
                        item.style.opacity = '1';
                        item.style.transform = 'translateX(0)';
                    }, 50);
                }, index * 100);
            });
        }, 100);
    }
};

window.copyJSON = function(data) {
    const jsonString = JSON.stringify(data, null, 2);
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonString).then(() => {
            showCopyToast('JSON copied to clipboard!');
        }).catch(() => {
            fallbackCopyTextToClipboard(jsonString);
        });
    } else {
        fallbackCopyTextToClipboard(jsonString);
    }
};

window.downloadJSON = function(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace('.pdf', '')}_structure.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showCopyToast('JSON file downloaded!');
};

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyToast();
    } catch (err) {
        console.error('Fallback: Could not copy text: ', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopyToast(message = 'JSON data copied to clipboard') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.adobe-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create Adobe-style toast
    const toast = document.createElement('div');
    toast.className = 'adobe-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #FF0000 0%, #9013FE 50%, #0066CC 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(255, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.4s cubic-bezier(0.23, 1, 0.320, 1);
        backdrop-filter: blur(10px);
    `;
    
    toast.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Add CSS for animation
    if (!document.querySelector('#adobe-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'adobe-toast-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s cubic-bezier(0.23, 1, 0.320, 1)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 400);
    }, 3000);
}

// API helper functions
window.processViaAPI = async function(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API processing error:', error);
        throw error;
    }
};

// Health check function
window.checkHealth = async function() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        console.log('Health status:', data);
        return data;
    } catch (error) {
        console.error('Health check failed:', error);
        return null;
    }
};

// Performance monitoring
let processingStartTime = null;

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', function() {
            processingStartTime = Date.now();
        });
    }
});

window.addEventListener('load', function() {
    if (processingStartTime) {
        const processingTime = Date.now() - processingStartTime;
        console.log(`Total processing time: ${processingTime}ms`);
        
        // Show performance info if it took longer than 5 seconds
        if (processingTime > 5000) {
            const perfInfo = document.createElement('div');
            perfInfo.className = 'alert alert-info mt-3';
            perfInfo.innerHTML = `
                <i class="fas fa-clock me-2"></i>
                Processing completed in ${(processingTime / 1000).toFixed(1)} seconds
            `;
            
            const results = document.querySelector('.card.shadow-lg:last-child');
            if (results) {
                results.appendChild(perfInfo);
            }
        }
    }
});
