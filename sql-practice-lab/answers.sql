USE flowmart_lab;

-- 01 创建练习数据库
CREATE DATABASE IF NOT EXISTS flowmart_lab
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE flowmart_lab;

-- 02 理解主键与外键
SELECT
  o.order_no,
  c.customer_name,
  o.order_status,
  o.order_amount
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
ORDER BY o.ordered_at DESC;

-- 03 筛选最近订单
SELECT
  order_no,
  customer_id,
  order_status,
  order_amount,
  ordered_at
FROM orders
WHERE ordered_at >= '2026-01-01'
  AND order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
ORDER BY ordered_at DESC
LIMIT 10;

-- 04 处理 NULL 值
SELECT
  customer_id,
  customer_name,
  COALESCE(email, '未填写') AS email_display,
  phone
FROM customers
WHERE email IS NULL;

-- 05 字符串模糊匹配
SELECT
  product_name,
  brand,
  list_price
FROM products
WHERE product_name LIKE '%咖啡%'
   OR product_name LIKE '%杯%'
ORDER BY list_price DESC;

-- 06 计算字段
SELECT
  order_item_id,
  order_id,
  product_id,
  quantity,
  unit_price * quantity AS gross_amount,
  discount_amount,
  unit_price * quantity - discount_amount AS net_amount
FROM order_items
ORDER BY order_id, order_item_id;

-- 07 三表关联
SELECT
  o.order_no,
  c.customer_name,
  p.product_name,
  oi.quantity,
  oi.unit_price * oi.quantity - oi.discount_amount AS item_paid_amount
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
JOIN order_items AS oi ON oi.order_id = o.order_id
JOIN products AS p ON p.product_id = oi.product_id
ORDER BY o.order_no, oi.order_item_id;

-- 08 LEFT JOIN 找缺失数据
SELECT
  o.order_no,
  c.customer_name,
  o.completed_at
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
LEFT JOIN reviews AS r ON r.order_id = o.order_id
WHERE o.order_status = 'COMPLETED'
  AND r.review_id IS NULL
ORDER BY o.completed_at DESC;

-- 09 多角色关联
SELECT
  t.ticket_no,
  c.customer_name,
  e.employee_name AS owner_name,
  s.store_name,
  t.ticket_status
FROM support_tickets AS t
JOIN customers AS c ON c.customer_id = t.customer_id
LEFT JOIN employees AS e ON e.employee_id = t.owner_employee_id
LEFT JOIN stores AS s ON s.store_id = e.store_id
ORDER BY t.created_at DESC;

-- 10 每日 GMV
SELECT
  DATE(ordered_at) AS order_date,
  COUNT(*) AS paid_order_count,
  SUM(order_amount) AS gmv
FROM orders
WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY DATE(ordered_at)
ORDER BY order_date;

-- 11 HAVING 筛选
SELECT
  c.customer_id,
  c.customer_name,
  SUM(o.order_amount) AS total_paid_amount
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY c.customer_id, c.customer_name
HAVING SUM(o.order_amount) > 500
ORDER BY total_paid_amount DESC;

-- 12 品类销售排行
SELECT
  cat.category_name,
  SUM(oi.quantity) AS sold_quantity,
  SUM(oi.unit_price * oi.quantity - oi.discount_amount) AS sales_amount,
  ROUND(AVG(o.order_amount), 2) AS avg_order_amount
FROM order_items AS oi
JOIN orders AS o ON o.order_id = oi.order_id
JOIN products AS p ON p.product_id = oi.product_id
JOIN categories AS cat ON cat.category_id = p.category_id
WHERE o.order_status <> 'CANCELLED'
GROUP BY cat.category_id, cat.category_name
ORDER BY sales_amount DESC;

-- 13 高于平均价格
SELECT
  p.product_name,
  p.list_price,
  c.category_name
FROM products AS p
JOIN categories AS c ON c.category_id = p.category_id
WHERE p.list_price > (
  SELECT AVG(p2.list_price)
  FROM products AS p2
  WHERE p2.category_id = p.category_id
)
ORDER BY c.category_name, p.list_price DESC;

-- 14 EXISTS 判断复购
SELECT
  c.customer_id,
  c.customer_name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o1
  JOIN orders AS o2
    ON o2.customer_id = o1.customer_id
   AND o2.order_id <> o1.order_id
  WHERE o1.customer_id = c.customer_id
    AND o1.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
    AND o2.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
);

-- 15 CTE 拆分复杂查询
WITH paid_orders AS (
  SELECT *
  FROM orders
  WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
)
SELECT
  c.customer_id,
  c.customer_name,
  COUNT(po.order_id) AS order_count,
  COALESCE(SUM(po.order_amount), 0) AS total_amount,
  MAX(po.ordered_at) AS last_ordered_at
FROM customers AS c
LEFT JOIN paid_orders AS po ON po.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name
ORDER BY total_amount DESC;

