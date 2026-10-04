from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_DIR = PROJECT_ROOT / "reports"

OUTPUT_DIR.mkdir(exist_ok=True)


# Load order and payment data
orders = pd.read_csv(DATA_DIR / "orders.csv")
payments = pd.read_csv(DATA_DIR / "payments.csv")

orders["order_purchase_timestamp"] = pd.to_datetime(
    orders["order_purchase_timestamp"]
)


# Aggregate payments to the order level so multiple payment
# records for one order do not distort revenue or AOV.
order_payments = (
    payments.groupby("order_id", as_index=False)["payment_value"]
    .sum()
    .rename(columns={"payment_value": "order_value"})
)

sales = orders.merge(
    order_payments,
    on="order_id",
    how="inner",
)


# Calculate monthly sales performance
monthly_sales = (
    sales.assign(
        month=(
            sales["order_purchase_timestamp"]
            .dt.to_period("M")
            .dt.to_timestamp()
        )
    )
    .groupby("month", as_index=False)
    .agg(
        orders=("order_id", "nunique"),
        revenue=("order_value", "sum"),
        average_order_value=("order_value", "mean"),
    )
)

monthly_sales["revenue"] = monthly_sales["revenue"].round(2)
monthly_sales["average_order_value"] = monthly_sales[
    "average_order_value"
].round(2)


# Save results for reports and dashboards
monthly_sales.to_csv(
    OUTPUT_DIR / "monthly_sales.csv",
    index=False,
)


# Plot monthly revenue
plt.figure(figsize=(12, 6))

plt.plot(
    monthly_sales["month"],
    monthly_sales["revenue"],
)

plt.title("Monthly Revenue")
plt.xlabel("Month")
plt.ylabel("Revenue")
plt.xticks(rotation=45)
plt.tight_layout()

plt.savefig(
    OUTPUT_DIR / "monthly_revenue.png",
    dpi=150,
)

plt.close()


print("Sales analysis completed.")
print(f"Monthly analysis saved to: {OUTPUT_DIR / 'monthly_sales.csv'}")
print(f"Revenue chart saved to: {OUTPUT_DIR / 'monthly_revenue.png'}")