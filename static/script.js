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
            
            // Disable submit button
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            }
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
    }
};

window.copyJSON = function(data) {
    const jsonString = JSON.stringify(data, null, 2);
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(jsonString).then(() => {
            showCopyToast();
        }).catch(() => {
            fallbackCopyTextToClipboard(jsonString);
        });
    } else {
        fallbackCopyTextToClipboard(jsonString);
    }
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

function showCopyToast() {
    const toastElement = document.getElementById('copyToast');
    if (toastElement) {
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }
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
