const exercises = [
    {
        id: 1,
        category: "环境与建模",
        level: "基础",
        title: "创建练习数据库",
        question: "创建数据库 flowmart_lab，并指定 utf8mb4 字符集与常见排序规则。",
        answer: `CREATE DATABASE IF NOT EXISTS flowmart_lab
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE flowmart_lab;`
    },
    {
        id: 2,
        category: "环境与建模",
        level: "基础",
        title: "理解主键与外键",
        question: "写出 orders 表和 customers 表之间的关系，并查询订单对应的会员姓名。",
        answer: `SELECT
  o.order_no,
  c.customer_name,
  o.order_status,
  o.order_amount
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
ORDER BY o.ordered_at DESC;`
    },
    {
        id: 3,
        category: "基础查询",
        level: "基础",
        title: "筛选最近订单",
        question: "查询 2026 年 1 月 1 日之后已支付或已完成的订单，按下单时间倒序展示前 10 条。",
        answer: `SELECT
  order_no,
  customer_id,
  order_status,
  order_amount,
  ordered_at
FROM orders
WHERE ordered_at >= '2026-01-01'
  AND order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
ORDER BY ordered_at DESC
LIMIT 10;`
    },
    {
        id: 4,
        category: "基础查询",
        level: "基础",
        title: "处理 NULL 值",
        question: "查询没有邮箱的会员，并用“未填写”展示邮箱字段。",
        answer: `SELECT
  customer_id,
  customer_name,
  COALESCE(email, '未填写') AS email_display,
  phone
FROM customers
WHERE email IS NULL;`
    },
    {
        id: 5,
        category: "基础查询",
        level: "基础",
        title: "字符串模糊匹配",
        question: "查询名称中包含“咖啡”或“杯”的商品，展示商品名、品牌和售价。",
        answer: `SELECT
  product_name,
  brand,
  list_price
FROM products
WHERE product_name LIKE '%咖啡%'
   OR product_name LIKE '%杯%'
ORDER BY list_price DESC;`
    },
    {
        id: 6,
        category: "基础查询",
        level: "基础",
        title: "计算字段",
        question: "查询每个订单明细的原价金额、折后金额和优惠金额。",
        answer: `SELECT
  order_item_id,
  order_id,
  product_id,
  quantity,
  unit_price * quantity AS gross_amount,
  discount_amount,
  unit_price * quantity - discount_amount AS net_amount
FROM order_items
ORDER BY order_id, order_item_id;`
    },
    {
        id: 7,
        category: "JOIN",
        level: "基础",
        title: "三表关联",
        question: "查询订单号、会员名、商品名、购买数量和明细实付金额。",
        answer: `SELECT
  o.order_no,
  c.customer_name,
  p.product_name,
  oi.quantity,
  oi.unit_price * oi.quantity - oi.discount_amount AS item_paid_amount
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
JOIN order_items AS oi ON oi.order_id = o.order_id
JOIN products AS p ON p.product_id = oi.product_id
ORDER BY o.order_no, oi.order_item_id;`
    },
    {
        id: 8,
        category: "JOIN",
        level: "基础",
        title: "LEFT JOIN 找缺失数据",
        question: "找出还没有任何评价的已完成订单。",
        answer: `SELECT
  o.order_no,
  c.customer_name,
  o.completed_at
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
LEFT JOIN reviews AS r ON r.order_id = o.order_id
WHERE o.order_status = 'COMPLETED'
  AND r.review_id IS NULL
ORDER BY o.completed_at DESC;`
    },
    {
        id: 9,
        category: "JOIN",
        level: "进阶",
        title: "多角色关联",
        question: "查询客服工单编号、会员名、处理员工姓名和门店名。",
        answer: `SELECT
  t.ticket_no,
  c.customer_name,
  e.employee_name AS owner_name,
  s.store_name,
  t.ticket_status
FROM support_tickets AS t
JOIN customers AS c ON c.customer_id = t.customer_id
LEFT JOIN employees AS e ON e.employee_id = t.owner_employee_id
LEFT JOIN stores AS s ON s.store_id = e.store_id
ORDER BY t.created_at DESC;`
    },
    {
        id: 10,
        category: "聚合统计",
        level: "基础",
        title: "每日 GMV",
        question: "统计每天已支付、已发货、已完成订单的 GMV 和订单数。",
        answer: `SELECT
  DATE(ordered_at) AS order_date,
  COUNT(*) AS paid_order_count,
  SUM(order_amount) AS gmv
FROM orders
WHERE order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY DATE(ordered_at)
ORDER BY order_date;`
    },
    {
        id: 11,
        category: "聚合统计",
        level: "基础",
        title: "HAVING 筛选",
        question: "找出累计消费金额大于 500 元的会员。",
        answer: `SELECT
  c.customer_id,
  c.customer_name,
  SUM(o.order_amount) AS total_paid_amount
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY c.customer_id, c.customer_name
HAVING SUM(o.order_amount) > 500
ORDER BY total_paid_amount DESC;`
    },
    {
        id: 12,
        category: "聚合统计",
        level: "进阶",
        title: "品类销售排行",
        question: "按品类统计销量、销售额和平均客单价，排除已取消订单。",
        answer: `SELECT
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
ORDER BY sales_amount DESC;`
    },
    {
        id: 13,
        category: "子查询",
        level: "进阶",
        title: "高于平均价格",
        question: "查询售价高于所在品类平均售价的商品。",
        answer: `SELECT
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
ORDER BY c.category_name, p.list_price DESC;`
    },
    {
        id: 14,
        category: "子查询",
        level: "进阶",
        title: "EXISTS 判断复购",
        question: "查询至少有两笔有效订单的会员。",
        answer: `SELECT
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
);`
    },
    {
        id: 15,
        category: "CTE",
        level: "进阶",
        title: "CTE 拆分复杂查询",
        question: "用 CTE 统计每个会员的累计消费、订单数和最近一次下单时间。",
        answer: `WITH paid_orders AS (
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
ORDER BY total_amount DESC;`
    },
    {
        id: 16,
        category: "CTE",
        level: "高级",
        title: "递归 CTE 类目树",
        question: "输出商品类目的层级路径，例如“食品饮料 / 咖啡茶饮”。",
        answer: `WITH RECURSIVE category_tree AS (
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
ORDER BY category_path;`
    },
    {
        id: 17,
        category: "窗口函数",
        level: "高级",
        title: "会员消费排名",
        question: "按会员累计消费额做排名，消费相同使用并列排名。",
        answer: `WITH customer_amount AS (
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
ORDER BY amount_rank, customer_id;`
    },
    {
        id: 18,
        category: "窗口函数",
        level: "高级",
        title: "每个品类销量冠军",
        question: "查询每个品类销量最高的商品。",
        answer: `WITH product_sales AS (
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
ORDER BY category_name;`
    },
    {
        id: 19,
        category: "窗口函数",
        level: "高级",
        title: "移动累计 GMV",
        question: "统计每日 GMV，并计算截至当天的累计 GMV。",
        answer: `WITH daily_gmv AS (
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
ORDER BY order_date;`
    },
    {
        id: 20,
        category: "日期时间",
        level: "进阶",
        title: "配送时效",
        question: "计算每笔已完成订单从下单到完成的小时数。",
        answer: `SELECT
  order_no,
  ordered_at,
  completed_at,
  TIMESTAMPDIFF(HOUR, ordered_at, completed_at) AS fulfillment_hours
FROM orders
WHERE order_status = 'COMPLETED'
  AND completed_at IS NOT NULL
ORDER BY fulfillment_hours DESC;`
    },
    {
        id: 21,
        category: "日期时间",
        level: "进阶",
        title: "按月留存口径",
        question: "查询每个会员首单月份与后续下单月份，用于计算留存。",
        answer: `WITH valid_orders AS (
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
ORDER BY fo.cohort_month, active_month;`
    },
    {
        id: 22,
        category: "DML",
        level: "基础",
        title: "新增会员",
        question: "插入一名新会员，手机号为 13900009999，等级为 Silver。",
        answer: `INSERT INTO customers (
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
);`
    },
    {
        id: 23,
        category: "DML",
        level: "进阶",
        title: "批量更新库存预警",
        question: "把可用库存小于安全库存的 inventory 记录标记为 LOW。",
        answer: `UPDATE inventory
SET stock_status = 'LOW',
    updated_at = NOW()
WHERE available_qty < safety_stock;`
    },
    {
        id: 24,
        category: "DML",
        level: "进阶",
        title: "安全删除草稿券",
        question: "删除 2025 年以前创建且从未被订单使用过的草稿优惠券。",
        answer: `DELETE c
FROM coupons AS c
LEFT JOIN order_coupons AS oc ON oc.coupon_id = c.coupon_id
WHERE c.coupon_status = 'DRAFT'
  AND c.created_at < '2025-01-01'
  AND oc.order_id IS NULL;`
    },
    {
        id: 25,
        category: "事务",
        level: "高级",
        title: "下单扣库存事务",
        question: "模拟订单支付成功后扣减库存：锁定库存行，校验库存，扣减 available_qty 并增加 locked_qty。",
        answer: `START TRANSACTION;

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

COMMIT;`
    },
    {
        id: 26,
        category: "事务",
        level: "高级",
        title: "退款回滚思路",
        question: "写出退款失败时需要回滚的事务结构，包含新增退款记录和更新订单状态。",
        answer: `START TRANSACTION;

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

-- 如果后续支付渠道退款失败：
ROLLBACK;

-- 如果全部成功，则使用 COMMIT;`
    },
    {
        id: 27,
        category: "索引与性能",
        level: "进阶",
        title: "为订单查询建索引",
        question: "运营常按 customer_id + ordered_at 查询订单，创建合适的联合索引。",
        answer: `CREATE INDEX idx_orders_customer_ordered
ON orders (customer_id, ordered_at);`
    },
    {
        id: 28,
        category: "索引与性能",
        level: "高级",
        title: "EXPLAIN 查看执行计划",
        question: "查看订单按会员和时间范围查询时是否命中索引。",
        answer: `EXPLAIN
SELECT
  order_id,
  order_no,
  order_amount,
  ordered_at
FROM orders
WHERE customer_id = 3
  AND ordered_at >= '2026-01-01'
ORDER BY ordered_at DESC;`
    },
    {
        id: 29,
        category: "视图",
        level: "进阶",
        title: "创建订单明细视图",
        question: "创建一个 v_order_detail 视图，封装订单、会员、商品和明细金额。",
        answer: `CREATE OR REPLACE VIEW v_order_detail AS
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
JOIN products AS p ON p.product_id = oi.product_id;`
    },
    {
        id: 30,
        category: "数据质量",
        level: "进阶",
        title: "查找异常订单金额",
        question: "找出订单表金额与明细汇总金额不一致的订单。",
        answer: `SELECT
  o.order_no,
  o.order_amount,
  ROUND(SUM(oi.unit_price * oi.quantity - oi.discount_amount), 2) AS item_total,
  ROUND(o.order_amount - SUM(oi.unit_price * oi.quantity - oi.discount_amount), 2) AS diff_amount
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.order_id
GROUP BY o.order_id, o.order_no, o.order_amount
HAVING ABS(diff_amount) > 0.01;`
    },
    {
        id: 31,
        category: "数据质量",
        level: "基础",
        title: "查找重复手机号",
        question: "查询手机号重复的会员记录。",
        answer: `SELECT
  phone,
  COUNT(*) AS repeat_count,
  GROUP_CONCAT(customer_name ORDER BY customer_id) AS customer_names
FROM customers
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;`
    },
    {
        id: 32,
        category: "JSON",
        level: "高级",
        title: "查询 JSON 字段",
        question: "从 orders.ext_json 中查询来源渠道为 miniapp 的订单。",
        answer: `SELECT
  order_no,
  JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) AS source,
  JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.campaign')) AS campaign
FROM orders
WHERE JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) = 'miniapp';`
    },
    {
        id: 33,
        category: "约束",
        level: "进阶",
        title: "增加校验约束",
        question: "给商品售价增加非负约束。",
        answer: `ALTER TABLE products
ADD CONSTRAINT chk_products_list_price
CHECK (list_price >= 0);`
    },
    {
        id: 34,
        category: "分页",
        level: "基础",
        title: "订单列表分页",
        question: "查询订单列表第 2 页，每页 5 条，按下单时间倒序。",
        answer: `SELECT
  order_no,
  customer_id,
  order_status,
  order_amount,
  ordered_at
FROM orders
ORDER BY ordered_at DESC, order_id DESC
LIMIT 5 OFFSET 5;`
    },
    {
        id: 35,
        category: "报表",
        level: "高级",
        title: "门店库存周转",
        question: "统计各门店当前库存数量、库存金额和近 30 天销量。",
        answer: `WITH sales_30d AS (
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
ORDER BY inventory_cost_amount DESC;`
    },
    {
        id: 36,
        category: "综合实战",
        level: "高级",
        title: "会员价值分层",
        question: "按累计消费和最近消费时间，把会员分成 VIP、活跃、沉睡、观察四类。",
        answer: `WITH customer_stats AS (
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
ORDER BY total_amount DESC, last_ordered_at DESC;`
    },
    {
        id: 37,
        category: "集合操作",
        level: "进阶",
        title: "UNION 合并联系人",
        question: "把会员和员工合并成一张联系人清单，字段统一为 contact_type、contact_name、city_or_store。",
        answer: `SELECT
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
ORDER BY contact_type, contact_name;`
    },
    {
        id: 38,
        category: "JOIN",
        level: "进阶",
        title: "CROSS JOIN 生成巡检清单",
        question: "生成所有在线门店与所有在售商品的库存巡检清单，并标记是否已有库存记录。",
        answer: `SELECT
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
ORDER BY s.store_id, p.product_id;`
    },
    {
        id: 39,
        category: "数据质量",
        level: "进阶",
        title: "找出从未售出的商品",
        question: "查询从未出现在有效订单明细中的在售商品。",
        answer: `SELECT
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
ORDER BY p.product_id;`
    },
    {
        id: 40,
        category: "聚合统计",
        level: "进阶",
        title: "支付渠道条件聚合",
        question: "统计各支付渠道的成功支付金额、退款金额和支付笔数。",
        answer: `SELECT
  pay_channel,
  COUNT(*) AS payment_count,
  SUM(CASE WHEN pay_status = 'SUCCESS' THEN paid_amount ELSE 0 END) AS success_amount,
  SUM(CASE WHEN pay_status = 'REFUNDED' THEN paid_amount ELSE 0 END) AS refunded_amount
FROM payments
GROUP BY pay_channel
ORDER BY success_amount DESC;`
    },
    {
        id: 41,
        category: "基础查询",
        level: "基础",
        title: "CASE 做订单金额分层",
        question: "把订单按实付金额分为低客单、中客单、高客单三档。",
        answer: `SELECT
  order_no,
  order_amount,
  CASE
    WHEN order_amount < 100 THEN '低客单'
    WHEN order_amount < 250 THEN '中客单'
    ELSE '高客单'
  END AS amount_level
FROM orders
ORDER BY order_amount DESC;`
    },
    {
        id: 42,
        category: "报表",
        level: "高级",
        title: "WITH ROLLUP 汇总销售额",
        question: "按品类和商品统计销售额，并额外生成品类小计与总计。",
        answer: `SELECT
  COALESCE(c.category_name, '总计') AS category_name,
  COALESCE(p.product_name, '小计') AS product_name,
  SUM(oi.unit_price * oi.quantity - oi.discount_amount) AS sales_amount
FROM order_items AS oi
JOIN orders AS o ON o.order_id = oi.order_id
JOIN products AS p ON p.product_id = oi.product_id
JOIN categories AS c ON c.category_id = p.category_id
WHERE o.order_status <> 'CANCELLED'
GROUP BY c.category_name, p.product_name WITH ROLLUP;`
    },
    {
        id: 43,
        category: "窗口函数",
        level: "高级",
        title: "LAG 计算复购间隔",
        question: "计算每个会员相邻两次有效下单之间相隔多少天。",
        answer: `WITH valid_orders AS (
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
ORDER BY customer_id, ordered_at;`
    },
    {
        id: 44,
        category: "窗口函数",
        level: "高级",
        title: "NTILE 划分消费四分位",
        question: "按会员累计消费额把会员分成 4 个消费层级。",
        answer: `WITH customer_amount AS (
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
ORDER BY amount_quartile, total_amount DESC;`
    },
    {
        id: 45,
        category: "窗口函数",
        level: "高级",
        title: "门店内 Top 2 商品",
        question: "查询每个门店销售数量排名前 2 的商品。",
        answer: `WITH store_product_sales AS (
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
ORDER BY store_name, sales_rank, product_name;`
    },
    {
        id: 46,
        category: "报表",
        level: "进阶",
        title: "订单状态透视统计",
        question: "按门店统计不同订单状态的订单数量，输出为多列。",
        answer: `SELECT
  s.store_name,
  SUM(CASE WHEN o.order_status = 'CREATED' THEN 1 ELSE 0 END) AS created_count,
  SUM(CASE WHEN o.order_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
  SUM(CASE WHEN o.order_status = 'SHIPPED' THEN 1 ELSE 0 END) AS shipped_count,
  SUM(CASE WHEN o.order_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
  SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count
FROM stores AS s
LEFT JOIN orders AS o ON o.store_id = s.store_id
GROUP BY s.store_id, s.store_name
ORDER BY s.store_id;`
    },
    {
        id: 47,
        category: "DML",
        level: "高级",
        title: "UPSERT 更新库存",
        question: "为门店 1 的商品 12 增加库存记录；如果已存在，则把可用库存增加 5。",
        answer: `INSERT INTO inventory (
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
  updated_at = NOW();`
    },
    {
        id: 48,
        category: "临时表",
        level: "高级",
        title: "临时表沉淀高价值会员",
        question: "创建临时表保存累计消费大于 300 的会员，再查询他们的最近订单。",
        answer: `CREATE TEMPORARY TABLE tmp_high_value_customers AS
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
ORDER BY t.total_amount DESC;`
    },
    {
        id: 49,
        category: "索引与性能",
        level: "进阶",
        title: "改写可索引日期查询",
        question: "把按日期函数过滤订单的写法改成更容易命中索引的范围查询。",
        answer: `-- 不推荐：WHERE DATE(ordered_at) = '2026-02-01'
SELECT
  order_no,
  ordered_at,
  order_amount
FROM orders
WHERE ordered_at >= '2026-02-01 00:00:00'
  AND ordered_at < '2026-02-02 00:00:00'
ORDER BY ordered_at;`
    },
    {
        id: 50,
        category: "索引与性能",
        level: "高级",
        title: "设计覆盖索引",
        question: "订单列表常按状态和下单时间筛选，并展示订单号、金额、会员 ID，创建一个尽量覆盖查询的索引。",
        answer: `CREATE INDEX idx_orders_status_time_cover
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
ORDER BY ordered_at DESC;`
    },
    {
        id: 51,
        category: "事务",
        level: "高级",
        title: "设置事务隔离级别",
        question: "开启一个可重复读事务，查询会员 3 的订单总额，并说明事务结束方式。",
        answer: `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;

SELECT
  customer_id,
  SUM(order_amount) AS total_amount
FROM orders
WHERE customer_id = 3
  AND order_status IN ('PAID', 'SHIPPED', 'COMPLETED')
GROUP BY customer_id;

COMMIT;`
    },
    {
        id: 52,
        category: "约束",
        level: "高级",
        title: "新增外键前的数据检查",
        question: "如果要给某张历史明细表补外键，应该先查出无法匹配 orders 的脏数据。用 order_items 演示检查思路。",
        answer: `SELECT
  oi.order_item_id,
  oi.order_id
FROM order_items AS oi
LEFT JOIN orders AS o ON o.order_id = oi.order_id
WHERE o.order_id IS NULL;`
    },
    {
        id: 53,
        category: "视图",
        level: "高级",
        title: "创建会员分析视图",
        question: "创建 v_customer_profile，输出会员等级、订单数、累计消费和最近下单时间。",
        answer: `CREATE OR REPLACE VIEW v_customer_profile AS
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
GROUP BY c.customer_id, c.customer_name, ml.level_name;`
    },
    {
        id: 54,
        category: "JSON",
        level: "高级",
        title: "给 JSON 来源建生成列",
        question: "为 orders.ext_json 中的 source 增加生成列，并为来源查询创建索引。",
        answer: `ALTER TABLE orders
ADD COLUMN source_channel VARCHAR(30)
GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source'))) STORED;

CREATE INDEX idx_orders_source_channel
ON orders (source_channel);`
    },
    {
        id: 55,
        category: "存储过程",
        level: "高级",
        title: "封装会员消费查询过程",
        question: "创建一个存储过程，传入会员 ID，返回该会员有效订单数和累计消费。",
        answer: `DELIMITER //

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

CALL sp_customer_order_summary(3);`
    },
    {
        id: 56,
        category: "触发器",
        level: "高级",
        title: "用触发器维护更新时间",
        question: "创建触发器，在 inventory 更新前自动刷新 updated_at。",
        answer: `DELIMITER //

CREATE TRIGGER trg_inventory_before_update
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
END //

DELIMITER ;`
    },
    {
        id: 57,
        category: "数据质量",
        level: "进阶",
        title: "检查支付金额与订单金额",
        question: "找出支付成功但支付金额和订单金额不一致的订单。",
        answer: `SELECT
  o.order_no,
  o.order_amount,
  p.payment_no,
  p.paid_amount,
  ROUND(p.paid_amount - o.order_amount, 2) AS diff_amount
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE p.pay_status = 'SUCCESS'
  AND ABS(p.paid_amount - o.order_amount) > 0.01;`
    },
    {
        id: 58,
        category: "报表",
        level: "高级",
        title: "优惠券使用效果",
        question: "统计每张优惠券的使用订单数、优惠总额和带来的订单实付金额。",
        answer: `SELECT
  c.coupon_code,
  c.coupon_name,
  COUNT(DISTINCT oc.order_id) AS used_order_count,
  SUM(oc.discount_amount) AS total_discount_amount,
  SUM(o.order_amount) AS paid_order_amount
FROM coupons AS c
LEFT JOIN order_coupons AS oc ON oc.coupon_id = c.coupon_id
LEFT JOIN orders AS o ON o.order_id = oc.order_id
GROUP BY c.coupon_id, c.coupon_code, c.coupon_name
ORDER BY used_order_count DESC, total_discount_amount DESC;`
    },
    {
        id: 59,
        category: "综合实战",
        level: "高级",
        title: "RFM 会员分层",
        question: "基于最近消费天数、消费频次、消费金额，生成一个简化 RFM 分层。",
        answer: `WITH customer_rfm AS (
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
ORDER BY monetary_amount DESC, recency_days;`
    },
    {
        id: 60,
        category: "综合实战",
        level: "高级",
        title: "月度留存率",
        question: "计算首单月份、活跃月份、活跃人数和相对首月的留存率。",
        answer: `WITH valid_orders AS (
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
ORDER BY ca.cohort_month, ca.active_month;`
    },
    {
        id: 61,
        category: "数据排障实战",
        level: "进阶",
        title: "支付成功但订单未流转",
        question: "排查支付流水已成功，但订单仍停留在 CREATED 或 CANCELLED 状态的异常订单。",
        answer: `SELECT
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
ORDER BY p.paid_at;`
    },
    {
        id: 62,
        category: "数据排障实战",
        level: "进阶",
        title: "取消订单存在成功支付",
        question: "找出已取消但仍有成功支付流水的订单，作为退款或状态修复的候选清单。",
        answer: `SELECT
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
ORDER BY p.paid_at;`
    },
    {
        id: 63,
        category: "数据排障实战",
        level: "进阶",
        title: "订单支付时间回填",
        question: "排查支付成功但 orders.paid_at 为空或与支付流水时间差超过 1 分钟的订单，并给出回填模板。",
        answer: `SELECT
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

COMMIT;`
    },
    {
        id: 64,
        category: "数据排障实战",
        level: "进阶",
        title: "订单金额与明细不一致",
        question: "按订单明细重新计算商品金额，找出明细合计与订单金额不一致的订单。",
        answer: `WITH item_amount AS (
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
ORDER BY ABS(o.order_amount - ia.item_total) DESC;`
    },
    {
        id: 65,
        category: "数据排障实战",
        level: "高级",
        title: "退款金额超过实付",
        question: "排查同一订单累计退款金额超过成功支付金额的高风险售后数据。",
        answer: `WITH refund_summary AS (
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
WHERE rs.total_refund_amount > ps.paid_amount;`
    },
    {
        id: 66,
        category: "数据排障实战",
        level: "高级",
        title: "已退款订单同步支付状态",
        question: "找出订单已 REFUNDED 但支付流水仍不是 REFUNDED 的记录，并给出事务内修复模板。",
        answer: `SELECT
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

COMMIT;`
    },
    {
        id: 67,
        category: "数据排障实战",
        level: "进阶",
        title: "有物流但订单未发货",
        question: "排查已经生成物流发货时间，但订单状态还停留在 PAID 的订单。",
        answer: `SELECT
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

COMMIT;`
    },
    {
        id: 68,
        category: "数据排障实战",
        level: "进阶",
        title: "已完成订单缺少签收",
        question: "找出订单已完成，但没有物流记录或缺少 delivered_at 签收时间的订单。",
        answer: `SELECT
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
ORDER BY o.completed_at;`
    },
    {
        id: 69,
        category: "数据排障实战",
        level: "进阶",
        title: "完成订单缺少评价",
        question: "找出已完成订单中，存在未评价商品明细的订单和商品。",
        answer: `SELECT
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
ORDER BY o.completed_at, o.order_no;`
    },
    {
        id: 70,
        category: "数据排障实战",
        level: "进阶",
        title: "客服工单状态时间矛盾",
        question: "排查 CLOSED 工单没有关闭时间，或非 CLOSED 工单却存在关闭时间的记录。",
        answer: `SELECT
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
   OR (ticket_status <> 'CLOSED' AND closed_at IS NOT NULL);`
    },
    {
        id: 71,
        category: "数据排障实战",
        level: "进阶",
        title: "库存状态与数量不一致",
        question: "按 available_qty 和 safety_stock 重新判断库存状态，找出 stock_status 标记错误的数据。",
        answer: `SELECT
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
  END;`
    },
    {
        id: 72,
        category: "数据排障实战",
        level: "进阶",
        title: "锁定库存异常",
        question: "排查锁定库存大于可用库存，或可售量扣除锁定后已经为负的库存记录。",
        answer: `SELECT
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
ORDER BY sellable_qty;`
    },
    {
        id: 73,
        category: "数据排障实战",
        level: "高级",
        title: "下架商品产生新订单",
        question: "排查商品已经 OFF_SALE 或 DISCONTINUED 后，仍然出现在有效订单中的明细。",
        answer: `SELECT
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
ORDER BY o.ordered_at DESC;`
    },
    {
        id: 74,
        category: "数据排障实战",
        level: "进阶",
        title: "无效优惠券被使用",
        question: "找出订单使用了草稿、过期、未到生效期或不满足门槛的优惠券记录。",
        answer: `SELECT
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
   OR o.order_amount < c.min_order_amount;`
    },
    {
        id: 75,
        category: "数据排障实战",
        level: "高级",
        title: "重复手机号会员合并候选",
        question: "排查同一手机号绑定多个会员的情况，并生成保留主账号与待合并账号候选。",
        answer: `WITH ranked_customers AS (
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
ORDER BY keep_customer.phone, merge_customer.customer_id;`
    },
    {
        id: 76,
        category: "数据排障实战",
        level: "进阶",
        title: "订单来源 JSON 缺失",
        question: "排查 ext_json 中 source 字段缺失、为空或不在约定来源集合内的订单。",
        answer: `SELECT
  order_id,
  order_no,
  ext_json,
  JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) AS source_channel
FROM orders
WHERE JSON_EXTRACT(ext_json, '$.source') IS NULL
   OR JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) NOT IN ('miniapp', 'web', 'app')
   OR JSON_UNQUOTE(JSON_EXTRACT(ext_json, '$.source')) = '';`
    },
    {
        id: 77,
        category: "数据排障实战",
        level: "进阶",
        title: "日期边界漏单排查",
        question: "对比错误的 BETWEEN 写法和半开区间写法，排查某天统计口径是否漏掉当天晚间订单。",
        answer: `SELECT
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
  AND ordered_at < '2026-02-02';`
    },
    {
        id: 78,
        category: "数据排障实战",
        level: "高级",
        title: "慢查询索引排查",
        question: "订单列表按状态和时间筛选时，使用 EXPLAIN 检查是否命中 idx_orders_status_ordered 索引。",
        answer: `EXPLAIN
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
LIMIT 20;`
    },
    {
        id: 79,
        category: "数据排障实战",
        level: "高级",
        title: "修复前备份异常订单",
        question: "演示一次状态修复脚本：先把异常订单写入临时备份表，再事务内修复 CREATED + SUCCESS 的订单状态。",
        answer: `CREATE TEMPORARY TABLE tmp_fix_paid_orders AS
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

COMMIT;`
    },
    {
        id: 80,
        category: "数据排障实战",
        level: "高级",
        title: "修复后异常总览复核",
        question: "把多个核心异常聚合成一张复核看板，确认修复后异常数量是否归零。",
        answer: `SELECT '支付成功订单状态异常' AS check_item, COUNT(*) AS issue_count
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
  END;`
    }
];

