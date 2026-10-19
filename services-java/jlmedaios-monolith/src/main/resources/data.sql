-- ============================================================
-- 健澜科技 jlmedaios 模块化单体 - 测试数据初始化
-- 与 schema.sql 配套，H2 启动自动执行
-- ============================================================

-- 1. 患者主索引（3 个患者，含 @Sensitive 字段）
INSERT INTO empi_patient (name, gender, id_card, phone, create_time) VALUES
('张三', '男', '330106199001011234', '13800138001', CURRENT_TIMESTAMP),
('李四', '女', '330106199203055678', '13800138002', CURRENT_TIMESTAMP),
('王五', '男', '330106198512209012', '13800138003', CURRENT_TIMESTAMP);

-- 2. 挂号（2 条，关联前 2 个患者）
INSERT INTO reg_register (patient_name, dept_code, doctor_name, appointment_date, status, updated_at) VALUES
('张三', 'INTERNAL', '王医生', '2026-10-20', 'BOOKED', CURRENT_TIMESTAMP),
('李四', 'SURGERY', '陈医生', '2026-10-20', 'BOOKED', CURRENT_TIMESTAMP);

-- 3. 收费（1 笔，关联第 1 条挂号）
INSERT INTO charge (register_id, item_name, amount, pay_status, updated_at) VALUES
(1, '普通门诊挂号费', 25.00, 'UNPAID', CURRENT_TIMESTAMP);

-- 4. 药品库存（3 条）
INSERT INTO drug_stock (drug_code, drug_name, stock_qty, unit_price) VALUES
('D001', '阿莫西林胶囊', 1000, 12.50),
('D002', '布洛芬缓释胶囊', 500, 18.00),
('D003', '奥美拉唑肠溶胶囊', 800, 22.00);

-- 5. 床位（5 张）
INSERT INTO bed (bed_code, ward_name, status, patient_id) VALUES
('W01-01', '内科一病区', 'AVAILABLE', NULL),
('W01-02', '内科一病区', 'AVAILABLE', NULL),
('W02-01', '外科一病区', 'OCCUPIED', 1),
('W02-02', '外科一病区', 'AVAILABLE', NULL),
('W03-01', 'ICU', 'OCCUPIED', 2);
