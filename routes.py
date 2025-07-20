"""
Flask routes for the PDF document structure analysis web application.
"""

import os
import json
import logging
from flask import render_template, request, jsonify, flash, redirect, url_for, send_file
from werkzeug.utils import secure_filename
from pathlib import Path
import uuid
from app import app
from infer import DocumentStructureInference
from train_model import train_document_classifier

logger = logging.getLogger(__name__)

# Initialize inference engine
inference_engine = None

def init_model():
    """Initialize or train the ML model."""
    global inference_engine
    
    model_path = os.path.join(app.config['MODEL_FOLDER'], 'document_classifier.pkl')
    
    if not os.path.exists(model_path):
        logger.info("Model not found. Training new model...")
        try:
            classifier, results = train_document_classifier(model_path)
            logger.info(f"Model trained successfully with accuracy: {results['accuracy']:.4f}")
        except Exception as e:
            logger.error(f"Failed to train model: {str(e)}")
            return False
    
    try:
        inference_engine = DocumentStructureInference(model_path)
        logger.info("Inference engine initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize inference engine: {str(e)}")
        return False

def allowed_file(filename):
    """Check if file has allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

@app.route('/')
def index():
    """Main page with upload interface."""
    return render_template('index.html')

@app.route('/loading')
def loading():
    """Adobe-themed loading page."""
    return render_template('loading.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """Handle file upload and processing."""
    global inference_engine
    
    if inference_engine is None:
        if not init_model():
            flash('Model initialization failed. Please try again.', 'error')
            return redirect(url_for('index'))
    
    if 'files' not in request.files:
        flash('No files selected', 'error')
        return redirect(url_for('index'))
    
    files = request.files.getlist('files')
    
    if not files or all(file.filename == '' for file in files):
        flash('No files selected', 'error')
        return redirect(url_for('index'))
    
    results = []
    session_id = str(uuid.uuid4())
    
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            try:
                # Secure filename and save
                filename = secure_filename(file.filename or "unknown.pdf")
                unique_filename = f"{session_id}_{filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(filepath)
                
                # Process PDF
                logger.info(f"Processing file: {filename}")
                result = inference_engine.process_pdf(filepath)
                
                # Save JSON output
                output_filename = f"{session_id}_{Path(filename).stem}.json"
                output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                
                results.append({
                    'filename': filename,
                    'result': result,
                    'output_file': output_filename,
                    'success': True
                })
                
                # Clean up uploaded file
                os.remove(filepath)
                
            except Exception as e:
                logger.error(f"Error processing {file.filename}: {str(e)}")
                results.append({
                    'filename': file.filename,
                    'error': str(e),
                    'success': False
                })
        else:
            results.append({
                'filename': file.filename,
                'error': 'Invalid file type. Only PDF files are allowed.',
                'success': False
            })
    
    return render_template('index.html', results=results)

@app.route('/download/<filename>')
def download_file(filename):
    """Download generated JSON file."""
    try:
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        if os.path.exists(output_path):
            return send_file(output_path, as_attachment=True)
        else:
            flash('File not found', 'error')
            return redirect(url_for('index'))
    except Exception as e:
        logger.error(f"Error downloading file {filename}: {str(e)}")
        flash('Error downloading file', 'error')
        return redirect(url_for('index'))

@app.route('/api/process', methods=['POST'])
def api_process():
    """API endpoint for processing PDFs."""
    global inference_engine
    
    if inference_engine is None:
        if not init_model():
            return jsonify({'error': 'Model initialization failed'}), 500
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    
    try:
        # Save and process file
        filename = secure_filename(file.filename or "unknown.pdf")
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Process PDF
        result = inference_engine.process_pdf(filepath)
        
        # Clean up
        os.remove(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"API processing error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': inference_engine is not None
    })

# Initialize model on startup - Flask 2.0+ doesn't have before_first_request
# Model will be initialized on first request through init_model() in routes

# Error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    flash('File too large. Maximum size is 100MB.', 'error')
    return redirect(url_for('index'))

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    flash('An internal error occurred. Please try again.', 'error')
    return redirect(url_for('index'))
