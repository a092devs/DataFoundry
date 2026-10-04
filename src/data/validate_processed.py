from pathlib import Path

import pandas as pd


# Directory containing the processed datasets
PROCESSED_DATA = Path("data/processed")


# Expected row counts from the original Olist dataset.
# These values help detect accidental data loss or duplication.
EXPECTED_ROWS = {
    "customers.csv": 99_441,
    "geolocation.csv": 1_000_163,
    "sellers.csv": 3_095,
    "category_translation.csv": 71,
    "order_items.csv": 112_650,
    "payments.csv": 103_886,
    "reviews.csv": 99_224,
    "products.csv": 32_951,
    "orders.csv": 99_441,
}


def validate_processed_data():
    """Validate processed files and their expected row counts."""

    print("Processed Data Validation")
    print("=" * 60)

    all_valid = True

    for filename, expected_rows in EXPECTED_ROWS.items():
        filepath = PROCESSED_DATA / filename

        # Check that the processed file exists
        if not filepath.exists():
            print(f"[MISSING] {filename}")
            all_valid = False
            continue

        df = pd.read_csv(filepath)

        # Check that cleaning did not change the expected row count
        if len(df) != expected_rows:
            print(
                f"[ROW COUNT ERROR] {filename}: "
                f"expected {expected_rows:,}, got {len(df):,}"
            )
            all_valid = False
        else:
            print(
                f"[OK] {filename}: "
                f"{len(df):,} rows × {len(df.columns)} columns"
            )

    print("=" * 60)

    if all_valid:
        print("Validation passed.")
    else:
        print("Validation failed.")


if __name__ == "__main__":
    validate_processed_data()