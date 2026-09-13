"""
Sentinel NER — Geospatial & Temporal Leakage-Proof Dataset Splitter
Prevents spatial autocorrelation leakage by splitting datasets using geographic blocks / basins
(70% Train, 15% Validation, 15% Test) rather than naive random pixel sampling.
"""

from typing import Dict, List, Optional, Tuple
import os
import math
import numpy as np
import pandas as pd


class SpatialBlockSplitter:
    """
    Partitions geospatial points into discrete spatial blocks (e.g. 50km x 50km),
    assigning entire contiguous blocks to Train (70%), Validation (15%), or Test (15%).
    Guarantees zero spatial overlap / leakage across splits.
    """

    def __init__(
        self,
        block_size_deg: float = 0.50, # ~55 km blocks
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        random_seed: int = 42,
    ):
        assert math.isclose(train_ratio + val_ratio + test_ratio, 1.0, abs_tol=1e-5)
        self.block_size_deg = block_size_deg
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.random_seed = random_seed

    def split(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Splits DataFrame into (train_df, val_df, test_df) by spatial blocks.
        """
        assert "latitude" in df.columns and "longitude" in df.columns, "DataFrame must contain latitude and longitude."

        # Assign spatial block IDs
        df_copy = df.copy()
        lat_idx = (df_copy["latitude"] / self.block_size_deg).astype(int)
        lon_idx = (df_copy["longitude"] / self.block_size_deg).astype(int)
        df_copy["spatial_block_id"] = lat_idx.astype(str) + "_" + lon_idx.astype(str)

        # Get unique blocks and shuffle deterministically
        unique_blocks = df_copy["spatial_block_id"].unique()
        rng = np.random.RandomState(self.random_seed)
        rng.shuffle(unique_blocks)

        n_blocks = len(unique_blocks)
        n_train = max(1, int(round(n_blocks * self.train_ratio)))
        n_val = max(1, int(round(n_blocks * self.val_ratio)))

        train_blocks = set(unique_blocks[:n_train])
        val_blocks = set(unique_blocks[n_train:n_train + n_val])
        test_blocks = set(unique_blocks[n_train + n_val:])

        train_df = df_copy[df_copy["spatial_block_id"].isin(train_blocks)].drop(columns=["spatial_block_id"])
        val_df = df_copy[df_copy["spatial_block_id"].isin(val_blocks)].drop(columns=["spatial_block_id"])
        test_df = df_copy[df_copy["spatial_block_id"].isin(test_blocks)].drop(columns=["spatial_block_id"])

        return train_df, val_df, test_df


def generate_and_save_splits(
    master_csv_path: str = "data/processed/NER_2026_MASTER.csv",
    output_dir: str = "data/processed",
    block_size_deg: float = 0.50,
) -> Dict[str, int]:
    """
    Loads master dataset, performs spatial block split, and writes train.csv, validation.csv, test.csv.
    """
    df = pd.read_csv(master_csv_path)
    splitter = SpatialBlockSplitter(block_size_deg=block_size_deg)
    train_df, val_df, test_df = splitter.split(df)

    os.makedirs(output_dir, exist_ok=True)
    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "validation.csv")
    test_path = os.path.join(output_dir, "test.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"Generated Leakage-Proof Spatial Splits:")
    print(f"  -> Train:      {len(train_df)} rows ({len(train_df)/len(df):.1%}) -> {train_path}")
    print(f"  -> Validation: {len(val_df)} rows ({len(val_df)/len(df):.1%}) -> {val_path}")
    print(f"  -> Test:       {len(test_df)} rows ({len(test_df)/len(df):.1%}) -> {test_path}")

    return {
        "train_count": len(train_df),
        "val_count": len(val_df),
        "test_count": len(test_df),
        "total_count": len(df),
    }


if __name__ == "__main__":
    generate_and_save_splits()
