-- ============================================================================
-- 健澜科技 jlmedaios - M123-A 数据访问审计日志
--
-- 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）与国家信息化
-- 数据安全要求：医务人员每一次对患者敏感数据的访问都必须留痕，
-- 形成「谁、在什么时间、从哪台终端、看了谁的什么资源」的完整审计链，
-- 供医院管理员事后追溯与合规检查。
--
-- 表结构：
--   medmuse.data_access_log
--     id            bigserial   主键（日志流水号，自增）
--     staff_id      text        操作人工号
--     staff_role    text        操作人角色（doctor / nurse / admin / pharmacist...）
--     action        text        访问动作（view / export / download / print / edit...）
--     resource_type text        资源类型（patient / emr / prescription / order...）
--     resource_id   text        资源标识（可空，列表页等聚合访问无具体资源）
--     patient_id    text        脱敏患者号（不存姓名 / 身份证号 / 病案号明文）
--     accessed_at   timestamptz 访问时间（默认 now()）
--     ip_address    text        访问终端 IP（出参再脱敏，末段打码）
--
-- 医疗安全红线 / 生产安全加固：
--   - 本表只存脱敏业务标识，严禁落患者姓名、身份证号、联系方式明文；
--   - 只增不改不删：应用角色仅授予 INSERT / SELECT，防篡改、防销毁；
--   - 审计查询仅 admin 角色开放（由 BFF requireRole 强制）。
--
-- 兼容：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 数据访问审计日志（一次敏感数据访问一条记录）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.data_access_log (
  id            bigserial PRIMARY KEY,
  staff_id      text        NOT NULL,
  staff_role    text        NOT NULL DEFAULT '',
  action        text        NOT NULL,
  resource_type text        NOT NULL,
  resource_id   text        NOT NULL DEFAULT '',
  patient_id    text        NOT NULL DEFAULT '',
  accessed_at   timestamptz NOT NULL DEFAULT now(),
  ip_address    text        NOT NULL DEFAULT ''
);

-- 按人追溯：某员工近期访问了哪些患者
CREATE INDEX IF NOT EXISTS idx_data_access_log_staff_time
  ON medmuse.data_access_log (staff_id, accessed_at DESC);

-- 按动作排查：批量导出 / 打印等高风险动作集中筛查
CREATE INDEX IF NOT EXISTS idx_data_access_log_action_time
  ON medmuse.data_access_log (action, accessed_at DESC);

-- 按患者追溯：某患者的病历被谁看过
CREATE INDEX IF NOT EXISTS idx_data_access_log_patient_time
  ON medmuse.data_access_log (patient_id, accessed_at DESC);

-- 管理员看板默认倒序拉取近期窗口
CREATE INDEX IF NOT EXISTS idx_data_access_log_accessed
  ON medmuse.data_access_log (accessed_at DESC);
