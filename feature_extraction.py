"""
Feature extraction module for PDF document structure analysis.
Extracts text spans and their features for ML model training and inference.
"""

import fitz  # PyMuPDF
import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Tuple, Optional
import re
from pathlib import Path

logger = logging.getLogger(__name__)

class PDFFeatureExtractor:
    """Extracts features from PDF documents for heading classification."""
    
    def __init__(self):
        self.feature_names = [
            'font_size', 'is_bold', 'is_italic', 'x_position', 'y_position',
            'text_length', 'is_uppercase', 'is_title_case', 'is_centered',
            'line_spacing', 'page_number', 'font_size_ratio', 'position_ratio',
            'word_count', 'has_numbers', 'starts_with_number'
        ]
    
    def extract_text_spans(self, pdf_path: str) -> List[Dict]:
        """Extract text spans with their properties from PDF."""
        try:
            doc = fitz.open(pdf_path)
            spans = []
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_dict = page.get_text("dict")
                
                page_width = page.rect.width
                page_height = page.rect.height
                
                for block in text_dict["blocks"]:
                    if "lines" in block:
                        for line in block["lines"]:
                            for span in line["spans"]:
                                if span["text"].strip():
                                    span_info = {
                                        'text': span["text"].strip(),
                                        'font_size': span["size"],
                                        'font_name': span["font"],
                                        'flags': span["flags"],
                                        'bbox': span["bbox"],
                                        'page_number': page_num + 1,
                                        'page_width': page_width,
                                        'page_height': page_height
                                    }
                                    spans.append(span_info)
            
            doc.close()
            logger.info(f"Extracted {len(spans)} text spans from {pdf_path}")
            return spans
            
        except Exception as e:
            logger.error(f"Error extracting text spans from {pdf_path}: {str(e)}")
            raise
    
    def calculate_features(self, spans: List[Dict]) -> pd.DataFrame:
        """Calculate ML features from text spans."""
        if not spans:
            return pd.DataFrame()
        
        features = []
        
        # Calculate global statistics for normalization
        font_sizes = [span['font_size'] for span in spans]
        max_font_size = max(font_sizes) if font_sizes else 1
        min_font_size = min(font_sizes) if font_sizes else 1
        avg_font_size = np.mean(font_sizes) if font_sizes else 1
        
        for span in spans:
            # Basic properties
            text = span['text']
            font_size = span['font_size']
            flags = span['flags']
            bbox = span['bbox']
            page_width = span['page_width']
            page_height = span['page_height']
            
            # Font style features
            is_bold = bool(flags & 2**4)  # Bold flag
            is_italic = bool(flags & 2**1)  # Italic flag
            
            # Position features
            x_position = bbox[0]
            y_position = bbox[1]
            
            # Text content features
            text_length = len(text)
            is_uppercase = text.isupper()
            is_title_case = text.istitle()
            word_count = len(text.split())
            has_numbers = bool(re.search(r'\d', text))
            starts_with_number = bool(re.match(r'^\d', text.strip()))
            
            # Layout features
            is_centered = abs(x_position - page_width/2) < page_width * 0.1
            
            # Relative features
            font_size_ratio = font_size / max_font_size if max_font_size > 0 else 0
            position_ratio = y_position / page_height if page_height > 0 else 0
            
            # Line spacing (approximate)
            line_spacing = bbox[3] - bbox[1]  # Height of bounding box
            
            feature_vector = [
                font_size,
                int(is_bold),
                int(is_italic),
                x_position,
                y_position,
                text_length,
                int(is_uppercase),
                int(is_title_case),
                int(is_centered),
                line_spacing,
                span['page_number'],
                font_size_ratio,
                position_ratio,
                word_count,
                int(has_numbers),
                int(starts_with_number)
            ]
            
            features.append({
                'text': text,
                'page_number': span['page_number'],
                **dict(zip(self.feature_names, feature_vector))
            })
        
        return pd.DataFrame(features)
    
    def extract_features_from_pdf(self, pdf_path: str) -> pd.DataFrame:
        """Complete feature extraction pipeline for a PDF."""
        spans = self.extract_text_spans(pdf_path)
        features_df = self.calculate_features(spans)
        return features_df
    
    def identify_title_heuristic(self, features_df: pd.DataFrame) -> Optional[str]:
        """Heuristic method to identify document title from first page."""
        if features_df.empty:
            return None
        
        first_page = features_df[features_df['page_number'] == 1]
        if first_page.empty:
            return None
        
        # Find largest, bold text on first page
        title_candidates = first_page[
            (first_page['font_size'] == first_page['font_size'].max()) &
            (first_page['is_bold'] == 1)
        ]
        
        if not title_candidates.empty:
            # Get the first (topmost) candidate
            title_text = title_candidates.iloc[0]['text']
            return title_text
        
        # Fallback: largest font size on first page
        largest_text = first_page[first_page['font_size'] == first_page['font_size'].max()]
        if not largest_text.empty:
            return largest_text.iloc[0]['text']
        
        return None


