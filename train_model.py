"""
Model training module for PDF document structure analysis.
Trains a lightweight XGBoost classifier for heading detection.
"""

import numpy as np
import pandas as pd
import joblib
import logging
from pathlib import Path
from typing import Dict
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import xgboost as xgb
from feature_extraction import generate_synthetic_training_data, PDFFeatureExtractor

logger = logging.getLogger(__name__)

class DocumentStructureClassifier:
    """XGBoost classifier for document structure analysis."""
    
    def __init__(self):
        self.model = None
        self.feature_extractor = PDFFeatureExtractor()
        self.class_names = {0: 'body', 1: 'H3', 2: 'H2', 3: 'H1'}
        
    def train(self, X: pd.DataFrame, y: np.ndarray) -> Dict:
        """Train the XGBoost classifier."""
        logger.info("Starting model training...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Configure XGBoost for small model size and CPU efficiency
        self.model = xgb.XGBClassifier(
            n_estimators=50,  # Reduced for smaller model
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=1,  # CPU only
            objective='multi:softprob',
            eval_metric='mlogloss'
        )
        
        # Train model
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Model training completed. Accuracy: {accuracy:.4f}")
        logger.info("Classification Report:")
        logger.info(classification_report(y_test, y_pred, target_names=list(self.class_names.values())))
        
        return {
            'accuracy': accuracy,
            'feature_importance': dict(zip(X.columns, self.model.feature_importances_))
        }
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predict classes for features."""
        if self.model is None:
            raise ValueError("Model not trained yet!")
        return self.model.predict(X)
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Predict class probabilities."""
        if self.model is None:
            raise ValueError("Model not trained yet!")
        return self.model.predict_proba(X)
    
    def save_model(self, model_path: str):
        """Save trained model to disk."""
        if self.model is None:
            raise ValueError("No model to save!")
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_extractor.feature_names,
            'class_names': self.class_names
        }
        
        joblib.dump(model_data, model_path)
        logger.info(f"Model saved to {model_path}")
    
    def load_model(self, model_path: str):
        """Load trained model from disk."""
        model_data = joblib.load(model_path)
        self.model = model_data['model']
        self.class_names = model_data['class_names']
        logger.info(f"Model loaded from {model_path}")


def train_document_classifier(model_save_path: str = "models/document_classifier.pkl"):
    """Complete training pipeline for document structure classifier."""
    logger.info("Generating synthetic training data...")
    
    # Generate synthetic training data
    X, y = generate_synthetic_training_data(n_samples=20000)
    
    logger.info(f"Generated {len(X)} training samples")
    logger.info(f"Class distribution: {np.bincount(y)}")
    
    # Initialize and train classifier
    classifier = DocumentStructureClassifier()
    training_results = classifier.train(X, y)
    
    # Save model
    Path(model_save_path).parent.mkdir(parents=True, exist_ok=True)
    classifier.save_model(model_save_path)
    
    logger.info("Training completed successfully!")
    return classifier, training_results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Train the model
    classifier, results = train_document_classifier()
    
    print(f"Training completed with accuracy: {results['accuracy']:.4f}")
    print("\nFeature Importance:")
    for feature, importance in sorted(results['feature_importance'].items(), 
                                    key=lambda x: x[1], reverse=True):
        print(f"{feature}: {importance:.4f}")