-- 16 递归 CTE 类目树
WITH RECURSIVE category_tree AS (
  SELECT
    category_id,
    parent_id,
    category_name,
    CAST(category_name AS CHAR(200)) AS category_path,
    1 AS depth
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  SELECT
    c.category_id,
    c.parent_id,
    c.category_name,
    CONCAT(ct.category_path, ' / ', c.category_name) AS category_path,
    ct.depth + 1 AS depth
  FROM categories AS c
  JOIN category_tree AS ct ON ct.category_id = c.parent_id
)
SELECT category_id, category_path, depth
FROM category_tree
ORDER BY category_path;

-- 17 会员消费排名
WITH customer_amount AS (
  SELECT
    c.customer_id,
    c.customer_name,
    COALESCE(SUM(o.order_amount), 0) AS total_amount
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
  GROUP BY c.customer_id, c.customer_name
)
SELECT
  customer_id,
  customer_name,
  total_amount,
  DENSE_RANK() OVER (ORDER BY total_amount DESC) AS amount_rank
FROM customer_amount
ORDER BY amount_rank, customer_id;

-- 18 每个品类销量冠军
WITH product_sales AS (
  SELECT
    p.product_id,
    p.product_name,
    c.category_name,
    SUM(oi.quantity) AS sold_quantity
  FROM products AS p
  JOIN categories AS c ON c.category_id = p.category_id
  JOIN order_items AS oi ON oi.product_id = p.product_id
  JOIN orders AS o ON o.order_id = oi.order_id
  WHERE o.order_status <> 'CANCELLED'
  GROUP BY p.product_id, p.product_name, c.category_name
),
ranked AS (
  SELECT
    product_sales.*,
    ROW_NUMBER() OVER (
      PARTITION BY category_name
      ORDER BY sold_quantity DESC, product_id
    ) AS rn
  FROM product_sales
)
SELECT category_name, product_name, sold_quantity
FROM ranked
WHERE rn = 1
ORDER BY category_name;

-- 19 移动累计 GMV
WITH daily_gmv AS (
  SELECT
    DATE(ordered_at) AS order_date,
    SUM(order_amount) AS gmv
  FROM orders
  WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
  GROUP BY DATE(ordered_at)
)
SELECT
  order_date,
  gmv,
  SUM(gmv) OVER (ORDER BY order_date) AS running_gmv
FROM daily_gmv
ORDER BY order_date;

-- 20 配送时效
SELECT
  order_no,
  ordered_at,
  completed_at,
  TIMESTAMPDIFF(HOUR, ordered_at, completed_at) AS fulfillment_hours
FROM orders
WHERE order_status = 'COMPLETED'
  AND completed_at IS NOT NULL
ORDER BY fulfillment_hours DESC;

-- 21 按月留存口径
WITH valid_orders AS (
  SELECT customer_id, ordered_at
  FROM orders
  WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
),
first_order AS (
  SELECT
    customer_id,
    DATE_FORMAT(MIN(ordered_at), '%Y-%m-01') AS cohort_month
  FROM valid_orders
  GROUP BY customer_id
)
SELECT
  fo.cohort_month,
  DATE_FORMAT(vo.ordered_at, '%Y-%m-01') AS active_month,
  COUNT(DISTINCT vo.customer_id) AS active_customers
FROM first_order AS fo
JOIN valid_orders AS vo ON vo.customer_id = fo.customer_id
GROUP BY fo.cohort_month, DATE_FORMAT(vo.ordered_at, '%Y-%m-01')
ORDER BY fo.cohort_month, active_month;

-- 22 新增会员
INSERT INTO customers (
  customer_name,
  phone,
  email,
  level_id,
  city,
  registered_at,
  is_active
) VALUES (
  '测试会员',
  '13900009999',
  'tester@flowmart.test',
  (SELECT level_id FROM membership_levels WHERE level_name = 'Silver'),
  '杭州',
  NOW(),
  1
);

-- 23 批量更新库存预警
UPDATE inventory
SET stock_status = 'LOW',
    updated_at = NOW()
WHERE available_qty < safety_stock;

-- 24 安全删除草稿券
DELETE c
FROM coupons AS c
LEFT JOIN order_coupons AS oc ON oc.coupon_id = c.coupon_id
WHERE c.coupon_status = 'DRAFT'
  AND c.created_at < '2025-01-01'
  AND oc.order_id IS NULL;

-- 25 下单扣库存事务
START TRANSACTION;

SELECT available_qty
FROM inventory
WHERE store_id = 1
  AND product_id = 3
FOR UPDATE;

UPDATE inventory
SET stock_status = CASE
      WHEN available_qty - 2 < safety_stock THEN 'LOW'
      ELSE 'NORMAL'
    END,
    available_qty = available_qty - 2,
    locked_qty = locked_qty + 2,
    updated_at = NOW()
WHERE store_id = 1
  AND product_id = 3
  AND available_qty >= 2;

COMMIT;

-- 26 退款回滚思路
START TRANSACTION;

