-- ============================================================================
-- 健澜科技 jlmedaios - M184-A 智能排班 V2
-- 230-smart-schedule-v2.sql
--
-- 幂等 IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
-- ============================================================================

CREATE TABLE IF NOT EXISTS medmuse.smart_schedule_v2 (
  id          bigserial PRIMARY KEY,
  dept        text NOT NULL,
  schedule_date date NOT NULL,
  shift_type  text NOT NULL CHECK (shift_type IN ('day','evening','night')),
  staff_id    uuid NOT NULL,
  staff_name  text,
  status      text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','off','swap','pending')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dept, schedule_date, shift_type, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_v2_dept_date
  ON medmuse.smart_schedule_v2(dept, schedule_date);
