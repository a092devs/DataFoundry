-- ============================================================
-- CUSTOMERS
-- ============================================================

-- customer_unique_id identifies the actual customer across
-- multiple customer records.

CREATE TABLE customers (
    customer_id VARCHAR(32) PRIMARY KEY,
    customer_unique_id VARCHAR(32) NOT NULL,
    customer_zip_code_prefix INTEGER NOT NULL,
    customer_city VARCHAR(100) NOT NULL,
    customer_state CHAR(2) NOT NULL
);


-- ============================================================
-- SELLERS
-- ============================================================

CREATE TABLE sellers (
    seller_id VARCHAR(32) PRIMARY KEY,
    seller_zip_code_prefix INTEGER NOT NULL,
    seller_city VARCHAR(100) NOT NULL,
    seller_state CHAR(2) NOT NULL
);


-- ============================================================
-- PRODUCTS
-- ============================================================

-- Product attributes include category, dimensions, weight,
-- photos, and text lengths.

CREATE TABLE products (
    product_id VARCHAR(32) PRIMARY KEY,
    product_category_name VARCHAR(100),
    product_name_lenght INTEGER,
    product_description_lenght INTEGER,
    product_photos_qty INTEGER,
    product_weight_g NUMERIC,
    product_length_cm NUMERIC,
    product_height_cm NUMERIC,
    product_width_cm NUMERIC
);


-- ============================================================
-- CATEGORY TRANSLATION
-- ============================================================

-- Maps the original category names to their English names.

CREATE TABLE category_translation (
    product_category_name VARCHAR(100) PRIMARY KEY,
    product_category_name_english VARCHAR(100)
);


-- ============================================================
-- ORDERS
-- ============================================================

-- delivery_days and delivery_delay_days are derived during
-- data cleaning for delivery analysis.
--
-- delivery_data_issue flags inconsistent delivery records.

CREATE TABLE orders (
    order_id VARCHAR(32) PRIMARY KEY,
    customer_id VARCHAR(32) NOT NULL,
    order_status VARCHAR(20) NOT NULL,
    order_purchase_timestamp TIMESTAMP,
    order_approved_at TIMESTAMP,
    order_delivered_carrier_date TIMESTAMP,
    order_delivered_customer_date TIMESTAMP,
    order_estimated_delivery_date TIMESTAMP,
    delivery_time INTERVAL,
    delivery_days NUMERIC,
    delivery_delay_days NUMERIC,
    delivery_data_issue BOOLEAN NOT NULL,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
);


-- ============================================================
-- ORDER ITEMS
-- ============================================================

-- An order can contain multiple items, so order_id and
-- order_item_id together form the primary key.

CREATE TABLE order_items (
    order_id VARCHAR(32) NOT NULL,
    order_item_id INTEGER NOT NULL,
    product_id VARCHAR(32) NOT NULL,
    seller_id VARCHAR(32) NOT NULL,
    shipping_limit_date TIMESTAMP,
    price NUMERIC(10, 2),
    freight_value NUMERIC(10, 2),

    PRIMARY KEY (order_id, order_item_id),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id),

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_order_items_seller
        FOREIGN KEY (seller_id)
        REFERENCES sellers(seller_id)
);


-- ============================================================
-- PAYMENTS
-- ============================================================

-- An order can have multiple payment records, so order_id
-- and payment_sequential form the primary key.

CREATE TABLE payments (
    order_id VARCHAR(32) NOT NULL,
    payment_sequential INTEGER NOT NULL,
    payment_type VARCHAR(30),
    payment_installments INTEGER,
    payment_value NUMERIC(10, 2),

    PRIMARY KEY (order_id, payment_sequential),

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
);


-- ============================================================
-- REVIEWS
-- ============================================================

-- An order can have multiple review records, so order_id
-- and review_id are used together as the primary key.

CREATE TABLE reviews (
    review_id VARCHAR(32) NOT NULL,
    order_id VARCHAR(32) NOT NULL,
    review_score INTEGER,
    review_comment_title TEXT,
    review_comment_message TEXT,
    review_creation_date TIMESTAMP,
    review_answer_timestamp TIMESTAMP,

    PRIMARY KEY (order_id, review_id),

    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
);


-- ============================================================
-- GEOLOCATION
-- ============================================================

-- The source data can contain multiple records for the same
-- ZIP code prefix, so this table does not define a primary key.

CREATE TABLE geolocation (
    geolocation_zip_code_prefix INTEGER,
    geolocation_lat NUMERIC,
    geolocation_lng NUMERIC,
    geolocation_city VARCHAR(100),
    geolocation_state CHAR(2)
);