const schemaCatalog = [
    {
        name: "membership_levels",
        title: "会员等级表",
        domain: "会员域",
        purpose: "定义会员等级、积分门槛和下单折扣，是 customers.level_id 的基础字典。",
        relations: ["customers.level_id 引用本表 level_id"],
        fields: [
            { name: "level_id", type: "BIGINT", key: "PK", desc: "会员等级主键，自增。" },
            { name: "level_name", type: "VARCHAR(30)", key: "UNIQUE", desc: "等级名称，如 Bronze、Silver、Gold、Platinum。" },
            { name: "min_points", type: "INT", key: "", desc: "达到该等级需要的最低积分。" },
            { name: "discount_rate", type: "DECIMAL(5,2)", key: "", desc: "等级折扣系数，1.00 表示无折扣。" },
            { name: "created_at", type: "DATETIME", key: "", desc: "等级配置创建时间。" }
        ]
    },
    {
        name: "customers",
        title: "会员表",
        domain: "会员域",
        purpose: "保存用户的基础资料、等级、积分和注册状态，是订单、评价、售后工单的主体。",
        relations: ["level_id 关联 membership_levels", "orders、reviews、return_requests、support_tickets 都会引用 customer_id"],
        fields: [
            { name: "customer_id", type: "BIGINT", key: "PK", desc: "会员主键，自增。" },
            { name: "customer_name", type: "VARCHAR(60)", key: "", desc: "会员姓名或昵称。" },
            { name: "phone", type: "VARCHAR(20)", key: "IDX", desc: "手机号，练习数据中保留重复值用于数据质量检查。" },
            { name: "email", type: "VARCHAR(120)", key: "", desc: "邮箱，可为空，用于练习 NULL 处理。" },
            { name: "level_id", type: "BIGINT", key: "FK", desc: "会员等级 ID。" },
            { name: "city", type: "VARCHAR(40)", key: "IDX", desc: "会员常驻城市，可用于区域分析。" },
            { name: "points", type: "INT", key: "", desc: "会员当前积分。" },
            { name: "registered_at", type: "DATETIME", key: "IDX", desc: "注册时间，可用于拉新和留存分析。" },
            { name: "is_active", type: "TINYINT(1)", key: "", desc: "是否有效会员，1 有效，0 停用。" }
        ]
    },
    {
        name: "stores",
        title: "门店表",
        domain: "组织域",
        purpose: "记录线下门店与线上履约节点，订单和库存都归属到门店。",
        relations: ["employees.store_id、inventory.store_id、orders.store_id 引用本表"],
        fields: [
            { name: "store_id", type: "BIGINT", key: "PK", desc: "门店主键，自增。" },
            { name: "store_name", type: "VARCHAR(80)", key: "", desc: "门店名称。" },
            { name: "city", type: "VARCHAR(40)", key: "IDX", desc: "门店所在城市。" },
            { name: "address", type: "VARCHAR(200)", key: "", desc: "门店地址。" },
            { name: "opened_at", type: "DATE", key: "", desc: "开业日期。" },
            { name: "is_online", type: "TINYINT(1)", key: "", desc: "是否在线运营。" }
        ]
    },
    {
        name: "employees",
        title: "员工表",
        domain: "组织域",
        purpose: "保存门店员工、客服和仓储人员，客服工单会记录负责人。",
        relations: ["store_id 关联 stores", "support_tickets.owner_employee_id 引用 employee_id"],
        fields: [
            { name: "employee_id", type: "BIGINT", key: "PK", desc: "员工主键，自增。" },
            { name: "store_id", type: "BIGINT", key: "FK/IDX", desc: "员工所属门店。" },
            { name: "employee_name", type: "VARCHAR(60)", key: "", desc: "员工姓名。" },
            { name: "role_name", type: "VARCHAR(40)", key: "IDX", desc: "岗位角色，如 MANAGER、SUPPORT、WAREHOUSE。" },
            { name: "hired_at", type: "DATE", key: "", desc: "入职日期。" },
            { name: "is_active", type: "TINYINT(1)", key: "", desc: "是否在职。" }
        ]
    },
    {
        name: "suppliers",
        title: "供应商表",
        domain: "商品域",
        purpose: "记录商品供应商信息，商品通过 supplier_id 关联供应商。",
        relations: ["products.supplier_id 引用本表 supplier_id"],
        fields: [
            { name: "supplier_id", type: "BIGINT", key: "PK", desc: "供应商主键，自增。" },
            { name: "supplier_name", type: "VARCHAR(100)", key: "", desc: "供应商名称。" },
            { name: "contact_name", type: "VARCHAR(60)", key: "", desc: "联系人姓名。" },
            { name: "phone", type: "VARCHAR(20)", key: "", desc: "联系电话。" },
            { name: "city", type: "VARCHAR(40)", key: "", desc: "供应商所在城市。" },
            { name: "created_at", type: "DATETIME", key: "", desc: "供应商建档时间。" }
        ]
    },
    {
        name: "categories",
        title: "商品类目表",
        domain: "商品域",
        purpose: "维护商品分类树，支持父子级类目和递归 CTE 练习。",
        relations: ["parent_id 自关联 categories.category_id", "products.category_id 引用本表"],
        fields: [
            { name: "category_id", type: "BIGINT", key: "PK", desc: "类目主键，自增。" },
            { name: "parent_id", type: "BIGINT", key: "FK", desc: "父级类目 ID，顶级类目为空。" },
            { name: "category_name", type: "VARCHAR(80)", key: "UNIQUE", desc: "类目名称，同一父级下不可重复。" },
            { name: "sort_no", type: "INT", key: "", desc: "展示排序值。" }
        ]
    },
    {
        name: "products",
        title: "商品表",
        domain: "商品域",
        purpose: "保存 SKU、商品名、品牌、成本价、售价和上下架状态，是订单明细和库存的基础。",
        relations: ["category_id 关联 categories", "supplier_id 关联 suppliers", "inventory、order_items、reviews 引用 product_id"],
        fields: [
            { name: "product_id", type: "BIGINT", key: "PK", desc: "商品主键，自增。" },
            { name: "sku", type: "VARCHAR(40)", key: "UNIQUE", desc: "库存单位编码，业务唯一。" },
            { name: "product_name", type: "VARCHAR(120)", key: "", desc: "商品名称。" },
            { name: "category_id", type: "BIGINT", key: "FK/IDX", desc: "所属类目 ID。" },
            { name: "supplier_id", type: "BIGINT", key: "FK", desc: "供应商 ID。" },
            { name: "brand", type: "VARCHAR(60)", key: "", desc: "品牌名称。" },
            { name: "cost_price", type: "DECIMAL(10,2)", key: "", desc: "成本价，用于库存金额和毛利分析。" },
            { name: "list_price", type: "DECIMAL(10,2)", key: "IDX", desc: "标价或销售价。" },
            { name: "status", type: "VARCHAR(20)", key: "", desc: "商品状态：ON_SALE、OFF_SALE、DISCONTINUED。" },
            { name: "created_at", type: "DATETIME", key: "", desc: "商品创建时间。" }
        ]
    },
    {
        name: "inventory",
        title: "库存表",
        domain: "库存域",
        purpose: "记录每个门店每个商品的可用库存、锁定库存和安全库存。",
        relations: ["store_id 关联 stores", "product_id 关联 products", "store_id + product_id 唯一"],
        fields: [
            { name: "inventory_id", type: "BIGINT", key: "PK", desc: "库存记录主键，自增。" },
            { name: "store_id", type: "BIGINT", key: "FK/UNIQUE", desc: "门店 ID。" },
            { name: "product_id", type: "BIGINT", key: "FK/UNIQUE/IDX", desc: "商品 ID。" },
            { name: "available_qty", type: "INT", key: "", desc: "可销售库存数量。" },
            { name: "locked_qty", type: "INT", key: "", desc: "已被订单锁定但未最终扣减的数量。" },
            { name: "safety_stock", type: "INT", key: "", desc: "安全库存阈值。" },
            { name: "stock_status", type: "VARCHAR(20)", key: "", desc: "库存状态：NORMAL、LOW、OUT。" },
            { name: "updated_at", type: "DATETIME", key: "", desc: "库存最后更新时间。" }
        ]
    },
    {
        name: "orders",
        title: "订单主表",
        domain: "交易域",
        purpose: "记录订单级信息，包括会员、门店、状态、金额、支付完成时间和来源 JSON。",
        relations: ["customer_id 关联 customers", "store_id 关联 stores", "order_items、payments、shipments、returns、reviews、tickets 引用 order_id"],
        fields: [
            { name: "order_id", type: "BIGINT", key: "PK", desc: "订单主键，自增。" },
            { name: "order_no", type: "VARCHAR(40)", key: "UNIQUE", desc: "业务订单号，对外展示和排查问题常用。" },
            { name: "customer_id", type: "BIGINT", key: "FK", desc: "下单会员 ID。" },
            { name: "store_id", type: "BIGINT", key: "FK", desc: "履约门店 ID。" },
            { name: "order_status", type: "VARCHAR(20)", key: "IDX", desc: "订单状态：CREATED、PAID、SHIPPED、COMPLETED、CANCELLED、REFUNDING、REFUNDED。" },
            { name: "order_amount", type: "DECIMAL(10,2)", key: "", desc: "订单实付金额，不含复杂拆分时可直接用于 GMV 练习。" },
            { name: "freight_amount", type: "DECIMAL(10,2)", key: "", desc: "运费金额。" },
            { name: "ordered_at", type: "DATETIME", key: "IDX", desc: "下单时间。" },
            { name: "paid_at", type: "DATETIME", key: "", desc: "支付成功时间，未支付时为空。" },
            { name: "completed_at", type: "DATETIME", key: "", desc: "订单完成时间。" },
            { name: "ext_json", type: "JSON", key: "", desc: "扩展信息，如 source、campaign，用于 JSON 查询练习。" }
        ]
    },
    {
        name: "order_items",
        title: "订单明细表",
        domain: "交易域",
        purpose: "记录订单内每个商品的购买数量、成交单价和优惠金额。",
        relations: ["order_id 关联 orders", "product_id 关联 products"],
        fields: [
            { name: "order_item_id", type: "BIGINT", key: "PK", desc: "订单明细主键，自增。" },
            { name: "order_id", type: "BIGINT", key: "FK", desc: "所属订单 ID。" },
            { name: "product_id", type: "BIGINT", key: "FK/IDX", desc: "购买商品 ID。" },
            { name: "quantity", type: "INT", key: "", desc: "购买数量。" },
            { name: "unit_price", type: "DECIMAL(10,2)", key: "", desc: "成交单价。" },
            { name: "discount_amount", type: "DECIMAL(10,2)", key: "", desc: "明细级优惠金额。" }
        ]
    },
    {
        name: "coupons",
        title: "优惠券表",
        domain: "营销域",
        purpose: "保存优惠券编码、类型、门槛、有效期和状态。",
        relations: ["order_coupons.coupon_id 引用本表"],
        fields: [
            { name: "coupon_id", type: "BIGINT", key: "PK", desc: "优惠券主键，自增。" },
            { name: "coupon_code", type: "VARCHAR(40)", key: "UNIQUE", desc: "优惠券编码。" },
            { name: "coupon_name", type: "VARCHAR(100)", key: "", desc: "优惠券名称。" },
            { name: "discount_type", type: "VARCHAR(20)", key: "", desc: "优惠类型：AMOUNT 金额减免，PERCENT 折扣。" },
            { name: "discount_value", type: "DECIMAL(10,2)", key: "", desc: "优惠值，金额券为金额，折扣券为比例。" },
            { name: "min_order_amount", type: "DECIMAL(10,2)", key: "", desc: "使用门槛金额。" },
            { name: "coupon_status", type: "VARCHAR(20)", key: "", desc: "券状态：DRAFT、ACTIVE、EXPIRED。" },
            { name: "valid_from", type: "DATETIME", key: "", desc: "有效期开始时间。" },
            { name: "valid_to", type: "DATETIME", key: "", desc: "有效期结束时间。" },
            { name: "created_at", type: "DATETIME", key: "", desc: "优惠券创建时间。" }
        ]
    },
    {
        name: "order_coupons",
        title: "订单优惠券关系表",
        domain: "营销域",
        purpose: "记录订单使用了哪些优惠券，以及每张券分摊的优惠金额。",
        relations: ["order_id 关联 orders", "coupon_id 关联 coupons", "order_id + coupon_id 组成联合主键"],
        fields: [
            { name: "order_id", type: "BIGINT", key: "PK/FK", desc: "订单 ID。" },
            { name: "coupon_id", type: "BIGINT", key: "PK/FK", desc: "优惠券 ID。" },
            { name: "discount_amount", type: "DECIMAL(10,2)", key: "", desc: "该券在订单中抵扣的金额。" }
        ]
    },
    {
        name: "payments",
        title: "支付表",
        domain: "支付域",
        purpose: "记录订单支付流水，包括支付渠道、状态、金额和支付时间。",
        relations: ["order_id 关联 orders"],
        fields: [
            { name: "payment_id", type: "BIGINT", key: "PK", desc: "支付记录主键，自增。" },
            { name: "order_id", type: "BIGINT", key: "FK/IDX", desc: "对应订单 ID。" },
            { name: "payment_no", type: "VARCHAR(50)", key: "UNIQUE", desc: "支付流水号。" },
            { name: "pay_channel", type: "VARCHAR(20)", key: "", desc: "支付渠道：WECHAT、ALIPAY、CARD、BALANCE。" },
            { name: "pay_status", type: "VARCHAR(20)", key: "", desc: "支付状态：PENDING、SUCCESS、FAILED、REFUNDED。" },
            { name: "paid_amount", type: "DECIMAL(10,2)", key: "", desc: "支付金额。" },
            { name: "paid_at", type: "DATETIME", key: "", desc: "支付完成时间。" }
        ]
    },
    {
        name: "shipments",
        title: "物流表",
        domain: "履约域",
        purpose: "记录订单发货承运商、运单号、发货和签收时间。",
        relations: ["order_id 关联 orders"],
        fields: [
            { name: "shipment_id", type: "BIGINT", key: "PK", desc: "物流记录主键，自增。" },
            { name: "order_id", type: "BIGINT", key: "FK", desc: "对应订单 ID。" },
            { name: "carrier", type: "VARCHAR(40)", key: "", desc: "承运商名称。" },
            { name: "tracking_no", type: "VARCHAR(60)", key: "UNIQUE", desc: "物流运单号。" },
            { name: "shipped_at", type: "DATETIME", key: "", desc: "发货时间。" },
            { name: "delivered_at", type: "DATETIME", key: "", desc: "签收时间，未签收时为空。" }
        ]
    },
    {
        name: "return_requests",
        title: "退货退款表",
        domain: "售后域",
        purpose: "记录用户发起的退货退款申请、审核状态和退款金额。",
        relations: ["order_id 关联 orders", "customer_id 关联 customers"],
        fields: [
            { name: "return_id", type: "BIGINT", key: "PK", desc: "退货退款记录主键，自增。" },
            { name: "return_no", type: "VARCHAR(40)", key: "UNIQUE", desc: "退货退款单号。" },
            { name: "order_id", type: "BIGINT", key: "FK", desc: "关联订单 ID。" },
            { name: "customer_id", type: "BIGINT", key: "FK", desc: "申请会员 ID。" },
            { name: "return_reason", type: "VARCHAR(200)", key: "", desc: "退货或退款原因。" },
            { name: "return_status", type: "VARCHAR(20)", key: "", desc: "售后状态：REQUESTED、APPROVED、REJECTED、REFUNDED。" },
            { name: "refund_amount", type: "DECIMAL(10,2)", key: "", desc: "退款金额。" },
            { name: "requested_at", type: "DATETIME", key: "", desc: "申请时间。" },
            { name: "resolved_at", type: "DATETIME", key: "", desc: "处理完成时间。" }
        ]
    },
    {
        name: "reviews",
        title: "评价表",
        domain: "售后域",
        purpose: "记录会员对订单商品的评分和评价内容。",
        relations: ["order_id 关联 orders", "product_id 关联 products", "customer_id 关联 customers"],
        fields: [
            { name: "review_id", type: "BIGINT", key: "PK", desc: "评价主键，自增。" },
            { name: "order_id", type: "BIGINT", key: "FK", desc: "关联订单 ID。" },
            { name: "product_id", type: "BIGINT", key: "FK/IDX", desc: "被评价商品 ID。" },
            { name: "customer_id", type: "BIGINT", key: "FK", desc: "评价会员 ID。" },
            { name: "rating", type: "TINYINT", key: "IDX", desc: "评分，1 到 5。" },
            { name: "review_text", type: "VARCHAR(500)", key: "", desc: "评价正文，可为空。" },
            { name: "created_at", type: "DATETIME", key: "", desc: "评价创建时间。" }
        ]
    },
    {
        name: "support_tickets",
        title: "客服工单表",
        domain: "客服域",
        purpose: "记录会员咨询或售后问题，包含关联订单、负责人、问题类型、状态和优先级。",
        relations: ["customer_id 关联 customers", "order_id 可关联 orders", "owner_employee_id 关联 employees", "ticket_messages.ticket_id 引用本表"],
        fields: [
            { name: "ticket_id", type: "BIGINT", key: "PK", desc: "工单主键，自增。" },
            { name: "ticket_no", type: "VARCHAR(40)", key: "UNIQUE", desc: "业务工单号。" },
            { name: "customer_id", type: "BIGINT", key: "FK", desc: "提交工单的会员 ID。" },
            { name: "order_id", type: "BIGINT", key: "FK", desc: "关联订单 ID，可为空。" },
            { name: "owner_employee_id", type: "BIGINT", key: "FK", desc: "当前处理员工 ID，可为空。" },
            { name: "issue_type", type: "VARCHAR(40)", key: "", desc: "问题类型，如物流咨询、售后退款、发票申请。" },
            { name: "ticket_status", type: "VARCHAR(20)", key: "IDX", desc: "工单状态：OPEN、PROCESSING、CLOSED。" },
            { name: "priority", type: "VARCHAR(20)", key: "", desc: "优先级：LOW、MEDIUM、HIGH。" },
            { name: "created_at", type: "DATETIME", key: "IDX", desc: "工单创建时间。" },
            { name: "closed_at", type: "DATETIME", key: "", desc: "工单关闭时间。" }
        ]
    },
    {
        name: "ticket_messages",
        title: "工单消息表",
        domain: "客服域",
        purpose: "记录工单中的用户、客服和系统消息，适合练习一对多明细查询。",
        relations: ["ticket_id 关联 support_tickets"],
        fields: [
            { name: "message_id", type: "BIGINT", key: "PK", desc: "消息主键，自增。" },
            { name: "ticket_id", type: "BIGINT", key: "FK/IDX", desc: "所属工单 ID。" },
            { name: "sender_type", type: "VARCHAR(20)", key: "", desc: "发送方类型：CUSTOMER、EMPLOYEE、SYSTEM。" },
            { name: "message_body", type: "VARCHAR(1000)", key: "", desc: "消息内容。" },
            { name: "created_at", type: "DATETIME", key: "IDX", desc: "消息发送时间。" }
        ]
    }
];