INSERT INTO return_requests (
  return_no,
  order_id,
  customer_id,
  return_reason,
  return_status,
  refund_amount,
  requested_at
) VALUES (
  'RT_TEST_001',
  1,
  1,
  '演示退款失败回滚',
  'REQUESTED',
  99.00,
  NOW()
);

UPDATE orders
SET order_status = 'REFUNDING'
WHERE order_id = 1;

ROLLBACK;

-- 27 为订单查询建索引
CREATE INDEX idx_orders_customer_ordered
ON orders (customer_id, ordered_at);

-- 28 EXPLAIN 查看执行计划
EXPLAIN
SELECT
  order_id,
  order_no,
  order_amount,
  ordered_at
FROM orders
WHERE customer_id = 3
  AND ordered_at >= '2026-01-01'
ORDER BY ordered_at DESC;

-- 29 创建订单明细视图
CREATE OR REPLACE VIEW v_order_detail AS
SELECT
  o.order_no,
  o.ordered_at,
  o.order_status,
  c.customer_name,
  p.product_name,
  oi.quantity,
  oi.unit_price,
  oi.discount_amount,
  oi.unit_price * oi.quantity - oi.discount_amount AS item_paid_amount
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
JOIN order_items AS oi ON oi.order_id = o.order_id
JOIN products AS p ON p.product_id = oi.product_id;

-- 30 查找异常订单金额
SELECT
  o.order_no,
  o.order_amount,
  ROUND(SUM(oi.unit_price * oi.quantity - oi.discount_amount), 2) AS item_total,
  ROUND(o.order_amount - SUM(oi.unit_price * oi.quantity - oi.discount_amount), 2) AS diff_amount
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.order_no, o.order_amount
HAVING ABS(diff_amount) > 0.01;

-- 31 查找重复手机号
SELECT
  phone,
  COUNT(*) AS repeat_count,
  GROUP_CONCAT(customer_name ORDER BY customer_id) AS customer_names
FROM customers
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- 32 查询 JSON 字段
SELECT
  order_no,
  JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) AS source,
  JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.campaign')) AS campaign
FROM orders
WHERE JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) = 'miniapp';

-- 33 增加校验约束
ALTER TABLE products
ADD CONSTRAINT chk_products_list_price
CHECK (list_price >= 0);

-- 34 订单列表分页
SELECT
  order_no,
  customer_id,
  order_status,
  order_amount,
  ordered_at
FROM orders
ORDER BY ordered_at DESC, order_id DESC
LIMIT 5 OFFSET 5;

-- 35 门店库存周转
WITH sales_30d AS (
  SELECT
    o.store_id,
    oi.product_id,
    SUM(oi.quantity) AS sold_qty
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.order_id
  WHERE o.ordered_at >= DATE_SUB('2026-02-15', INTERVAL 30 DAY)
    AND o.order_status <> 'CANCELLED'
  GROUP BY o.store_id, oi.product_id
)
SELECT
  s.store_name,
  SUM(i.available_qty) AS available_qty,
  SUM(i.available_qty * p.cost_price) AS inventory_cost_amount,
  SUM(COALESCE(s30.sold_qty, 0)) AS sold_qty_30d
FROM stores AS s
JOIN inventory AS i ON i.store_id = s.store_id
JOIN products AS p ON p.product_id = i.product_id
LEFT JOIN sales_30d AS s30
  ON s30.store_id = i.store_id
 AND s30.product_id = i.product_id
GROUP BY s.store_id, s.store_name
ORDER BY inventory_cost_amount DESC;

-- 36 会员价值分层
WITH customer_stats AS (
  SELECT
    c.customer_id,
    c.customer_name,
    COALESCE(SUM(o.order_amount), 0) AS total_amount,
    MAX(o.ordered_at) AS last_ordered_at
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
  GROUP BY c.customer_id, c.customer_name
)
SELECT
  customer_id,
  customer_name,
  total_amount,
  last_ordered_at,
  CASE
    WHEN total_amount >= 1000 THEN 'VIP'
    WHEN last_ordered_at >= DATE_SUB('2026-02-15', INTERVAL 30 DAY) THEN '活跃'
    WHEN last_ordered_at < DATE_SUB('2026-02-15', INTERVAL 90 DAY) OR last_ordered_at IS NULL THEN '沉睡'
    ELSE '观察'
  END AS customer_segment
FROM customer_stats
ORDER BY total_amount DESC, last_ordered_at DESC;

-- 37 UNION 合并联系人
SELECT
  'CUSTOMER' AS contact_type,
  customer_name AS contact_name,
  city AS city_or_store
FROM customers
WHERE is_active = 1

UNION ALL

SELECT
  'EMPLOYEE' AS contact_type,
  e.employee_name AS contact_name,
  s.store_name AS city_or_store
FROM employees AS e
JOIN stores AS s ON s.store_id = e.store_id
WHERE e.is_active = 1
ORDER BY contact_type, contact_name;

-- 38 CROSS JOIN 生成巡检清单
SELECT
  s.store_name,
  p.product_name,
  CASE WHEN i.inventory_id IS NULL THEN '缺少库存记录' ELSE '已建库存记录' END AS inventory_check
