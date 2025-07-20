# PDF Document Structure Analyzer

## Overview

This is an AI/ML-powered PDF document structure analysis system built for the Adobe Hackathon 2025. The application extracts document titles and hierarchical headings (H1, H2, H3) from PDF files using machine learning techniques, specifically designed to run offline on CPU with lightweight models.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a traditional Flask web application architecture with an integrated ML pipeline:

### Frontend Architecture
- **Framework**: Flask with Jinja2 templates
- **UI Framework**: Bootstrap 5 with custom CSS styling
- **JavaScript**: Vanilla JS for file upload handling and drag-and-drop functionality
- **Design**: Responsive web interface with gradient styling and modern UI components

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Structure**: Modular design with separated concerns
  - `app.py`: Application factory and configuration
  - `routes.py`: HTTP endpoint handlers
  - `main.py`: Application entry point
- **File Handling**: Secure file uploads with validation
- **Session Management**: Flask sessions with configurable secret keys

### ML Pipeline Architecture
- **Feature Extraction**: Custom PDF text span analysis using PyMuPDF (fitz)
- **Model Type**: XGBoost classifier for lightweight, CPU-optimized performance
- **Training**: Synthetic data generation for model training
- **Inference**: Real-time PDF processing with structured JSON output

## Key Components

### 1. PDF Feature Extraction (`feature_extraction.py`)
- **Purpose**: Extracts text spans and their visual properties from PDF documents
- **Technology**: PyMuPDF for PDF parsing
- **Features Extracted**: Font size, bold/italic flags, positioning, text length, case patterns
- **Output**: Structured DataFrame with 16+ feature columns for ML model input

### 2. Model Training (`train_model.py`)
- **Algorithm**: XGBoost classifier (n_estimators=50, max_depth=6)
- **Training Data**: Synthetic data generation for heading classification
- **Classes**: Body text, H1, H2, H3 headings
- **Optimization**: CPU-only training with model size constraints (<200MB)
- **Persistence**: Joblib serialization for model storage

### 3. Inference Engine (`infer.py`)
- **Purpose**: Real-time PDF processing and structure extraction
- **Input**: PDF files up to 50 pages
- **Processing**: Feature extraction → Model prediction → JSON formatting
- **Output**: Structured JSON with title and hierarchical outline
- **Performance**: <10 seconds processing time for 50-page PDFs

### 4. Web Interface
- **Upload System**: Multi-file PDF upload with drag-and-drop
- **Validation**: File type and size checking (100MB limit per file)
- **Processing UI**: Real-time status updates and progress indication
- **Results Display**: Formatted JSON output with download capabilities

## Data Flow

1. **PDF Upload**: User uploads PDF files through web interface
2. **File Validation**: System validates file types and sizes
3. **Feature Extraction**: PyMuPDF extracts text spans with visual properties
4. **Feature Engineering**: Raw spans converted to ML-ready feature vectors
5. **Model Inference**: XGBoost classifies text spans as body/heading types
6. **Post-processing**: Classified spans assembled into hierarchical structure
7. **JSON Output**: Results formatted as structured document outline
8. **Response**: JSON delivered to user interface for display/download

## External Dependencies

### Core Libraries
- **Flask**: Web framework and HTTP handling
- **PyMuPDF (fitz)**: PDF parsing and text extraction
- **XGBoost**: Machine learning classifier
- **scikit-learn**: ML utilities and metrics
- **pandas/numpy**: Data manipulation and numerical computing
- **joblib**: Model serialization

### Frontend Dependencies
- **Bootstrap 5**: CSS framework (CDN)
- **Font Awesome**: Icon library (CDN)
- **Custom CSS**: Application-specific styling

### System Requirements
- **Platform**: Linux/AMD64
- **Runtime**: CPU-only (no GPU required)
- **Memory**: Optimized for lightweight deployment
- **Storage**: <200MB for complete model and dependencies

## Deployment Strategy

### Local Development
- **Entry Point**: `main.py` runs Flask development server
- **Configuration**: Environment-based settings with sensible defaults
- **File Structure**: Organized uploads/outputs/models directories
- **Logging**: Comprehensive logging for debugging and monitoring

### Production Considerations
- **WSGI**: ProxyFix middleware for reverse proxy deployment
- **File Limits**: Configurable upload size limits (100MB default)
- **Error Handling**: Graceful failure handling with user feedback
- **Security**: Secure filename handling and file validation

### Model Lifecycle
- **Initialization**: Automatic model training if no pre-trained model exists
- **Lazy Loading**: Model loaded on first inference request
- **Persistence**: Trained models saved for reuse across application restarts
- **Versioning**: Model versioning through file-based storage

The system is designed for offline operation with no internet dependencies during runtime, making it suitable for secure environments and ensuring consistent performance regardless of network conditions.