const categoryList = document.querySelector("#categoryList");
const exerciseList = document.querySelector("#exerciseList");
const template = document.querySelector("#exerciseTemplate");
const count = document.querySelector("#exerciseCount");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const tableList = document.querySelector("#tableList");
const tableDetail = document.querySelector("#tableDetail");
const schemaTableCount = document.querySelector("#schemaTableCount");

const ALL_CATEGORIES = "__all";
const LEVEL_FILTERS = {
    basic: "基础",
    intermediate: "进阶",
    advanced: "高级"
};

let activeLevel = "all";
let activeCategory = ALL_CATEGORIES;
let activeTable = schemaCatalog[0].name;

const categories = [
    { label: "全部", value: ALL_CATEGORIES },
    ...[...new Set(exercises.map((item) => item.category))].map((category) => ({
        label: category,
        value: category
    }))
];

count.textContent = String(exercises.length);
schemaTableCount.textContent = String(schemaCatalog.length);

function levelClass(level) {
    if (level === "高级") return "expert";
    if (level === "进阶") return "advanced";
    return "";
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
        throw new Error("copy failed");
    }
}

function renderCategories() {
    categoryList.innerHTML = "";
    categories.forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `category-button${category.value === activeCategory ? " active" : ""}`;
        button.textContent = category.label;
        button.addEventListener("click", () => {
            activeCategory = category.value;
            renderCategories();
            renderExercises();
        });
        categoryList.appendChild(button);
    });
}