def generate_synthetic_training_data(n_samples: int = 10000) -> Tuple[pd.DataFrame, np.ndarray]:
    """Generate synthetic training data for heading classification."""
    np.random.seed(42)
    
    data = []
    labels = []
    
    for _ in range(n_samples):
        # Simulate different text types
        text_type = np.random.choice([0, 1, 2, 3], p=[0.7, 0.1, 0.1, 0.1])  # Body, H3, H2, H1
        
        if text_type == 0:  # Body text
            font_size = np.random.normal(12, 2)
            is_bold = np.random.choice([0, 1], p=[0.9, 0.1])
            is_centered = np.random.choice([0, 1], p=[0.95, 0.05])
            text_length = np.random.randint(20, 200)
            is_uppercase = np.random.choice([0, 1], p=[0.95, 0.05])
            
        elif text_type == 1:  # H3
            font_size = np.random.normal(14, 1)
            is_bold = np.random.choice([0, 1], p=[0.3, 0.7])
            is_centered = np.random.choice([0, 1], p=[0.8, 0.2])
            text_length = np.random.randint(10, 80)
            is_uppercase = np.random.choice([0, 1], p=[0.8, 0.2])
            
        elif text_type == 2:  # H2
            font_size = np.random.normal(16, 1)
            is_bold = np.random.choice([0, 1], p=[0.2, 0.8])
            is_centered = np.random.choice([0, 1], p=[0.7, 0.3])
            text_length = np.random.randint(5, 60)
            is_uppercase = np.random.choice([0, 1], p=[0.7, 0.3])
            
        else:  # H1
            font_size = np.random.normal(20, 2)
            is_bold = np.random.choice([0, 1], p=[0.1, 0.9])
            is_centered = np.random.choice([0, 1], p=[0.5, 0.5])
            text_length = np.random.randint(5, 50)
            is_uppercase = np.random.choice([0, 1], p=[0.6, 0.4])
        
        # Other features
        features = [
            max(6, font_size),  # font_size
            is_bold,  # is_bold
            np.random.choice([0, 1], p=[0.9, 0.1]),  # is_italic
            np.random.uniform(0, 500),  # x_position
            np.random.uniform(0, 700),  # y_position
            text_length,  # text_length
            is_uppercase,  # is_uppercase
            np.random.choice([0, 1], p=[0.8, 0.2]),  # is_title_case
            is_centered,  # is_centered
            np.random.uniform(10, 25),  # line_spacing
            np.random.randint(1, 51),  # page_number
            font_size / 24,  # font_size_ratio (assuming max 24)
            np.random.uniform(0, 1),  # position_ratio
            max(1, int(text_length / 6)),  # word_count
            np.random.choice([0, 1], p=[0.8, 0.2]),  # has_numbers
            np.random.choice([0, 1], p=[0.9, 0.1])   # starts_with_number
        ]
        
        data.append(features)
        labels.append(text_type)
    
    feature_names = [
        'font_size', 'is_bold', 'is_italic', 'x_position', 'y_position',
        'text_length', 'is_uppercase', 'is_title_case', 'is_centered',
        'line_spacing', 'page_number', 'font_size_ratio', 'position_ratio',
        'word_count', 'has_numbers', 'starts_with_number'
    ]
    
    df = pd.DataFrame(data, columns=feature_names)
    return df, np.array(labels)
