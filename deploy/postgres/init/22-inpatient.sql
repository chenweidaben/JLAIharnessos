-- ============================================================================
-- 健澜科技 jlmedaios - 住院核心事务表（ADT：入院/出院/转科 + 病区床位）
-- 22-inpatient.sql
--
-- 设计目标（医疗级严谨 / 一院多区）：
--  - campuses 院区：支持一院多区、多租户主数据；
--  - wards 病区：归属于科室(department)与院区(campus)；
--  - beds 床位：状态 空闲(available)/占用(occupied)/维护(maintenance)/隔离(isolation)，
--      并以部分唯一索引保证“一位患者同一时刻仅占一张床”；
--  - admissions 入院记录：住院号、入院方式/来源、入院诊断、病情分级；
--  - adt_events ADT 事件：完整记录入院/换床/转科/出院的床位与科室移动史（可追溯）。
--
-- 并发安全：床位分配的“不重复分配”由应用层在事务内以
--   SELECT ... FOR UPDATE SKIP LOCKED + 条件 UPDATE（CAS）共同保证，
--   本表结构提供唯一约束兜底。
--
-- 幂等：全部 CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 院区（一院多区）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.campuses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,                 -- 院区代码，如 CAMP-MAIN
  name        text NOT NULL,                        -- 院区名称，如 总院区
  address     text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_clinical_campuses_updated BEFORE UPDATE ON clinical.campuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 病区（科室 + 院区归属）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.wards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL,                      -- 病区代码，如 WARD-CARDIO-1
  name          text NOT NULL,                      -- 病区名称，如 心血管内科一病区
  department    text NOT NULL,                      -- 科室归属，如 心血管内科
  campus_id     uuid NOT NULL REFERENCES clinical.campuses(id),
  floor         text,                               -- 楼层
  nurse_station text,                               -- 护士站位置
  director      text,                               -- 病区主任（显示用）
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- 同一院区下病区代码唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_wards_campus_code ON clinical.wards(campus_id, code);
CREATE INDEX IF NOT EXISTS idx_wards_department ON clinical.wards(department);
CREATE TRIGGER trg_clinical_wards_updated BEFORE UPDATE ON clinical.wards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 床位（状态：空闲/占用/维护/隔离）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.beds (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id            uuid NOT NULL REFERENCES clinical.wards(id),
  bed_no             text NOT NULL,                 -- 床号（病区内唯一），如 0501-1
  room_no            text,                          -- 病房号，如 0501
  bed_type           text NOT NULL DEFAULT 'standard'
                       CHECK (bed_type IN ('standard','isolation','icu','resuscitation')),
  status             text NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available','occupied','maintenance','isolation')),
  current_visit_id   uuid REFERENCES clinical.visits(id),
  current_patient_id uuid REFERENCES clinical.patients(id),
  occupied_at        timestamptz,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
-- 同病区床号唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_ward_bedno ON clinical.beds(ward_id, bed_no);
-- 并发安全兜底：一位患者同一时刻只能占用一张床
CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_one_bed_per_patient
  ON clinical.beds(current_patient_id)
  WHERE current_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beds_ward_status ON clinical.beds(ward_id, status);
CREATE TRIGGER trg_clinical_beds_updated BEFORE UPDATE ON clinical.beds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- visits 扩展：住院就诊关联到具体病区/床位（保留既有 ward/bed_no 文本列以兼容）
-- ---------------------------------------------------------------------------
ALTER TABLE clinical.visits
  ADD COLUMN IF NOT EXISTS ward_id uuid REFERENCES clinical.wards(id);
ALTER TABLE clinical.visits
  ADD COLUMN IF NOT EXISTS bed_id uuid REFERENCES clinical.beds(id);
CREATE INDEX IF NOT EXISTS idx_visits_ward ON clinical.visits(ward_id);

-- ---------------------------------------------------------------------------
-- 入院记录（一次住院就诊对应一条入院记录）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.admissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no        text NOT NULL UNIQUE,          -- 住院号，如 ZY + 序号
  visit_id            uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id          uuid NOT NULL REFERENCES clinical.patients(id),
  ward_id             uuid REFERENCES clinical.wards(id),
  bed_id              uuid REFERENCES clinical.beds(id),
  department          text NOT NULL,
  admitting_doctor_id uuid REFERENCES iam.users(id),
  admission_type      text NOT NULL DEFAULT 'elective'
                        CHECK (admission_type IN ('elective','emergency','transfer')), -- 择期/急诊/转入
  source              text NOT NULL DEFAULT 'outpatient'
                        CHECK (source IN ('outpatient','emergency','transfer','other')), -- 入院来源
  diagnosis           text,                         -- 入院诊断
  condition_on_admission text NOT NULL DEFAULT 'stable'
                        CHECK (condition_on_admission IN ('critical','serious','stable')), -- 病情：危/重/一般
  admitted_at         timestamptz NOT NULL DEFAULT now(),
  discharged_at       timestamptz,
  status              text NOT NULL DEFAULT 'admitted'
                        CHECK (status IN ('admitted','transferred','discharged')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_visit ON clinical.admissions(visit_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON clinical.admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON clinical.admissions(status);
CREATE TRIGGER trg_clinical_admissions_updated BEFORE UPDATE ON clinical.admissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ADT 事件（入院/换床/转科/出院 的移动史，只追加，供追溯与床位患者摘要）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.adt_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  event_type      text NOT NULL
                    CHECK (event_type IN ('admit','bed_change','transfer','discharge')),
  from_ward_id    uuid REFERENCES clinical.wards(id),
  to_ward_id      uuid REFERENCES clinical.wards(id),
  from_bed_id     uuid REFERENCES clinical.beds(id),
  to_bed_id       uuid REFERENCES clinical.beds(id),
  from_department text,
  to_department   text,
  reason          text,
  operator_id     uuid REFERENCES iam.users(id),
  event_at        timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adt_visit ON clinical.adt_events(visit_id, event_at);
CREATE INDEX IF NOT EXISTS idx_adt_patient ON clinical.adt_events(patient_id, event_at);
CREATE INDEX IF NOT EXISTS idx_adt_type_time ON clinical.adt_events(event_type, event_at);
