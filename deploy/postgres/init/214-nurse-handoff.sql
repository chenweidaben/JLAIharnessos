-- ============================================================================
-- 健澜科技 jlmedaios - 护士交接班记录（交班本/接班本模板化）（214）
-- 214-nurse-handoff.sql
--
-- nursing.nurse_handoff：按病区/班次/患者登记交班摘要。
-- 摘要文本由护理计划 + 生命体征自动生成（buildHandoffSummary），护士在交班本
-- 中预览后确认登记，亦可人工补录修订。
-- 权限复用既有 nursing:record（查看/登记），不新增权限码。
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS nursing;

CREATE TABLE IF NOT EXISTS nursing.nurse_handoff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id     uuid,                             -- 病区 id
  shift       text,                             -- 班次：day / evening / night
  patient_id  uuid,                             -- 患者 id
  summary     text,                             -- 交班摘要文本（自动生成 + 人工补录）
  created_by  uuid,                             -- 登记护士
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurse_handoff_ward ON nursing.nurse_handoff (ward_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nurse_handoff_patient ON nursing.nurse_handoff (patient_id);
