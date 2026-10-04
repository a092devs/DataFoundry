from pathlib import Path

import psycopg2


# Directory containing the cleaned datasets
PROCESSED_DATA = Path("data/processed")


# PostgreSQL connection settings.
# The password is requested at runtime instead of being stored here.
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "datafoundry",
    "user": "postgres",
}


# Map PostgreSQL tables to their processed CSV files.
# The order matters because of foreign-key dependencies.
TABLE_FILES = [
    ("customers", "customers.csv"),
    ("sellers", "sellers.csv"),
    ("products", "products.csv"),
    ("category_translation", "category_translation.csv"),
    ("orders", "orders.csv"),
    ("order_items", "order_items.csv"),
    ("payments", "payments.csv"),
    ("reviews", "reviews.csv"),
    ("geolocation", "geolocation.csv"),
]


def load_table(cursor, table_name, filename):
    """Load a processed CSV file into a PostgreSQL table."""

    filepath = PROCESSED_DATA / filename

    # COPY loads CSV data efficiently compared with row-by-row inserts
    with open(filepath, "r", encoding="utf-8") as file:
        cursor.copy_expert(
            f"""
            COPY {table_name}
            FROM STDIN
            WITH CSV HEADER
            """,
            file,
        )

    print(f"Loaded: {filename}")


def main():
    """Connect to PostgreSQL and load all processed datasets."""

    # Request the database password without storing it in the project
    password = input("PostgreSQL password: ")

    connection = psycopg2.connect(
        **DB_CONFIG,
        password=password,
    )

    try:
        cursor = connection.cursor()

        # Load tables in dependency order
        for table_name, filename in TABLE_FILES:
            load_table(cursor, table_name, filename)

        # Commit only after all tables load successfully
        connection.commit()

        print()
        print("All tables loaded successfully.")

    except Exception:
        # Roll back the transaction if any table fails
        connection.rollback()
        raise

    finally:
        # Always close the cursor and database connection
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()