FROM stores AS s
CROSS JOIN products AS p
LEFT JOIN inventory AS i
  ON i.store_id = s.store_id
 AND i.product_id = p.product_id
WHERE s.is_online = 1
  AND p.status = 'ON_SALE'
ORDER BY s.store_id, p.product_id;

-- 39 找出从未售出的商品
SELECT
  p.product_id,
  p.product_name,
  p.list_price
FROM products AS p
LEFT JOIN order_items AS oi ON oi.product_id = p.product_id
LEFT JOIN orders AS o
  ON o.order_id = oi.order_id
 AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
WHERE p.status = 'ON_SALE'
GROUP BY p.product_id, p.product_name, p.list_price
HAVING COUNT(o.order_id) = 0
ORDER BY p.product_id;

-- 40 支付渠道条件聚合
SELECT
  pay_channel,
  COUNT(*) AS payment_count,
  SUM(CASE WHEN pay_status = 'SUCCESS' THEN paid_amount ELSE 0 END) AS success_amount,
  SUM(CASE WHEN pay_status = 'REFUNDED' THEN paid_amount ELSE 0 END) AS refunded_amount
FROM payments
GROUP BY pay_channel
ORDER BY success_amount DESC;

-- 41 CASE 做订单金额分层
SELECT
  order_no,
  order_amount,
  CASE
    WHEN order_amount < 100 THEN '低客单'
    WHEN order_amount < 250 THEN '中客单'
    ELSE '高客单'
  END AS amount_level
FROM orders
ORDER BY order_amount DESC;

-- 42 WITH ROLLUP 汇总销售额
SELECT
  COALESCE(c.category_name, '总计') AS category_name,
  COALESCE(p.product_name, '小计') AS product_name,
  SUM(oi.unit_price * oi.quantity - oi.discount_amount) AS sales_amount
FROM order_items AS oi
JOIN orders AS o ON o.order_id = oi.order_id
JOIN products AS p ON p.product_id = oi.product_id
JOIN categories AS c ON c.category_id = p.category_id
WHERE o.order_status <> 'CANCELLED'
GROUP BY c.category_name, p.product_name WITH ROLLUP;

-- 43 LAG 计算复购间隔
WITH valid_orders AS (
  SELECT
    customer_id,
    order_no,
    ordered_at,
    LAG(ordered_at) OVER (
      PARTITION BY customer_id
      ORDER BY ordered_at
    ) AS prev_ordered_at
  FROM orders
  WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
)
SELECT
  customer_id,
  order_no,
  ordered_at,
  prev_ordered_at,
  TIMESTAMPDIFF(DAY, prev_ordered_at, ordered_at) AS days_since_prev_order
FROM valid_orders
WHERE prev_ordered_at IS NOT NULL
ORDER BY customer_id, ordered_at;

-- 44 NTILE 划分消费四分位
WITH customer_amount AS (
  SELECT
    c.customer_id,
    c.customer_name,
    COALESCE(SUM(o.order_amount), 0) AS total_amount
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
  GROUP BY c.customer_id, c.customer_name
)
SELECT
  customer_id,
  customer_name,
  total_amount,
  NTILE(4) OVER (ORDER BY total_amount DESC) AS amount_quartile
FROM customer_amount
ORDER BY amount_quartile, total_amount DESC;

-- 45 门店内 Top 2 商品
WITH store_product_sales AS (
  SELECT
    o.store_id,
    s.store_name,
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS sold_qty
  FROM orders AS o
  JOIN stores AS s ON s.store_id = o.store_id
  JOIN order_items AS oi ON oi.order_id = o.order_id
  JOIN products AS p ON p.product_id = oi.product_id
  WHERE o.order_status <> 'CANCELLED'
  GROUP BY o.store_id, s.store_name, p.product_id, p.product_name
),
ranked AS (
  SELECT
    store_product_sales.*,
    DENSE_RANK() OVER (
      PARTITION BY store_id
      ORDER BY sold_qty DESC
    ) AS sales_rank
  FROM store_product_sales
)
SELECT store_name, product_name, sold_qty, sales_rank
FROM ranked
WHERE sales_rank <= 2
ORDER BY store_name, sales_rank, product_name;

