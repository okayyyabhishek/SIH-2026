"""
Sentinel NER — ML Inference Subsystem
Provides real-time production inference on geospatial and environmental observations.
"""

from src.inference.predictor import MLPredictor, predictor, RISK_LABEL_MAP

__all__ = ["MLPredictor", "predictor", "RISK_LABEL_MAP"]
