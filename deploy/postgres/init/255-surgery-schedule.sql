-- ============================================================================
-- 健澜科技 jlmedaios · M130-D 手术排班优化表（运营调度核心业务深化）
-- 255-surgery-schedule.sql
--
-- 业务定位：
--   clinical.surgery_requests 仅记录「申请 + 计划日期」，不含手术间与起止分钟。
--   本表落地优化引擎（optimizeSurgerySchedule）的排程结果：
--     手术间 × 日期 × 起止分钟 的确定性排程，支撑甘特图日历与术中协调。
--
-- 优化目标（与 BFF 聚合器一致）：
--   1) 手术室利用率最大化 —— 贪心最早可行槽 + 同类手术集中；
--   2) 医生时间不冲突     —— 同 surgeon 同日期窗口互不重叠；
--   3) 同类手术集中       —— 同科室术式尽量落同一手术间同日相邻块；
--   4) 急诊优先插入       —— emergency 优先占用急诊手术间，可插入择期空档。
--
-- 表结构：
--   clinical.surgery_schedule
--     id              bigserial    主键
--     schedule_no     text         排班单号（唯一，SCH-YYYYMMDD-XXXX）
--     request_id      uuid         关联 clinical.surgery_requests(id)
--     room_name       text         手术间名（一号手术间 / 急诊手术间 …）
--     schedule_date   date         排班日期
--     start_minute    int          当日起算分钟（08:00=480）
--     end_minute      int          当日结束分钟
--     duration_min    int          手术时长（分钟）
--     surgeon_id      uuid         主刀医生（iam.users.id）
--     surgery_type    text         elective / emergency
--     department      text         申请科室（用于同类集中）
--     status          text         planned / confirmed / cancelled / done
--     optimize_batch  text         优化批次号（一次优化跑一个 batch）
--     created_by      text         优化触发人工号
--     created_at      timestamptz
--     updated_at      timestamptz
--
-- 安全红线：
--   - 同一手术间同一日期禁止时间重叠（排他区间由 BFF 纯函数 + 应用层校验，
--     本表用 (room_name, schedule_date) GIN 类索引加速冲突查询）；
--   - 同一 surgeon 同一日期禁止时间重叠（索引加速术中协调查询）；
--   - 急诊行不允许被择期行覆盖：status='cancelled' 仅作标记，不物理删除。
--
-- 兼容：CREATE TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.surgery_schedule (
  id              bigserial PRIMARY KEY,
  schedule_no     text        NOT NULL UNIQUE,
  request_id      uuid        NOT NULL REFERENCES clinical.surgery_requests(id) ON DELETE CASCADE,
  room_name       text        NOT NULL,
  schedule_date   date        NOT NULL,
  start_minute    int         NOT NULL CHECK (start_minute BETWEEN 0 AND 24 * 60 - 1),
  end_minute      int         NOT NULL CHECK (end_minute BETWEEN 1 AND 24 * 60),
  duration_min    int         NOT NULL CHECK (duration_min > 0),
  surgeon_id      uuid        REFERENCES iam.users(id),
  surgery_type    text        NOT NULL DEFAULT 'elective'
                    CHECK (surgery_type IN ('elective', 'emergency')),
  department      text        NOT NULL DEFAULT '外科',
  status          text        NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned', 'confirmed', 'cancelled', 'done')),
  optimize_batch  text        NOT NULL DEFAULT '',
  created_by      text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 手术间 × 日期 冲突检测主索引（甘特图按日按间拉取）
CREATE INDEX IF NOT EXISTS idx_surgery_schedule_room_date
  ON clinical.surgery_schedule (room_name, schedule_date, start_minute);

-- 医生 × 日期 冲突检测索引（术者多台连查）
CREATE INDEX IF NOT EXISTS idx_surgery_schedule_surgeon_date
  ON clinical.surgery_schedule (surgeon_id, schedule_date);

-- 优化批次追溯：一次优化跑一个 batch，便于回滚整批
CREATE INDEX IF NOT EXISTS idx_surgery_schedule_batch
  ON clinical.surgery_schedule (optimize_batch)
  WHERE optimize_batch <> '';

-- 急诊排班专项查询（急诊间实时看板）
CREATE INDEX IF NOT EXISTS idx_surgery_schedule_emergency
  ON clinical.surgery_schedule (schedule_date)
  WHERE surgery_type = 'emergency';
