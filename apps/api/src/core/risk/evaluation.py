"""
Sentinel NER — Risk Model Evaluation, Temporal Leakage Prevention & Metrics (Stage 5)
Provides mathematical implementations for PR-AUC, ROC-AUC, Brier score, Confusion Matrix,
and temporal/spatial split verification.
"""

from datetime import datetime
from typing import Any, Dict, List, Tuple


class TemporalLeakageException(Exception):
    """Raised when an observation with a timestamp beyond the cutoff enters an earlier split."""
    pass


class SpatialLeakageException(Exception):
    """Raised when spatial clusters leak between training and validation/test splits."""
    pass


def validate_temporal_splits(
    train_records: List[Dict[str, Any]],
    val_records: List[Dict[str, Any]],
    test_records: List[Dict[str, Any]],
    train_cutoff: datetime,
    val_cutoff: datetime,
    timestamp_key: str = "observation_timestamp",
) -> bool:
    """
    Verifies strict temporal ordering: Train (< train_cutoff) <= Val (< val_cutoff) <= Test.
    Raises TemporalLeakageException if future information has leaked into an earlier split.
    """
    if train_cutoff >= val_cutoff:
        raise TemporalLeakageException(
            f"Invalid split boundaries: train_cutoff ({train_cutoff.isoformat()}) must precede val_cutoff ({val_cutoff.isoformat()})."
        )

    # Validate Train split
    for rec in train_records:
        ts = rec.get(timestamp_key)
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts and ts >= train_cutoff:
            raise TemporalLeakageException(
                f"Temporal leakage detected: Train record ID '{rec.get('id')}' with timestamp {ts.isoformat()} is on or after train_cutoff {train_cutoff.isoformat()}."
            )

    # Validate Validation split
    for rec in val_records:
        ts = rec.get(timestamp_key)
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts and ts >= val_cutoff:
            raise TemporalLeakageException(
                f"Temporal leakage detected: Val record ID '{rec.get('id')}' with timestamp {ts.isoformat()} is on or after val_cutoff {val_cutoff.isoformat()}."
            )
        if ts and ts < train_cutoff:
            raise TemporalLeakageException(
                f"Validation split contaminated: Val record ID '{rec.get('id')}' with timestamp {ts.isoformat()} belongs to train split."
            )

    # Validate Test split
    for rec in test_records:
        ts = rec.get(timestamp_key)
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts and ts < val_cutoff:
            raise TemporalLeakageException(
                f"Test split contaminated: Test record ID '{rec.get('id')}' with timestamp {ts.isoformat()} is before val_cutoff {val_cutoff.isoformat()}."
            )

    return True


def validate_spatial_separation(
    train_records: List[Dict[str, Any]],
    test_records: List[Dict[str, Any]],
    spatial_key: str = "district_id",
) -> Tuple[bool, List[str]]:
    """
    Evaluates spatial disjointness between training and test sets.
    Returns (is_disjoint, overlapping_clusters).
    """
    train_clusters = {r.get(spatial_key) for r in train_records if r.get(spatial_key)}
    test_clusters = {r.get(spatial_key) for r in test_records if r.get(spatial_key)}
    overlap = list(train_clusters.intersection(test_clusters))
    return len(overlap) == 0, overlap


def calculate_confusion_matrix(
    y_true: List[int],
    y_scores: List[float],
    threshold: float = 0.5,
) -> Dict[str, int]:
    tp = fp = tn = fn = 0
    for y, score in zip(y_true, y_scores):
        pred = 1 if score >= threshold else 0
        if y == 1 and pred == 1:
            tp += 1
        elif y == 0 and pred == 1:
            fp += 1
        elif y == 0 and pred == 0:
            tn += 1
        elif y == 1 and pred == 0:
            fn += 1
    return {"TP": tp, "FP": fp, "TN": tn, "FN": fn}


def calculate_precision_recall_f1(
    cm: Dict[str, int]
) -> Dict[str, float]:
    tp = cm["TP"]
    fp = cm["FP"]
    fn = cm["FN"]

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
    f1 = (
        round(2 * (precision * recall) / (precision + recall), 4)
        if (precision + recall) > 0
        else 0.0
    )
    return {"precision": precision, "recall": recall, "f1": f1}


def calculate_roc_auc(y_true: List[int], y_scores: List[float]) -> float:
    """
    Computes Receiver Operating Characteristic Area Under Curve (ROC-AUC)
    using exact numerical trapezoidal integration.
    """
    if not y_true or not y_scores or len(y_true) != len(y_scores):
        return 0.5

    pos_count = sum(y_true)
    neg_count = len(y_true) - pos_count
    if pos_count == 0 or neg_count == 0:
        return 0.5

    # Sort descending by score
    paired = sorted(zip(y_scores, y_true), key=lambda x: x[0], reverse=True)

    tpr_list = [0.0]
    fpr_list = [0.0]
    tp_accum = 0
    fp_accum = 0

    for _, y in paired:
        if y == 1:
            tp_accum += 1
        else:
            fp_accum += 1
        tpr_list.append(tp_accum / pos_count)
        fpr_list.append(fp_accum / neg_count)

    # Trapezoidal integration
    auc = 0.0
    for i in range(1, len(fpr_list)):
        width = fpr_list[i] - fpr_list[i - 1]
        height = (tpr_list[i] + tpr_list[i - 1]) / 2.0
        auc += width * height

    return round(max(0.0, min(1.0, auc)), 4)


def calculate_pr_auc(y_true: List[int], y_scores: List[float]) -> float:
    """
    Computes Precision-Recall Area Under Curve (PR-AUC)
    using trapezoidal integration over distinct recall steps.
    """
    if not y_true or not y_scores or len(y_true) != len(y_scores):
        return 0.0

    pos_count = sum(y_true)
    if pos_count == 0:
        return 0.0

    paired = sorted(zip(y_scores, y_true), key=lambda x: x[0], reverse=True)

    precisions = [1.0]
    recalls = [0.0]
    tp_accum = 0
    fp_accum = 0

    for _, y in paired:
        if y == 1:
            tp_accum += 1
        else:
            fp_accum += 1
        p = tp_accum / (tp_accum + fp_accum)
        r = tp_accum / pos_count
        precisions.append(p)
        recalls.append(r)

    # Trapezoidal integration along recall axis
    pr_auc = 0.0
    for i in range(1, len(recalls)):
        width = recalls[i] - recalls[i - 1]
        height = (precisions[i] + precisions[i - 1]) / 2.0
        pr_auc += width * height

    return round(max(0.0, min(1.0, pr_auc)), 4)


def calculate_brier_score(y_true: List[int], y_scores: List[float]) -> float:
    """Computes mean squared calibration error."""
    if not y_true or not y_scores:
        return 0.0
    total = sum((p - y) ** 2 for y, p in zip(y_true, y_scores))
    return round(total / len(y_true), 4)


def calculate_class_imbalance(y_true: List[int]) -> Dict[str, Any]:
    pos = sum(y_true)
    total = len(y_true)
    neg = total - pos
    ratio = round(pos / neg, 4) if neg > 0 else 0.0
    return {
        "positive_count": pos,
        "negative_count": neg,
        "total_count": total,
        "imbalance_ratio": ratio,
        "positive_percentage": round((pos / total) * 100.0, 2) if total > 0 else 0.0,
    }
