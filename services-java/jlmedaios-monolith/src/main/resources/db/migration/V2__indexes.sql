-- ============================================================
-- 健澜科技 jlmedaios - Flyway 索引 V2
-- 核心业务表高频查询字段索引（PostgreSQL 语法，IF NOT EXISTS）
-- ============================================================

-- 患者主索引：姓名 / 身份证 / 手机号
CREATE INDEX IF NOT EXISTS idx_patient_name ON empi_patient(name);
CREATE INDEX IF NOT EXISTS idx_patient_id_card ON empi_patient(id_card);
CREATE INDEX IF NOT EXISTS idx_patient_phone ON empi_patient(phone);

-- 医嘱：编号 / 患者 / 状态 / 医生
CREATE INDEX IF NOT EXISTS idx_order_no ON orders_management_order(order_no);
CREATE INDEX IF NOT EXISTS idx_order_patient ON orders_management_order(patient_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON orders_management_order(status);
CREATE INDEX IF NOT EXISTS idx_order_doctor ON orders_management_order(doctor_id);

-- 诊疗记录：患者 / 就诊 / 科室
CREATE INDEX IF NOT EXISTS idx_encounter_patient ON encounter_record(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounter_visit ON encounter_record(visit_id);
CREATE INDEX IF NOT EXISTS idx_encounter_dept ON encounter_record(dept_code);

-- 检验申请：患者 / 项目编码 / 状态
CREATE INDEX IF NOT EXISTS idx_lis_patient ON lis_request(patient_id);
CREATE INDEX IF NOT EXISTS idx_lis_test_code ON lis_request(test_code);
CREATE INDEX IF NOT EXISTS idx_lis_status ON lis_request(status);

-- 多租户字段索引（P5）
CREATE INDEX IF NOT EXISTS idx_patient_tenant ON empi_patient(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_tenant ON orders_management_order(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encounter_tenant ON encounter_record(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lis_tenant ON lis_request(tenant_id);