function renderTableList() {
    tableList.innerHTML = "";
    schemaCatalog.forEach((table) => {
        const button = document.createElement("button");
        const name = document.createElement("span");
        const meta = document.createElement("small");

        button.type = "button";
        button.className = `table-button${table.name === activeTable ? " active" : ""}`;
        name.textContent = table.name;
        meta.textContent = `${table.domain} · ${table.fields.length} 字段`;
        button.append(name, meta);
        button.addEventListener("click", () => {
            activeTable = table.name;
            renderTableList();
            renderTableDetail();
        });
        tableList.appendChild(button);
    });
}

function renderTableDetail() {
    const table = schemaCatalog.find((item) => item.name === activeTable) || schemaCatalog[0];
    tableDetail.innerHTML = "";

    const panel = document.createElement("article");
    panel.className = "table-detail-panel";

    const header = document.createElement("div");
    header.className = "table-detail-head";

    const titleWrap = document.createElement("div");
    const domain = document.createElement("span");
    const title = document.createElement("h3");
    const purpose = document.createElement("p");
    domain.className = "table-domain";
    domain.textContent = table.domain;
    title.textContent = `${table.name} · ${table.title}`;
    purpose.textContent = table.purpose;
    titleWrap.append(domain, title, purpose);

    const fieldCount = document.createElement("strong");
    fieldCount.className = "field-count";
    fieldCount.textContent = `${table.fields.length} 字段`;
    header.append(titleWrap, fieldCount);

    const relationTitle = document.createElement("h4");
    relationTitle.textContent = "关键关系";
    const relationList = document.createElement("ul");
    relationList.className = "relation-list";
    table.relations.forEach((relation) => {
        const item = document.createElement("li");
        item.textContent = relation;
        relationList.appendChild(item);
    });

    const tableWrap = document.createElement("div");
    tableWrap.className = "field-table-wrap";
    const fieldTable = document.createElement("table");
    fieldTable.className = "field-table";
    fieldTable.innerHTML = `
        <thead>
            <tr>
                <th scope="col">字段</th>
                <th scope="col">类型</th>
                <th scope="col">键</th>
                <th scope="col">说明</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const body = fieldTable.querySelector("tbody");
    table.fields.forEach((field) => {
        const row = document.createElement("tr");
        [field.name, field.type, field.key || "-", field.desc].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        body.appendChild(row);
    });
    tableWrap.appendChild(fieldTable);

    panel.append(header, relationTitle, relationList, tableWrap);
    tableDetail.appendChild(panel);
}

function renderExercises() {
    exerciseList.innerHTML = "";
    const selectedLevel = LEVEL_FILTERS[activeLevel];
    const filtered = exercises.filter((item) => {
        const matchLevel = activeLevel === "all" || item.level === selectedLevel;
        const matchCategory = activeCategory === ALL_CATEGORIES || item.category === activeCategory;
        return matchLevel && matchCategory;
    });

    filtered.forEach((item) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector(".badge").textContent = `${String(item.id).padStart(2, "0")} · ${item.category}`;
        const level = node.querySelector(".level");
        level.textContent = item.level;
        const levelStyle = levelClass(item.level);
        if (levelStyle) {
            level.classList.add(levelStyle);
        }
        node.querySelector("h3").textContent = item.title;
        node.querySelector(".question").textContent = item.question;
        node.querySelector("code").textContent = item.answer;
        const copyButton = node.querySelector(".copy-button");
        copyButton.addEventListener("click", async () => {
            try {
                await copyText(item.answer);
                copyButton.textContent = "已复制";
                window.setTimeout(() => {
                    copyButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v12H8z"></path><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>复制`;
                }, 1200);
            } catch (error) {
                copyButton.textContent = "复制失败";
            }
        });
        exerciseList.appendChild(node);
    });

    if (!filtered.length) {
        const empty = document.createElement("p");
        empty.className = "section-text";
        empty.textContent = "当前筛选条件下没有题目。";
        exerciseList.appendChild(empty);
    }
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeLevel = button.dataset.filter;
        filterButtons.forEach((item) => item.classList.toggle("active", item === button));
        renderExercises();
    });
});

document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
    });
});

renderCategories();
renderTableList();
renderTableDetail();
renderExercises();
