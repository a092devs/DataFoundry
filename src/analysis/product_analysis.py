from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_DIR = PROJECT_ROOT / "reports"

OUTPUT_DIR.mkdir(exist_ok=True)


# Load product and order item data
products = pd.read_csv(DATA_DIR / "products.csv")
order_items = pd.read_csv(DATA_DIR / "order_items.csv")


# Combine product information with sales data
product_sales = order_items.merge(
    products[["product_id", "product_category_name"]],
    on="product_id",
    how="left",
)


# Remove missing categories from category-level analysis
product_sales = product_sales[
    product_sales["product_category_name"].notna()
    & (product_sales["product_category_name"] != "")
]


# Calculate category sales performance
category_analysis = (
    product_sales.groupby("product_category_name", as_index=False)
    .agg(
        items_sold=("product_id", "count"),
        orders=("order_id", "nunique"),
        revenue=("price", "sum"),
        average_item_price=("price", "mean"),
    )
)

category_analysis["revenue"] = category_analysis["revenue"].round(2)
category_analysis["average_item_price"] = category_analysis[
    "average_item_price"
].round(2)


# Rank categories by revenue
category_revenue = category_analysis.sort_values(
    "revenue",
    ascending=False,
).reset_index(drop=True)

category_revenue.to_csv(
    OUTPUT_DIR / "category_analysis.csv",
    index=False,
)


# Top categories by number of items sold
top_volume = category_analysis.nlargest(
    15,
    "items_sold",
).sort_values("items_sold")

top_volume.to_csv(
    OUTPUT_DIR / "top_categories_by_volume.csv",
    index=False,
)


# Highest average item prices among categories with enough data
high_value_categories = (
    category_analysis[
        category_analysis["items_sold"] >= 100
    ]
    .nlargest(15, "average_item_price")
    .sort_values("average_item_price")
)

high_value_categories.to_csv(
    OUTPUT_DIR / "high_value_categories.csv",
    index=False,
)


# Plot top categories by revenue
top_revenue = category_analysis.nlargest(
    15,
    "revenue",
).sort_values("revenue")

plt.figure(figsize=(10, 7))

plt.barh(
    top_revenue["product_category_name"],
    top_revenue["revenue"],
)

plt.title("Top Product Categories by Revenue")
plt.xlabel("Revenue")
plt.ylabel("Product Category")
plt.tight_layout()

plt.savefig(
    OUTPUT_DIR / "category_revenue.png",
    dpi=150,
)

plt.close()


# Plot top categories by sales volume
plt.figure(figsize=(10, 7))

plt.barh(
    top_volume["product_category_name"],
    top_volume["items_sold"],
)

plt.title("Top Product Categories by Sales Volume")
plt.xlabel("Items Sold")
plt.ylabel("Product Category")
plt.tight_layout()

plt.savefig(
    OUTPUT_DIR / "category_volume.png",
    dpi=150,
)

plt.close()


print("Product analysis completed.")
print(f"Category analysis saved to: {OUTPUT_DIR / 'category_analysis.csv'}")
print(
    f"Top volume categories saved to: "
    f"{OUTPUT_DIR / 'top_categories_by_volume.csv'}"
)
print(
    f"High-value categories saved to: "
    f"{OUTPUT_DIR / 'high_value_categories.csv'}"
)
print(f"Revenue chart saved to: {OUTPUT_DIR / 'category_revenue.png'}")
print(f"Volume chart saved to: {OUTPUT_DIR / 'category_volume.png'}")