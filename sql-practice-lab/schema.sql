CREATE DATABASE IF NOT EXISTS flowmart_lab
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE flowmart_lab;

DROP TABLE IF EXISTS ticket_messages;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS return_requests;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_coupons;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS membership_levels;

CREATE TABLE membership_levels (
  level_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  level_name VARCHAR(30) NOT NULL UNIQUE,
  min_points INT NOT NULL DEFAULT 0,
  discount_rate DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (min_points >= 0),
  CHECK (discount_rate > 0 AND discount_rate <= 1)
) ENGINE = InnoDB;

CREATE TABLE customers (
  customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_name VARCHAR(60) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(120) NULL,
  level_id BIGINT NOT NULL,
  city VARCHAR(40) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  registered_at DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_customers_level
    FOREIGN KEY (level_id) REFERENCES membership_levels(level_id),
  KEY idx_customers_phone (phone),
  KEY idx_customers_city_registered (city, registered_at)
) ENGINE = InnoDB;

CREATE TABLE stores (
  store_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  store_name VARCHAR(80) NOT NULL,
  city VARCHAR(40) NOT NULL,
  address VARCHAR(200) NOT NULL,
  opened_at DATE NOT NULL,
  is_online TINYINT(1) NOT NULL DEFAULT 1,
  KEY idx_stores_city (city)
) ENGINE = InnoDB;

CREATE TABLE employees (
  employee_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  store_id BIGINT NOT NULL,
  employee_name VARCHAR(60) NOT NULL,
  role_name VARCHAR(40) NOT NULL,
  hired_at DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_employees_store
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
  KEY idx_employees_store_role (store_id, role_name)
) ENGINE = InnoDB;

CREATE TABLE suppliers (
  supplier_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  supplier_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(60) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  city VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE categories (
  category_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT NULL,
  category_name VARCHAR(80) NOT NULL,
  sort_no INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories(category_id),
  UNIQUE KEY uk_categories_parent_name (parent_id, category_name)
) ENGINE = InnoDB;

CREATE TABLE products (
  product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(40) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  category_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  brand VARCHAR(60) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  list_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ON_SALE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
  CONSTRAINT fk_products_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  UNIQUE KEY uk_products_sku (sku),
  KEY idx_products_category_price (category_id, list_price),
  CHECK (cost_price >= 0),
  CHECK (status IN ('ON_SALE', 'OFF_SALE', 'DISCONTINUED'))
) ENGINE = InnoDB;

CREATE TABLE inventory (
  inventory_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  store_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  available_qty INT NOT NULL DEFAULT 0,
  locked_qty INT NOT NULL DEFAULT 0,
  safety_stock INT NOT NULL DEFAULT 0,
  stock_status VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_store
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
  CONSTRAINT fk_inventory_product
    FOREIGN KEY (product_id) REFERENCES products(product_id),
  UNIQUE KEY uk_inventory_store_product (store_id, product_id),
  KEY idx_inventory_product (product_id),
  CHECK (available_qty >= 0),
  CHECK (locked_qty >= 0),
  CHECK (safety_stock >= 0),
  CHECK (stock_status IN ('NORMAL', 'LOW', 'OUT'))
) ENGINE = InnoDB;

CREATE TABLE orders (
  order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(40) NOT NULL,
  customer_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  order_status VARCHAR(20) NOT NULL,
  order_amount DECIMAL(10, 2) NOT NULL,
  freight_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ordered_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  completed_at DATETIME NULL,
  ext_json JSON NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_orders_store
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
  UNIQUE KEY uk_orders_order_no (order_no),
  KEY idx_orders_status_ordered (order_status, ordered_at),
  CHECK (order_status IN ('CREATED', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED')),
  CHECK (order_amount >= 0),
  CHECK (freight_amount >= 0)
) ENGINE = InnoDB;

CREATE TABLE order_items (
  order_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(product_id),
  KEY idx_order_items_product (product_id),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (discount_amount >= 0)
) ENGINE = InnoDB;

CREATE TABLE coupons (
  coupon_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  coupon_code VARCHAR(40) NOT NULL,
  coupon_name VARCHAR(100) NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  coupon_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_coupons_code (coupon_code),
  CHECK (discount_type IN ('AMOUNT', 'PERCENT')),
  CHECK (coupon_status IN ('DRAFT', 'ACTIVE', 'EXPIRED')),
  CHECK (discount_value > 0)
) ENGINE = InnoDB;

CREATE TABLE order_coupons (
  order_id BIGINT NOT NULL,
  coupon_id BIGINT NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (order_id, coupon_id),
  CONSTRAINT fk_order_coupons_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_order_coupons_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id),
  CHECK (discount_amount >= 0)
) ENGINE = InnoDB;

CREATE TABLE payments (
  payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  payment_no VARCHAR(50) NOT NULL,
  pay_channel VARCHAR(20) NOT NULL,
  pay_status VARCHAR(20) NOT NULL,
  paid_amount DECIMAL(10, 2) NOT NULL,
  paid_at DATETIME NULL,
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  UNIQUE KEY uk_payments_payment_no (payment_no),
  KEY idx_payments_order (order_id),
  CHECK (pay_channel IN ('WECHAT', 'ALIPAY', 'CARD', 'BALANCE')),
  CHECK (pay_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  CHECK (paid_amount >= 0)
) ENGINE = InnoDB;

CREATE TABLE shipments (
  shipment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  carrier VARCHAR(40) NOT NULL,
  tracking_no VARCHAR(60) NOT NULL,
  shipped_at DATETIME NULL,
  delivered_at DATETIME NULL,
  CONSTRAINT fk_shipments_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  UNIQUE KEY uk_shipments_tracking_no (tracking_no)
) ENGINE = InnoDB;

CREATE TABLE return_requests (
  return_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  return_no VARCHAR(40) NOT NULL,
  order_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  return_reason VARCHAR(200) NOT NULL,
  return_status VARCHAR(20) NOT NULL,
  refund_amount DECIMAL(10, 2) NOT NULL,
  requested_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_return_requests_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_return_requests_customer
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  UNIQUE KEY uk_return_requests_return_no (return_no),
  CHECK (return_status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED')),
  CHECK (refund_amount >= 0)
) ENGINE = InnoDB;

CREATE TABLE reviews (
  review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,
  review_text VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_reviews_customer
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  KEY idx_reviews_product_rating (product_id, rating),
  CHECK (rating BETWEEN 1 AND 5)
) ENGINE = InnoDB;

CREATE TABLE support_tickets (
  ticket_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_no VARCHAR(40) NOT NULL,
  customer_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  owner_employee_id BIGINT NULL,
  issue_type VARCHAR(40) NOT NULL,
  ticket_status VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  CONSTRAINT fk_tickets_customer
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_tickets_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_tickets_owner
    FOREIGN KEY (owner_employee_id) REFERENCES employees(employee_id),
  UNIQUE KEY uk_tickets_no (ticket_no),
  KEY idx_tickets_status_created (ticket_status, created_at),
  CHECK (ticket_status IN ('OPEN', 'PROCESSING', 'CLOSED')),
  CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'))
) ENGINE = InnoDB;

CREATE TABLE ticket_messages (
  message_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  message_body VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_messages_ticket
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id),
  KEY idx_messages_ticket_created (ticket_id, created_at),
  CHECK (sender_type IN ('CUSTOMER', 'EMPLOYEE', 'SYSTEM'))
) ENGINE = InnoDB;