-- 46 订单状态透视统计
SELECT
  s.store_name,
  SUM(CASE WHEN o.order_status = 'CREATED' THEN 1 ELSE 0 END) AS created_count,
  SUM(CASE WHEN o.order_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
  SUM(CASE WHEN o.order_status = 'SHIPPED' THEN 1 ELSE 0 END) AS shipped_count,
  SUM(CASE WHEN o.order_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
  SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count
FROM stores AS s
LEFT JOIN orders AS o ON o.store_id = s.store_id
GROUP BY s.store_id, s.store_name
ORDER BY s.store_id;

-- 47 UPSERT 更新库存
INSERT INTO inventory (
  store_id,
  product_id,
  available_qty,
  locked_qty,
  safety_stock,
  stock_status,
  updated_at
) VALUES (
  1,
  12,
  5,
  0,
  5,
  'NORMAL',
  NOW()
)
ON DUPLICATE KEY UPDATE
  available_qty = available_qty + VALUES(available_qty),
  stock_status = CASE
    WHEN available_qty + VALUES(available_qty) <= 0 THEN 'OUT'
    WHEN available_qty + VALUES(available_qty) < safety_stock THEN 'LOW'
    ELSE 'NORMAL'
  END,
  updated_at = NOW();

-- 48 临时表沉淀高价值会员
CREATE TEMPORARY TABLE tmp_high_value_customers AS
SELECT
  customer_id,
  SUM(order_amount) AS total_amount
FROM orders
WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY customer_id
HAVING SUM(order_amount) > 300;

SELECT
  c.customer_name,
  t.total_amount,
  MAX(o.ordered_at) AS last_ordered_at
FROM tmp_high_value_customers AS t
JOIN customers AS c ON c.customer_id = t.customer_id
JOIN orders AS o ON o.customer_id = t.customer_id
GROUP BY c.customer_id, c.customer_name, t.total_amount
ORDER BY t.total_amount DESC;

-- 49 改写可索引日期查询
-- 不推荐：WHERE DATE(ordered_at) = '2026-02-01'
SELECT
  order_no,
  ordered_at,
  order_amount
FROM orders
WHERE ordered_at >= '2026-02-01 00:00:00'
  AND ordered_at < '2026-02-02 00:00:00'
ORDER BY ordered_at;

-- 50 设计覆盖索引
CREATE INDEX idx_orders_status_time_cover
ON orders (order_status, ordered_at, order_no, order_amount, customer_id);

EXPLAIN
SELECT
  order_no,
  order_amount,
  customer_id,
  ordered_at
FROM orders
WHERE order_status = 'COMPLETED'
  AND ordered_at >= '2026-01-01'
ORDER BY ordered_at DESC;

-- 51 设置事务隔离级别
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;

SELECT
  customer_id,
  SUM(order_amount) AS total_amount
FROM orders
WHERE customer_id = 3
  AND order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY customer_id;

COMMIT;

-- 52 新增外键前的数据检查
SELECT
  oi.order_item_id,
  oi.order_id
FROM order_items AS oi
LEFT JOIN orders AS o ON o.order_id = oi.order_id
WHERE o.order_id IS NULL;

-- 53 创建会员分析视图
CREATE OR REPLACE VIEW v_customer_profile AS
SELECT
  c.customer_id,
  c.customer_name,
  ml.level_name,
  COUNT(o.order_id) AS valid_order_count,
  COALESCE(SUM(o.order_amount), 0) AS total_amount,
  MAX(o.ordered_at) AS last_ordered_at
FROM customers AS c
JOIN membership_levels AS ml ON ml.level_id = c.level_id
LEFT JOIN orders AS o
  ON o.customer_id = c.customer_id
 AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY c.customer_id, c.customer_name, ml.level_name;

-- 54 给 JSON 来源建生成列
ALTER TABLE orders
ADD COLUMN source_channel VARCHAR(30)
GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source'))) STORED;

CREATE INDEX idx_orders_source_channel
ON orders (source_channel);

-- 55 封装会员消费查询过程
DELIMITER //

CREATE PROCEDURE sp_customer_order_summary(IN p_customer_id BIGINT)
BEGIN
  SELECT
    c.customer_id,
    c.customer_name,
    COUNT(o.order_id) AS valid_order_count,
    COALESCE(SUM(o.order_amount), 0) AS total_amount
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
  WHERE c.customer_id = p_customer_id
  GROUP BY c.customer_id, c.customer_name;
END //

DELIMITER ;

CALL sp_customer_order_summary(3);

-- 56 用触发器维护更新时间
DELIMITER //

CREATE TRIGGER trg_inventory_before_update
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END //

DELIMITER ;

-- 57 检查支付金额与订单金额
SELECT
  o.order_no,
  o.order_amount,
  p.payment_no,
  p.paid_amount,
  ROUND(p.paid_amount - o.order_amount, 2) AS diff_amount
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE p.pay_status = 'SUCCESS'
  AND ABS(p.paid_amount - o.order_amount) > 0.01;

-- 58 优惠券使用效果
SELECT
  c.coupon_code,
  c.coupon_name,
  COUNT(DISTINCT oc.order_id) AS used_order_count,
  SUM(oc.discount_amount) AS total_discount_amount,
  SUM(o.order_amount) AS paid_order_amount
FROM coupons AS c
LEFT JOIN order_coupons AS oc ON oc.coupon_id = c.coupon_id
LEFT JOIN orders AS o ON o.order_id = oc.order_id
GROUP BY c.coupon_id, c.coupon_code, c.coupon_name
ORDER BY used_order_count DESC, total_discount_amount DESC;

-- 59 RFM 会员分层
WITH customer_rfm AS (
  SELECT
    c.customer_id,
    c.customer_name,
    DATEDIFF('2026-02-15', MAX(o.ordered_at)) AS recency_days,
    COUNT(o.order_id) AS frequency_count,
    COALESCE(SUM(o.order_amount), 0) AS monetary_amount
  FROM customers AS c
  LEFT JOIN orders AS o
    ON o.customer_id = c.customer_id
   AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
  GROUP BY c.customer_id, c.customer_name
)
SELECT
  customer_id,
  customer_name,
  recency_days,
  frequency_count,
  monetary_amount,
  CASE
    WHEN recency_days <= 30 AND frequency_count >= 2 AND monetary_amount >= 500 THEN '核心价值'
    WHEN recency_days <= 30 THEN '近期活跃'
    WHEN monetary_amount >= 500 THEN '高价值待唤醒'
    ELSE '普通观察'
  END AS rfm_segment
FROM customer_rfm
ORDER BY monetary_amount DESC, recency_days;

-- 60 月度留存率
WITH valid_orders AS (
  SELECT
    customer_id,
    DATE_FORMAT(ordered_at, '%Y-%m-01') AS active_month
  FROM orders
  WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
),
cohort AS (
  SELECT
    customer_id,
    MIN(active_month) AS cohort_month
  FROM valid_orders
  GROUP BY customer_id
),
cohort_activity AS (
  SELECT
    c.cohort_month,
    vo.active_month,
    COUNT(DISTINCT vo.customer_id) AS active_customers
  FROM cohort AS c
  JOIN valid_orders AS vo ON vo.customer_id = c.customer_id
  GROUP BY c.cohort_month, vo.active_month
),
cohort_size AS (
  SELECT
    cohort_month,
    COUNT(*) AS total_customers
  FROM cohort
  GROUP BY cohort_month
)
SELECT
  ca.cohort_month,
  ca.active_month,
  ca.active_customers,
  cs.total_customers,
  ROUND(ca.active_customers / cs.total_customers, 4) AS retention_rate
FROM cohort_activity AS ca
JOIN cohort_size AS cs ON cs.cohort_month = ca.cohort_month
ORDER BY ca.cohort_month, ca.active_month;

-- 61 支付成功但订单未流转
SELECT
  o.order_id,
  o.order_no,
  o.order_status,
  o.paid_at AS order_paid_at,
  p.payment_no,
  p.pay_status,
  p.paid_amount,
  p.paid_at AS payment_paid_at
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE p.pay_status = 'SUCCESS'
  AND o.order_status IN ('CREATED', 'CANCELLED')
ORDER BY p.paid_at;

-- 62 取消订单存在成功支付
SELECT
  o.order_id,
  o.order_no,
  o.customer_id,
  o.order_amount,
  o.order_status,
  p.payment_id,
  p.payment_no,
  p.pay_status,
  p.paid_amount,
  p.paid_at
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE o.order_status = 'CANCELLED'
  AND p.pay_status = 'SUCCESS'
ORDER BY p.paid_at;

-- 63 订单支付时间回填
SELECT
  o.order_id,
  o.order_no,
  o.paid_at AS order_paid_at,
  p.paid_at AS payment_paid_at,
  TIMESTAMPDIFF(SECOND, o.paid_at, p.paid_at) AS diff_seconds
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE p.pay_status = 'SUCCESS'
  AND (
    o.paid_at IS NULL
    OR ABS(TIMESTAMPDIFF(SECOND, o.paid_at, p.paid_at)) > 60
  );

START TRANSACTION;

UPDATE orders AS o
JOIN payments AS p ON p.order_id = o.order_id
SET o.paid_at = p.paid_at
WHERE p.pay_status = 'SUCCESS'
  AND o.paid_at IS NULL;

COMMIT;

-- 64 订单金额与明细不一致
WITH item_amount AS (
  SELECT
    order_id,
    ROUND(SUM(quantity * unit_price - discount_amount), 2) AS item_total
  FROM order_items
  GROUP BY order_id
)
SELECT
  o.order_id,
  o.order_no,
  o.order_amount,
  ia.item_total,
  ROUND(o.order_amount - ia.item_total, 2) AS diff_amount
FROM orders AS o
JOIN item_amount AS ia ON ia.order_id = o.order_id
WHERE ABS(o.order_amount - ia.item_total) > 0.01
ORDER BY ABS(o.order_amount - ia.item_total) DESC;

-- 65 退款金额超过实付
WITH refund_summary AS (
  SELECT
    order_id,
    SUM(refund_amount) AS total_refund_amount
  FROM return_requests
  WHERE return_status IN ('APPROVED', 'REFUNDED')
  GROUP BY order_id
),
payment_summary AS (
  SELECT
    order_id,
    SUM(paid_amount) AS paid_amount
  FROM payments
  WHERE pay_status IN ('SUCCESS', 'REFUNDED')
  GROUP BY order_id
)
SELECT
  o.order_no,
  ps.paid_amount,
  rs.total_refund_amount,
  ROUND(rs.total_refund_amount - ps.paid_amount, 2) AS over_refund_amount
FROM refund_summary AS rs
JOIN payment_summary AS ps ON ps.order_id = rs.order_id
JOIN orders AS o ON o.order_id = rs.order_id
WHERE rs.total_refund_amount > ps.paid_amount;

-- 66 已退款订单同步支付状态
SELECT
  o.order_id,
  o.order_no,
  o.order_status,
  p.payment_id,
  p.payment_no,
  p.pay_status
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE o.order_status = 'REFUNDED'
  AND p.pay_status <> 'REFUNDED';

START TRANSACTION;

UPDATE payments AS p
JOIN orders AS o ON o.order_id = p.order_id
SET p.pay_status = 'REFUNDED'
WHERE o.order_status = 'REFUNDED'
  AND p.pay_status = 'SUCCESS';

COMMIT;

-- 67 有物流但订单未发货
SELECT
  o.order_id,
  o.order_no,
  o.order_status,
  s.carrier,
  s.tracking_no,
  s.shipped_at
FROM orders AS o
JOIN shipments AS s ON s.order_id = o.order_id
WHERE s.shipped_at IS NOT NULL
  AND o.order_status = 'PAID'
ORDER BY s.shipped_at;

START TRANSACTION;

UPDATE orders AS o
JOIN shipments AS s ON s.order_id = o.order_id
SET o.order_status = 'SHIPPED'
WHERE s.shipped_at IS NOT NULL
  AND o.order_status = 'PAID';

COMMIT;

-- 68 已完成订单缺少签收
SELECT
  o.order_id,
  o.order_no,
  o.completed_at,
  s.shipment_id,
  s.tracking_no,
  s.delivered_at
FROM orders AS o
LEFT JOIN shipments AS s ON s.order_id = o.order_id
WHERE o.order_status = 'COMPLETED'
  AND (s.shipment_id IS NULL OR s.delivered_at IS NULL)
ORDER BY o.completed_at;

-- 69 完成订单缺少评价
SELECT
  o.order_no,
  oi.product_id,
  p.product_name,
  oi.quantity,
  r.review_id
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.order_id
JOIN products AS p ON p.product_id = oi.product_id
LEFT JOIN reviews AS r
  ON r.order_id = oi.order_id
 AND r.product_id = oi.product_id
 AND r.customer_id = o.customer_id
WHERE o.order_status = 'COMPLETED'
  AND r.review_id IS NULL
ORDER BY o.completed_at, o.order_no;

-- 70 客服工单状态时间矛盾
SELECT
  ticket_id,
  ticket_no,
  ticket_status,
  priority,
  created_at,
  closed_at,
  CASE
    WHEN ticket_status = 'CLOSED' AND closed_at IS NULL THEN '已关闭但缺少 closed_at'
    WHEN ticket_status <> 'CLOSED' AND closed_at IS NOT NULL THEN '未关闭但存在 closed_at'
    ELSE '正常'
  END AS issue_reason
FROM support_tickets
WHERE (ticket_status = 'CLOSED' AND closed_at IS NULL)
   OR (ticket_status <> 'CLOSED' AND closed_at IS NOT NULL);

-- 71 库存状态与数量不一致
SELECT
  i.inventory_id,
  s.store_name,
  p.product_name,
  i.available_qty,
  i.safety_stock,
  i.stock_status,
  CASE
    WHEN i.available_qty = 0 THEN 'OUT'
    WHEN i.available_qty < i.safety_stock THEN 'LOW'
    ELSE 'NORMAL'
  END AS expected_status
FROM inventory AS i
JOIN stores AS s ON s.store_id = i.store_id
JOIN products AS p ON p.product_id = i.product_id
WHERE i.stock_status <>
  CASE
    WHEN i.available_qty = 0 THEN 'OUT'
    WHEN i.available_qty < i.safety_stock THEN 'LOW'
    ELSE 'NORMAL'
  END;

-- 72 锁定库存异常
SELECT
  i.inventory_id,
  s.store_name,
  p.sku,
  p.product_name,
  i.available_qty,
  i.locked_qty,
  i.available_qty - i.locked_qty AS sellable_qty
FROM inventory AS i
JOIN stores AS s ON s.store_id = i.store_id
JOIN products AS p ON p.product_id = i.product_id
WHERE i.locked_qty > i.available_qty
   OR i.available_qty - i.locked_qty < 0
ORDER BY sellable_qty;

-- 73 下架商品产生新订单
SELECT
  o.order_no,
  o.order_status,
  o.ordered_at,
  p.sku,
  p.product_name,
  p.status AS product_status,
  oi.quantity,
  oi.unit_price
FROM order_items AS oi
JOIN orders AS o ON o.order_id = oi.order_id
JOIN products AS p ON p.product_id = oi.product_id
WHERE p.status IN ('OFF_SALE', 'DISCONTINUED')
  AND o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
ORDER BY o.ordered_at DESC;

-- 74 无效优惠券被使用
SELECT
  o.order_no,
  o.ordered_at,
  o.order_amount,
  c.coupon_code,
  c.coupon_status,
  c.valid_from,
  c.valid_to,
  c.min_order_amount,
  oc.discount_amount,
  CASE
    WHEN c.coupon_status <> 'ACTIVE' THEN '券状态不可用'
    WHEN o.ordered_at < c.valid_from THEN '未到生效期'
    WHEN o.ordered_at > c.valid_to THEN '超过有效期'
    WHEN o.order_amount < c.min_order_amount THEN '未满足门槛'
    ELSE '正常'
  END AS issue_reason
FROM order_coupons AS oc
JOIN orders AS o ON o.order_id = oc.order_id
JOIN coupons AS c ON c.coupon_id = oc.coupon_id
WHERE c.coupon_status <> 'ACTIVE'
   OR o.ordered_at < c.valid_from
   OR o.ordered_at > c.valid_to
   OR o.order_amount < c.min_order_amount;

-- 75 重复手机号会员合并候选
WITH ranked_customers AS (
  SELECT
    customer_id,
    customer_name,
    phone,
    points,
    registered_at,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY is_active DESC, points DESC, registered_at ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY phone) AS same_phone_count
  FROM customers
  WHERE phone IS NOT NULL
)
SELECT
  keep_customer.phone,
  keep_customer.customer_id AS keep_customer_id,
  keep_customer.customer_name AS keep_customer_name,
  merge_customer.customer_id AS merge_customer_id,
  merge_customer.customer_name AS merge_customer_name,
  keep_customer.same_phone_count
FROM ranked_customers AS keep_customer
JOIN ranked_customers AS merge_customer
  ON merge_customer.phone = keep_customer.phone
 AND merge_customer.rn > 1
WHERE keep_customer.rn = 1
  AND keep_customer.same_phone_count > 1
ORDER BY keep_customer.phone, merge_customer.customer_id;

-- 76 订单来源 JSON 缺失
SELECT
  order_id,
  order_no,
  ext_json,
  JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) AS source_channel
