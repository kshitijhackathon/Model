"""
Inference module for PDF document structure analysis.
Processes PDFs and generates structured JSON output.
"""

import numpy as np
import pandas as pd
import joblib
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from feature_extraction import PDFFeatureExtractor

logger = logging.getLogger(__name__)

class DocumentStructureInference:
    """Inference engine for document structure analysis."""
    
    def __init__(self, model_path: str):
        self.feature_extractor = PDFFeatureExtractor()
        self.model = None
        self.class_names = {}
        self.confidence_threshold = 0.6
        
        self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load trained model from disk."""
        try:
            model_data = joblib.load(model_path)
            self.model = model_data['model']
            self.class_names = model_data['class_names']
            logger.info(f"Model loaded successfully from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model from {model_path}: {str(e)}")
            raise
    
    def process_pdf(self, pdf_path: str) -> Dict:
        """Process a single PDF and return structured output."""
        try:
            logger.info(f"Processing PDF: {pdf_path}")
            
            # Extract features
            features_df = self.feature_extractor.extract_features_from_pdf(pdf_path)
            
            if features_df.empty:
                logger.warning(f"No text found in PDF: {pdf_path}")
                return {"title": "", "outline": []}
            
            # Prepare features for model
            feature_columns = self.feature_extractor.feature_names
            X = features_df[feature_columns]
            
            # Get predictions
            predictions = self.model.predict(X)
            probabilities = self.model.predict_proba(X)
            
            # Add predictions to dataframe
            features_df['predicted_class'] = predictions
            features_df['max_probability'] = np.max(probabilities, axis=1)
            
            # Extract title
            title = self._extract_title(features_df)
            
            # Extract outline
            outline = self._extract_outline(features_df)
            
            result = {
                "title": title,
                "outline": outline
            }
            
            logger.info(f"Successfully processed {pdf_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {str(e)}")
            raise
    
    def _extract_title(self, features_df: pd.DataFrame) -> str:
        """Extract document title from features."""
        # Try ML prediction first
        first_page = features_df[features_df['page_number'] == 1]
        
        if not first_page.empty:
            # Look for H1 predictions on first page with high confidence
            h1_candidates = first_page[
                (first_page['predicted_class'] == 3) &  # H1 class
                (first_page['max_probability'] > self.confidence_threshold)
            ]
            
            if not h1_candidates.empty:
                # Get the one with highest font size
                title_candidate = h1_candidates.loc[h1_candidates['font_size'].idxmax()]
                return title_candidate['text']
        
        # Fallback to heuristic method
        title = self.feature_extractor.identify_title_heuristic(features_df)
        return title if title else ""
    
    def _extract_outline(self, features_df: pd.DataFrame) -> List[Dict]:
        """Extract document outline from features."""
        outline = []
        
        # Filter headings (H1, H2, H3) with sufficient confidence
        headings = features_df[
            (features_df['predicted_class'].isin([1, 2, 3])) &  # H3, H2, H1
            (features_df['max_probability'] > self.confidence_threshold)
        ].copy()
        
        if headings.empty:
            # Fallback: use heuristic based on font size and formatting
            headings = self._heuristic_heading_detection(features_df)
        
        # Sort by page number and position
        headings = headings.sort_values(['page_number', 'y_position'])
        
        # Convert to outline format
        for _, heading in headings.iterrows():
            level_map = {3: 'H1', 2: 'H2', 1: 'H3'}
            level = level_map.get(heading['predicted_class'], 'H3')
            
            outline.append({
                "level": level,
                "text": heading['text'],
                "page": int(heading['page_number'])
            })
        
        return outline
    
    def _heuristic_heading_detection(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """Fallback heuristic method for heading detection."""
        # Calculate font size thresholds
        avg_font_size = features_df['font_size'].mean()
        std_font_size = features_df['font_size'].std()
        
        # Define thresholds
        h1_threshold = avg_font_size + 1.5 * std_font_size
        h2_threshold = avg_font_size + 1.0 * std_font_size
        h3_threshold = avg_font_size + 0.5 * std_font_size
        
        # Apply heuristic rules
        conditions = [
            (features_df['font_size'] >= h1_threshold) & (features_df['is_bold'] == 1),
            (features_df['font_size'] >= h2_threshold) & (features_df['is_bold'] == 1),
            (features_df['font_size'] >= h3_threshold) & 
            ((features_df['is_bold'] == 1) | (features_df['is_uppercase'] == 1))
        ]
        
        choices = [3, 2, 1]  # H1, H2, H3
        
        features_df = features_df.copy()
        features_df['predicted_class'] = np.select(conditions, choices, default=0)
        features_df['max_probability'] = 1.0  # Assume high confidence for heuristics
        
        # Return only detected headings
        return features_df[features_df['predicted_class'] > 0]
    
    def process_batch(self, pdf_folder: str, output_folder: str) -> Dict[str, Dict]:
        """Process multiple PDFs in a folder."""
        pdf_folder_path = Path(pdf_folder)
        output_folder_path = Path(output_folder)
        output_folder_path.mkdir(parents=True, exist_ok=True)
        
        results = {}
        pdf_files = list(pdf_folder_path.glob("*.pdf"))
        
        logger.info(f"Processing {len(pdf_files)} PDF files")
        
        for pdf_file in pdf_files:
            try:
                # Process PDF
                result = self.process_pdf(str(pdf_file))
                
                # Save JSON output
                output_file = output_folder_path / f"{pdf_file.stem}.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                
                results[pdf_file.name] = result
                logger.info(f"Saved output to {output_file}")
                
            except Exception as e:
                logger.error(f"Failed to process {pdf_file}: {str(e)}")
                results[pdf_file.name] = {"error": str(e)}
        
        return results


def process_single_pdf(pdf_path: str, model_path: str = "models/document_classifier.pkl") -> Dict:
    """Process a single PDF file and return structured output."""
    inference_engine = DocumentStructureInference(model_path)
    return inference_engine.process_pdf(pdf_path)


if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) < 2:
        print("Usage: python infer.py <pdf_path> [model_path]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    model_path = sys.argv[2] if len(sys.argv) > 2 else "models/document_classifier.pkl"
    
    try:
        result = process_single_pdf(pdf_path, model_path)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
