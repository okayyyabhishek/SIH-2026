"""
Sentinel NER — Multi-Model Baseline Trainer & Evaluator
Trains Random Forest, XGBoost, and Transparent Logistic Regression on train.csv,
evaluates on validation.csv and test.csv, and serializes production model artifacts to models/.
"""

import json
import os
import pickle
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath("."))
from typing import Any, Dict, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
import xgboost as xgb

from src.training.scalers import ALL_MODEL_FEATURES, PersistentFeatureScaler


TARGET_COLUMN = "target_landslide_risk"
CLASS_NAMES = ["Low (0)", "Moderate (1)", "High (2)", "Very High (3)"]


class BaselineModelTrainer:
    """
    Orchestrates leakage-proof model training, scaler fitting, evaluation, and artifact export.
    """

    def __init__(self, models_dir: str = "models", reports_dir: str = "reports"):
        self.models_dir = models_dir
        self.reports_dir = reports_dir
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.reports_dir, exist_ok=True)
        self.scaler = PersistentFeatureScaler()

    def train_and_evaluate(
        self,
        train_path: str = "data/processed/train.csv",
        val_path: str = "data/processed/validation.csv",
        test_path: str = "data/processed/test.csv",
    ) -> Dict[str, Any]:
        """
        Executes full training lifecycle across Random Forest, XGBoost, and Logistic Regression.
        """
        print(f"Loading split datasets...")
        df_train = pd.read_csv(train_path)
        df_val = pd.read_csv(val_path)
        df_test = pd.read_csv(test_path)

        # 1. Fit scaler strictly on train split
        print("Fitting persistent feature scalers on training partition...")
        self.scaler.fit(df_train)
        self.scaler.save(os.path.join(self.models_dir, "feature_scaler.json"))

        # 2. Transform all partitions identically
        train_scaled = self.scaler.transform(df_train)
        val_scaled = self.scaler.transform(df_val)
        test_scaled = self.scaler.transform(df_test)

        feature_cols = [c for c in ALL_MODEL_FEATURES if c in df_train.columns]

        X_train = train_scaled[feature_cols].values
        y_train = df_train[TARGET_COLUMN].values

        X_val = val_scaled[feature_cols].values
        y_val = df_val[TARGET_COLUMN].values

        X_test = test_scaled[feature_cols].values
        y_test = df_test[TARGET_COLUMN].values

        results = {}

        # =========================================================================
        # Model 1: Random Forest Classifier
        # =========================================================================
        print("\n--- Training Model 1: Random Forest Classifier ---")
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_split=4,
            random_state=42,
            class_weight="balanced",
        )
        rf.fit(X_train, y_train)

        rf_val_preds = rf.predict(X_val)
        rf_val_probs = rf.predict_proba(X_val)
        rf_test_preds = rf.predict(X_test)
        rf_test_probs = rf.predict_proba(X_test)

        rf_metrics = self._calculate_metrics(y_val, rf_val_preds, rf_val_probs, y_test, rf_test_preds, rf_test_probs)
        results["RandomForest"] = rf_metrics

        # Feature importances
        importances = dict(zip(feature_cols, rf.feature_importances_))
        sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
        results["RandomForest"]["top_features"] = sorted_imp[:8]

        rf_path = os.path.join(self.models_dir, "random_forest_ner_v1.pkl")
        with open(rf_path, "wb") as f:
            pickle.dump({"model": rf, "features": feature_cols}, f)
        print(f"  Random Forest Test Accuracy: {rf_metrics['test_accuracy']:.4f}, Test Macro F1: {rf_metrics['test_f1_macro']:.4f}")
        print(f"  Saved to: {rf_path}")

        # =========================================================================
        # Model 2: XGBoost Classifier
        # =========================================================================
        print("\n--- Training Model 2: XGBoost Classifier ---")
        from sklearn.preprocessing import LabelEncoder
        le = LabelEncoder()
        le.fit([0, 1, 2, 3])
        y_train_encoded = le.transform(y_train)

        xgb_model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            eval_metric="mlogloss",
        )
        xgb_model.fit(X_train, y_train_encoded)

        xgb_val_preds_encoded = xgb_model.predict(X_val)
        xgb_val_preds = le.inverse_transform(xgb_val_preds_encoded)
        xgb_val_probs = xgb_model.predict_proba(X_val)

        xgb_test_preds_encoded = xgb_model.predict(X_test)
        xgb_test_preds = le.inverse_transform(xgb_test_preds_encoded)
        xgb_test_probs = xgb_model.predict_proba(X_test)

        xgb_metrics = self._calculate_metrics(y_val, xgb_val_preds, xgb_val_probs, y_test, xgb_test_preds, xgb_test_probs)
        results["XGBoost"] = xgb_metrics

        xgb_path = os.path.join(self.models_dir, "xgboost_ner_v1.pkl")
        with open(xgb_path, "wb") as f:
            pickle.dump({"model": xgb_model, "features": feature_cols, "label_encoder": le}, f)
        print(f"  XGBoost Test Accuracy: {xgb_metrics['test_accuracy']:.4f}, Test Macro F1: {xgb_metrics['test_f1_macro']:.4f}")
        print(f"  Saved to: {xgb_path}")

        # =========================================================================
        # Model 3: Transparent Logistic Regression
        # =========================================================================
        print("\n--- Training Model 3: Transparent Logistic Regression ---")
        lr = LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            random_state=42,
        )
        lr.fit(X_train, y_train)

        lr_val_preds = lr.predict(X_val)
        lr_val_probs = lr.predict_proba(X_val)
        lr_test_preds = lr.predict(X_test)
        lr_test_probs = lr.predict_proba(X_test)

        lr_metrics = self._calculate_metrics(y_val, lr_val_preds, lr_val_probs, y_test, lr_test_preds, lr_test_probs)
        results["LogisticRegression"] = lr_metrics

        lr_path = os.path.join(self.models_dir, "logistic_regression_ner_v1.pkl")
        with open(lr_path, "wb") as f:
            pickle.dump({"model": lr, "features": feature_cols}, f)
        print(f"  Logistic Regression Test Accuracy: {lr_metrics['test_accuracy']:.4f}, Test Macro F1: {lr_metrics['test_f1_macro']:.4f}")
        print(f"  Saved to: {lr_path}")

        # Export metrics summary to models/ and reports/
        metrics_path = os.path.join(self.models_dir, "model_metrics.json")
        report_path = os.path.join(self.reports_dir, "model_evaluation_report.json")
        with open(metrics_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        print(f"\nAll model metrics saved to: {metrics_path} and {report_path}")

        return results

    def _calculate_metrics(
        self,
        y_val: np.ndarray,
        val_preds: np.ndarray,
        val_probs: np.ndarray,
        y_test: np.ndarray,
        test_preds: np.ndarray,
        test_probs: np.ndarray,
    ) -> Dict[str, Any]:
        """Calculates multiclass accuracy, macro/weighted F1, confusion matrices, and ROC-AUC."""
        val_acc = float(accuracy_score(y_val, val_preds))
        val_f1_macro = float(f1_score(y_val, val_preds, average="macro", zero_division=0))
        val_f1_weighted = float(f1_score(y_val, val_preds, average="weighted", zero_division=0))
        val_prec = float(precision_score(y_val, val_preds, average="weighted", zero_division=0))
        val_rec = float(recall_score(y_val, val_preds, average="weighted", zero_division=0))

        test_acc = float(accuracy_score(y_test, test_preds))
        test_f1_macro = float(f1_score(y_test, test_preds, average="macro", zero_division=0))
        test_f1_weighted = float(f1_score(y_test, test_preds, average="weighted", zero_division=0))
        test_prec = float(precision_score(y_test, test_preds, average="weighted", zero_division=0))
        test_rec = float(recall_score(y_test, test_preds, average="weighted", zero_division=0))

        # Confusion Matrix
        cm = confusion_matrix(y_test, test_preds).tolist()

        # Multi-class ROC AUC (OvR)
        try:
            present_classes = sorted(np.unique(y_test))
            if test_probs.shape[1] == len(present_classes):
                test_roc_auc = float(roc_auc_score(y_test, test_probs, multi_class="ovr", average="macro"))
            else:
                sub_probs = test_probs[:, present_classes]
                sub_probs = sub_probs / sub_probs.sum(axis=1, keepdims=True)
                test_roc_auc = float(roc_auc_score(y_test, sub_probs, multi_class="ovr", average="macro", labels=present_classes))
        except Exception:
            test_roc_auc = None

        # Multi-class Log Loss
        try:
            present_classes = sorted(np.unique(y_test))
            if test_probs.shape[1] == len(present_classes):
                test_loss = float(log_loss(y_test, test_probs))
            else:
                sub_probs = test_probs[:, present_classes]
                sub_probs = sub_probs / sub_probs.sum(axis=1, keepdims=True)
                test_loss = float(log_loss(y_test, sub_probs, labels=present_classes))
        except Exception:
            test_loss = None

        # Per-class metrics
        unique_labels = sorted(list(set(np.unique(y_test)).union(set(np.unique(test_preds)))))
        class_names = [CLASS_NAMES[i] for i in unique_labels]
        class_report = classification_report(
            y_test,
            test_preds,
            labels=unique_labels,
            target_names=class_names,
            output_dict=True,
            zero_division=0,
        )

        return {
            "val_accuracy": round(val_acc, 4),
            "val_f1_macro": round(val_f1_macro, 4),
            "val_f1_weighted": round(val_f1_weighted, 4),
            "val_precision": round(val_prec, 4),
            "val_recall": round(val_rec, 4),
            "test_accuracy": round(test_acc, 4),
            "test_f1_macro": round(test_f1_macro, 4),
            "test_f1_weighted": round(test_f1_weighted, 4),
            "test_precision": round(test_prec, 4),
            "test_recall": round(test_rec, 4),
            "test_roc_auc_ovr_macro": round(test_roc_auc, 4) if test_roc_auc is not None else "N/A",
            "test_log_loss": round(test_loss, 4) if test_loss is not None else "N/A",
            "confusion_matrix": cm,
            "per_class_metrics": class_report,
        }


if __name__ == "__main__":
    trainer = BaselineModelTrainer()
    trainer.train_and_evaluate()
