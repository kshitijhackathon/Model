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
