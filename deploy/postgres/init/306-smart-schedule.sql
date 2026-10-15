-- ============================================================================
-- 健澜科技 jlmedaios · M152-C 医院智能排班（AI 能力深化）
--
-- 目标：在「护理排班 / 门诊排班」底座之上，提供一张科室级智能排班结果表，
--       承载 BFF 纯函数 optimizeSchedule(dept, startDate, endDate, constraints)
--       的输出，供管理端排班日历与护士长确认。
--
-- 公平性硬约束（应用层纯函数保证，库内仅落库）：
--   1) 每人每周（ISO week）≤ 5 个工作日；
--   2) 夜班后必休 1 天（次日不排任何班次）；
--   3) 主任医师（attending）每周至少覆盖 1 个白班；
--   4) 科室不缺岗：每日白班 / 夜班最少在岗人数由 constraints 指定；
--   5) 夜班分配均衡：同一周内任意两人夜班数 max - min ≤ 1。
--
-- 权限码：admin:schedule:optimize 运行优化；admin:schedule:view 查看排班。
--
-- 医疗安全：优化结果为「建议草稿」，最终由护士长 / 科室主任确认发布；
--   未发布行 status='draft'，不参与临床交接班视图。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.smart_schedule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code     text        NOT NULL,
  staff_id      text        NOT NULL,
  staff_name    text        NOT NULL DEFAULT '',
  role          text        NOT NULL DEFAULT 'resident',   -- attending / resident / intern
  shift_date    date        NOT NULL,
  shift_type    text        NOT NULL DEFAULT 'day',         -- day / night
  iso_year      int         NOT NULL,
  iso_week      int         NOT NULL,
  status        text        NOT NULL DEFAULT 'draft',      -- draft / published
  note          text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT smart_schedule_shift_type_chk CHECK (shift_type IN ('day', 'night')),
  CONSTRAINT smart_schedule_status_chk     CHECK (status IN ('draft', 'published')),
  CONSTRAINT smart_schedule_role_chk       CHECK (role IN ('attending', 'resident', 'intern')),
  CONSTRAINT smart_schedule_one_shift_per_day UNIQUE (dept_code, staff_id, shift_date)
);

-- 反向索引：科室 × 日期范围拉取日历
CREATE INDEX IF NOT EXISTS idx_smart_schedule_dept_date
  ON clinical.smart_schedule (dept_code, shift_date);

-- 反向索引：按周做夜班均衡审计
CREATE INDEX IF NOT EXISTS idx_smart_schedule_week
  ON clinical.smart_schedule (dept_code, iso_year, iso_week, shift_type);

COMMENT ON TABLE  clinical.smart_schedule                IS 'M152-C 智能排班结果（optimizeSchedule 输出，draft 待护士长确认）';
COMMENT ON COLUMN clinical.smart_schedule.shift_type     IS 'day=白班 night=夜班；夜班后次日必休由应用层保证';
COMMENT ON COLUMN clinical.smart_schedule.status         IS 'draft=优化建议草稿；published=护士长已确认发布';
