"""
Appends 7 subsurface geotechnical parameters to the recent 2026 NER dataset:
- depth_to_slip_plane_m
- pore_water_pressure_kpa
- effective_cohesion_kpa
- friction_angle_deg
- pore_pressure_ratio_ru
- factor_of_safety_fs
- subsurface_creep_um_hr

Strictly preserves all 53 original columns in their exact order.
Applies cleanly to NER_2026_MASTER.csv, train.csv, validation.csv, and test.csv.
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))
import pandas as pd
from src.feature_engineering.geotech import compute_subsurface_geotech

def augment_file(filepath: str):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist.")
        return
    
    df = pd.read_csv(filepath)
    orig_cols = list(df.columns)
    print(f"Processing {filepath}: {len(df)} rows, {len(orig_cols)} original columns.")
    
    geotech_records = []
    for idx, row in df.iterrows():
        g = compute_subsurface_geotech(row)
        geotech_records.append(g)
        
    df_geotech = pd.DataFrame(geotech_records)
    
    # Check if columns already exist, remove if re-running
    for col in df_geotech.columns:
        if col in df.columns:
            df = df.drop(columns=[col])
            
    # Concat along columns preserving exact original column order
    augmented_df = pd.concat([df, df_geotech], axis=1)
    augmented_df.to_csv(filepath, index=False)
    print(f"  Successfully augmented {filepath}: now {len(augmented_df.columns)} columns.")

def main():
    files = [
        "data/processed/NER_2026_MASTER.csv",
        "data/processed/train.csv",
        "data/processed/validation.csv",
        "data/processed/test.csv",
    ]
    for f in files:
        augment_file(f)
    print("\nAll recent 2026 datasets successfully augmented with subsurface Geotech data.")

if __name__ == "__main__":
    main()
