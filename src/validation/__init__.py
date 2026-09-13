"""
Sentinel NER — Data Validation Subsystem
Provides boundary validation, physical bounds auditing, and quality report generation.
"""

from src.validation.validator import DatasetValidator, PHYSICAL_FEATURE_BOUNDS

__all__ = ["DatasetValidator", "PHYSICAL_FEATURE_BOUNDS"]
