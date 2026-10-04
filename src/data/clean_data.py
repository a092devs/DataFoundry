from pathlib import Path

import pandas as pd


# Input and output directories
RAW_DATA = Path("data/raw")
PROCESSED_DATA = Path("data/processed")


def load_csv(filename):
    """Load a CSV file from the raw data directory."""
    return pd.read_csv(RAW_DATA / filename)


def save_csv(df, filename):
    """Save a processed dataframe to the processed data directory."""
    PROCESSED_DATA.mkdir(parents=True, exist_ok=True)
    df.to_csv(PROCESSED_DATA / filename, index=False)


def clean_simple_table(filename, output_filename):
    """Copy a table to the processed directory without transformations."""
    df = load_csv(filename)
    save_csv(df, output_filename)

    print(f"Processed: {filename}")


def clean_order_items():
    """Clean order item data and convert the shipping date to datetime."""
    order_items = load_csv("olist_order_items_dataset.csv")

    # Convert the shipping deadline to a datetime value
    order_items["shipping_limit_date"] = pd.to_datetime(
        order_items["shipping_limit_date"]
    )

    save_csv(order_items, "order_items.csv")

    print("Processed: olist_order_items_dataset.csv")


def clean_payments():
    """Clean payment data and convert numeric fields to numeric types."""
    payments = load_csv("olist_order_payments_dataset.csv")

    # Convert payment fields to numeric values
    payments["payment_sequential"] = pd.to_numeric(
        payments["payment_sequential"]
    )

    payments["payment_installments"] = pd.to_numeric(
        payments["payment_installments"]
    )

    payments["payment_value"] = pd.to_numeric(
        payments["payment_value"]
    )

    save_csv(payments, "payments.csv")

    print("Processed: olist_order_payments_dataset.csv")


def clean_reviews():
    """Clean review data and convert review timestamps to datetime."""
    reviews = load_csv("olist_order_reviews_dataset.csv")

    date_columns = [
        "review_creation_date",
        "review_answer_timestamp",
    ]

    # Convert review date fields to datetime values
    for column in date_columns:
        reviews[column] = pd.to_datetime(reviews[column])

    save_csv(reviews, "reviews.csv")

    print("Processed: olist_order_reviews_dataset.csv")


def clean_products():
    """Clean product data and convert descriptive fields to numeric types."""
    products = load_csv("olist_products_dataset.csv")

    numeric_columns = [
        "product_name_lenght",
        "product_description_lenght",
        "product_photos_qty",
        "product_weight_g",
        "product_length_cm",
        "product_height_cm",
        "product_width_cm",
    ]

    # Convert product fields to numeric values.
    # Invalid values are converted to missing values.
    for column in numeric_columns:
        products[column] = pd.to_numeric(
            products[column],
            errors="coerce",
        )

    integer_columns = [
        "product_name_lenght",
        "product_description_lenght",
        "product_photos_qty",
    ]

    # Preserve missing values while storing these fields as integers
    for column in integer_columns:
        products[column] = products[column].astype("Int64")

    save_csv(products, "products.csv")

    print("Processed: olist_products_dataset.csv")


def clean_orders():
    """Clean order timestamps and calculate delivery metrics."""
    orders = load_csv("olist_orders_dataset.csv")

    date_columns = [
        "order_purchase_timestamp",
        "order_approved_at",
        "order_delivered_carrier_date",
        "order_delivered_customer_date",
        "order_estimated_delivery_date",
    ]

    # Convert order lifecycle timestamps to datetime values
    for column in date_columns:
        orders[column] = pd.to_datetime(orders[column])

    # Calculate the time between purchase and customer delivery
    orders["delivery_time"] = (
        orders["order_delivered_customer_date"]
        - orders["order_purchase_timestamp"]
    )

    # Convert the delivery duration from seconds to days
    orders["delivery_days"] = (
        orders["delivery_time"].dt.total_seconds()
        / (24 * 60 * 60)
    )

    # Positive values indicate delivery after the estimated date
    orders["delivery_delay_days"] = (
        orders["order_delivered_customer_date"]
        - orders["order_estimated_delivery_date"]
    ).dt.total_seconds() / (24 * 60 * 60)

    # Flag delivery records that conflict with the order status
    orders["delivery_data_issue"] = False

    orders.loc[
        (orders["order_status"] == "canceled")
        & (orders["order_delivered_customer_date"].notna()),
        "delivery_data_issue",
    ] = True

    orders.loc[
        (orders["order_status"] == "delivered")
        & (orders["order_delivered_customer_date"].isna()),
        "delivery_data_issue",
    ] = True

    save_csv(orders, "orders.csv")

    print("Processed: olist_orders_dataset.csv")


if __name__ == "__main__":
    # Tables that do not require additional transformations
    clean_simple_table(
        "olist_customers_dataset.csv",
        "customers.csv",
    )

    clean_simple_table(
        "olist_geolocation_dataset.csv",
        "geolocation.csv",
    )

    clean_simple_table(
        "olist_sellers_dataset.csv",
        "sellers.csv",
    )

    clean_simple_table(
        "product_category_name_translation.csv",
        "category_translation.csv",
    )

    # Tables requiring specific cleaning and transformations
    clean_order_items()
    clean_payments()
    clean_reviews()
    clean_products()
    clean_orders()