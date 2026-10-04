from pathlib import Path

import pandas as pd


# Directory containing the processed datasets
PROCESSED_DATA = Path("data/processed")


def check_unique(filename, columns):
    """Check whether the specified columns contain duplicate keys."""

    # Load the processed dataset
    df = pd.read_csv(PROCESSED_DATA / filename)

    # Count rows where the selected key columns are duplicated
    duplicate_count = df.duplicated(subset=columns).sum()

    print(f"{filename}")
    print(f"  Key: {', '.join(columns)}")
    print(f"  Rows: {len(df):,}")
    print(f"  Duplicate keys: {duplicate_count:,}")
    print()


if __name__ == "__main__":
    # Validate primary keys for the main dimension tables
    check_unique("customers.csv", ["customer_id"])
    check_unique("orders.csv", ["order_id"])
    check_unique("products.csv", ["product_id"])
    check_unique("sellers.csv", ["seller_id"])

    # Order items require a composite key because an order
    # can contain multiple products.
    check_unique(
        "order_items.csv",
        ["order_id", "order_item_id"],
    )

    # Payments can contain multiple records for the same order,
    # so order_id and payment_sequential together identify a record.
    check_unique(
        "payments.csv",
        ["order_id", "payment_sequential"],
    )

    # Validate the remaining reference tables
    check_unique("reviews.csv", ["review_id"])
    check_unique("category_translation.csv", ["product_category_name"])