FROM orders
WHERE JSON_EXTRACT(ext_json, '$.source') IS NULL
   OR JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) NOT IN ('miniapp', 'web', 'app')
   OR JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) = '';

-- 77 日期边界漏单排查
SELECT
  '错误 BETWEEN 日期' AS metric_name,
  COUNT(*) AS order_count,
  COALESCE(SUM(order_amount), 0) AS order_amount
FROM orders
WHERE ordered_at BETWEEN '2026-02-01' AND '2026-02-01'
UNION ALL
SELECT
  '正确半开区间' AS metric_name,
  COUNT(*) AS order_count,
  COALESCE(SUM(order_amount), 0) AS order_amount
FROM orders
WHERE ordered_at >= '2026-02-01'
  AND ordered_at < '2026-02-02';

-- 78 慢查询索引排查
EXPLAIN
SELECT
  order_id,
  order_no,
  customer_id,
  order_amount,
  ordered_at
FROM orders
WHERE order_status = 'COMPLETED'
  AND ordered_at >= '2026-01-01'
  AND ordered_at < '2026-03-01'
ORDER BY ordered_at DESC
LIMIT 20;

-- 79 修复前备份异常订单
CREATE TEMPORARY TABLE tmp_fix_paid_orders AS
SELECT
  o.order_id,
  o.order_no,
  o.order_status AS old_order_status,
  o.paid_at AS old_paid_at,
  p.payment_id,
  p.paid_at AS payment_paid_at
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE o.order_status = 'CREATED'
  AND p.pay_status = 'SUCCESS';

