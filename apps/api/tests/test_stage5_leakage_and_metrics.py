"""
Sentinel NER — Stage 5 Temporal/Spatial Leakage & Evaluation Metrics Tests
Verifies temporal ordering, leakage detection, spatial separation,
and mathematical correctness of PR-AUC, ROC-AUC, Brier score, and Confusion Matrix.
"""

from datetime import datetime, timezone

import pytest

from src.core.risk.evaluation import (
    TemporalLeakageException,
    calculate_brier_score,
    calculate_class_imbalance,
    calculate_confusion_matrix,
    calculate_pr_auc,
    calculate_precision_recall_f1,
    calculate_roc_auc,
    validate_spatial_separation,
    validate_temporal_splits,
)


class TestStage5LeakageAndMetrics:
    def test_temporal_split_valid_ordering(self):
        """Verifies clean validation when train, val, and test splits strictly respect time."""
        t_train_cutoff = datetime(2023, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        t_val_cutoff = datetime(2024, 6, 30, 23, 59, 59, tzinfo=timezone.utc)

        train = [
            {"id": "tr-1", "observation_timestamp": datetime(2022, 5, 10, tzinfo=timezone.utc)},
            {"id": "tr-2", "observation_timestamp": datetime(2023, 11, 20, tzinfo=timezone.utc)},
        ]
        val = [
            {"id": "va-1", "observation_timestamp": datetime(2024, 2, 15, tzinfo=timezone.utc)},
            {"id": "va-2", "observation_timestamp": datetime(2024, 5, 30, tzinfo=timezone.utc)},
        ]
        test = [
            {"id": "te-1", "observation_timestamp": datetime(2024, 8, 1, tzinfo=timezone.utc)},
            {"id": "te-2", "observation_timestamp": datetime(2024, 11, 15, tzinfo=timezone.utc)},
        ]

        assert validate_temporal_splits(train, val, test, t_train_cutoff, t_val_cutoff) is True

    def test_temporal_leakage_in_training_split_detected(self):
        """CRITICAL: Rejects split when a post-cutoff observation is present in training data."""
        t_train_cutoff = datetime(2023, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        t_val_cutoff = datetime(2024, 6, 30, 23, 59, 59, tzinfo=timezone.utc)

        contaminated_train = [
            {"id": "tr-1", "observation_timestamp": datetime(2022, 5, 10, tzinfo=timezone.utc)},
            {"id": "tr-leaked", "observation_timestamp": datetime(2024, 1, 15, tzinfo=timezone.utc)},  # LEAK!
        ]
        val = [{"id": "va-1", "observation_timestamp": datetime(2024, 2, 1, tzinfo=timezone.utc)}]
        test = [{"id": "te-1", "observation_timestamp": datetime(2024, 8, 1, tzinfo=timezone.utc)}]

        with pytest.raises(TemporalLeakageException) as exc_info:
            validate_temporal_splits(contaminated_train, val, test, t_train_cutoff, t_val_cutoff)
        assert "Temporal leakage detected" in str(exc_info.value)
        assert "tr-leaked" in str(exc_info.value)

    def test_temporal_leakage_inverted_cutoffs_rejected(self):
        """Rejects nonsensical split boundaries where train_cutoff >= val_cutoff."""
        t_train = datetime(2024, 6, 30, tzinfo=timezone.utc)
        t_val = datetime(2023, 12, 31, tzinfo=timezone.utc)

        with pytest.raises(TemporalLeakageException) as exc:
            validate_temporal_splits([], [], [], t_train, t_val)
        assert "Invalid split boundaries" in str(exc.value)

    def test_spatial_separation_evaluation(self):
        """Verifies spatial disjointness check across districts."""
        train_disjoint = [{"id": "1", "district_id": "dst-aizawl"}, {"id": "2", "district_id": "dst-aizawl"}]
        test_disjoint = [{"id": "3", "district_id": "dst-lunglei"}, {"id": "4", "district_id": "dst-champhai"}]

        is_disjoint, overlap = validate_spatial_separation(train_disjoint, test_disjoint)
        assert is_disjoint is True
        assert len(overlap) == 0

        # Overlapping
        test_overlapping = [{"id": "5", "district_id": "dst-aizawl"}]
        is_disjoint_2, overlap_2 = validate_spatial_separation(train_disjoint, test_overlapping)
        assert is_disjoint_2 is False
        assert "dst-aizawl" in overlap_2

    def test_confusion_matrix_and_f1_calculation(self):
        """Verifies precision, recall, and F1 calculations from binary outputs."""
        y_true = [1, 1, 1, 0, 0, 0, 1, 0]
        y_scores = [0.9, 0.8, 0.7, 0.6, 0.2, 0.1, 0.3, 0.4]

        cm = calculate_confusion_matrix(y_true, y_scores, threshold=0.5)
        assert cm["TP"] == 3  # 0.9, 0.8, 0.7
        assert cm["FP"] == 1  # 0.6
        assert cm["TN"] == 3  # 0.2, 0.1, 0.4
        assert cm["FN"] == 1  # 0.3

        metrics = calculate_precision_recall_f1(cm)
        assert metrics["precision"] == 0.75  # 3 / (3 + 1)
        assert metrics["recall"] == 0.75     # 3 / (3 + 1)
        assert metrics["f1"] == 0.75

    def test_roc_auc_numerical_integration(self):
        """Verifies ROC-AUC trapezoidal integration."""
        # Perfect separation
        y_true_perfect = [1, 1, 1, 0, 0, 0]
        y_scores_perfect = [0.95, 0.90, 0.85, 0.20, 0.15, 0.10]
        auc_perfect = calculate_roc_auc(y_true_perfect, y_scores_perfect)
        assert auc_perfect == 1.0

        # Inverted separation
        y_scores_inverted = [0.10, 0.15, 0.20, 0.85, 0.90, 0.95]
        auc_inverted = calculate_roc_auc(y_true_perfect, y_scores_inverted)
        assert auc_inverted == 0.0

    def test_pr_auc_and_brier_score(self):
        """Verifies PR-AUC and Brier score calibration metric."""
        y_true = [1, 1, 0, 0]
        y_scores = [0.8, 0.7, 0.2, 0.1]

        pr_auc = calculate_pr_auc(y_true, y_scores)
        assert 0.8 <= pr_auc <= 1.0

        brier = calculate_brier_score(y_true, y_scores)
        # Expected: ((0.8-1)^2 + (0.7-1)^2 + (0.2-0)^2 + (0.1-0)^2) / 4 = (0.04 + 0.09 + 0.04 + 0.01) / 4 = 0.18 / 4 = 0.045
        assert brier == 0.045

    def test_class_imbalance_metrics(self):
        """Verifies rare-event class balance calculation."""
        y_imbalanced = [1] * 10 + [0] * 90  # 10% positive
        imb = calculate_class_imbalance(y_imbalanced)
        assert imb["positive_count"] == 10
        assert imb["negative_count"] == 90
        assert imb["total_count"] == 100
        assert imb["positive_percentage"] == 10.0
        assert imb["imbalance_ratio"] == round(10 / 90, 4)
