-- ============================================================
-- Flyway 迁移脚本 V1__init.sql
-- 生产环境 PostgreSQL 16 专用，H2 开发阶段用 schema.sql
-- H2 阶段 spring.flyway.enabled=false，生产 PostgreSQL 切换后开启
-- ============================================================

-- 1. 挂号表 (reg_register)
CREATE TABLE IF NOT EXISTS reg_register (
    id BIGSERIAL PRIMARY KEY,
    patient_name VARCHAR(100),
    dept_code VARCHAR(50),
    doctor_name VARCHAR(100),
    appointment_date DATE,
    status VARCHAR(20) DEFAULT 'BOOKED',
    updated_at TIMESTAMP
);

-- 2. 收费表 (charge)
CREATE TABLE IF NOT EXISTS charge (
    id BIGSERIAL PRIMARY KEY,
    register_id BIGINT,
    item_name VARCHAR(200),
    amount DECIMAL(10,2),
    pay_status VARCHAR(20) DEFAULT 'UNPAID',
    updated_at TIMESTAMP
);

-- 3. 医嘱表 (orders)
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT,
    order_type VARCHAR(50),
    content VARCHAR(500),
    doctor_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING',
    updated_at TIMESTAMP
);

-- 4. 药品库存表 (drug_stock)
CREATE TABLE IF NOT EXISTS drug_stock (
    id BIGSERIAL PRIMARY KEY,
    drug_code VARCHAR(50),
    drug_name VARCHAR(200),
    stock_qty INT,
    unit_price DECIMAL(10,2)
);

-- 5. 患者主索引表 (empi_patient)
-- @Sensitive 字段：id_card / phone（序列化时需脱敏）
CREATE TABLE IF NOT EXISTS empi_patient (
    empi_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    gender VARCHAR(10),
    id_card VARCHAR(50),
    phone VARCHAR(20),
    create_time TIMESTAMP
);

-- 6. 床位表 (bed)
CREATE TABLE IF NOT EXISTS bed (
    id BIGSERIAL PRIMARY KEY,
    bed_code VARCHAR(50),
    ward_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    patient_id BIGINT
);

-- 7. 检验申请表 (lis_request)
-- TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口
CREATE TABLE IF NOT EXISTS lis_request (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT,
    test_code VARCHAR(50),
    test_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'REQUESTED',
    result_value VARCHAR(500)
);

-- 8. 护理医嘱表 (nursing_order)
-- append-only: 本记录创建后不可修改，只能新增修订记录
CREATE TABLE IF NOT EXISTS nursing_order (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT,
    nursing_type VARCHAR(50),
    content VARCHAR(500),
    status VARCHAR(20) DEFAULT 'PENDING',
    nurse_name VARCHAR(100),
    updated_at TIMESTAMP
);

-- 9. 出院医嘱表 (discharge_order)
-- append-only: 本记录创建后不可修改，只能新增修订记录
CREATE TABLE IF NOT EXISTS discharge_order (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT,
    status VARCHAR(20) DEFAULT 'APPLIED',
    total_amount DECIMAL(10,2) DEFAULT 0,
    summary VARCHAR(1000),
    updated_at TIMESTAMP
);