START TRANSACTION;

UPDATE orders AS o
JOIN tmp_fix_paid_orders AS t ON t.order_id = o.order_id
SET
  o.order_status = 'PAID',
  o.paid_at = t.payment_paid_at;

SELECT
  t.order_no,
  t.old_order_status,
  o.order_status AS new_order_status,
  t.old_paid_at,
  o.paid_at AS new_paid_at
FROM tmp_fix_paid_orders AS t
JOIN orders AS o ON o.order_id = t.order_id;

COMMIT;

-- 80 修复后异常总览复核
SELECT '支付成功订单状态异常' AS check_item, COUNT(*) AS issue_count
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE p.pay_status = 'SUCCESS'
  AND o.order_status IN ('CREATED', 'CANCELLED')
UNION ALL
SELECT '已退款订单支付未退款' AS check_item, COUNT(*) AS issue_count
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE o.order_status = 'REFUNDED'
  AND p.pay_status <> 'REFUNDED'
UNION ALL
SELECT '有物流但订单未发货' AS check_item, COUNT(*) AS issue_count
FROM orders AS o
JOIN shipments AS s ON s.order_id = o.order_id
WHERE s.shipped_at IS NOT NULL
  AND o.order_status = 'PAID'
UNION ALL
SELECT '库存状态错误' AS check_item, COUNT(*) AS issue_count
FROM inventory
WHERE stock_status <>
  CASE
    WHEN available_qty = 0 THEN 'OUT'
    WHEN available_qty < safety_stock THEN 'LOW'
    ELSE 'NORMAL'
  END;
