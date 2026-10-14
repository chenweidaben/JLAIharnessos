-- ============================================================================
-- 健澜科技 jlmedaios · 危急值闭环升级（报告→通知医生→接收→记录处理时间→闭环）
-- 216-critical-value-closure.sql
--
-- 在既有 clinical.critical_value_alerts（M3-F：raised/acked/resolved）之上，
-- 增加「医师接收 / 记录处理时间 / 闭环」三段留痕列，形成五段状态机：
--   pending（报告已生成，待通知）
--     -> notified（已通知医生，同事务经 outbox 推送）
--     -> accepted（医生接收，写 doctor_accepted_at）
--     -> processed（记录处理时间，写 processed_at + 处置备注）
--     -> closed（闭环，写 closed_at）
--
-- 状态机由纯函数 closureState(record) 依据各时间戳推导（时间戳即状态，避免
-- 冗余 status 列与时间戳漂移）：closed_at>processed_at>doctor_accepted_at>
-- notified_at 依次短路。
--
-- 幂等：ADD COLUMN IF NOT EXISTS / 可重入；不改动既有 status 列与权限点。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 闭环升级列（若不存在）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.critical_value_alerts
  ADD COLUMN IF NOT EXISTS notified_at         timestamptz,           -- 已通知医生（outbox 推送同时刻）
  ADD COLUMN IF NOT EXISTS doctor_accepted_at   timestamptz,           -- 医生接收时间
  ADD COLUMN IF NOT EXISTS doctor_accepted_by   uuid REFERENCES iam.users(id),
  ADD COLUMN IF NOT EXISTS processed_at        timestamptz,           -- 记录处理时间
  ADD COLUMN IF NOT EXISTS processed_by        uuid REFERENCES iam.users(id),
  ADD COLUMN IF NOT EXISTS processed_note       text,                   -- 处置记录
  ADD COLUMN IF NOT EXISTS closed_at           timestamptz,           -- 闭环时间
  ADD COLUMN IF NOT EXISTS closed_by           uuid REFERENCES iam.users(id);

-- ----------------------------------------------------------------------------
-- 历史数据回填：M3-F 时代产生的告警在 raised_at 即已完成报告与通知，
-- 幂等地把 notified_at 补为 raised_at，使其可直接走 accepted→processed→closed。
-- ----------------------------------------------------------------------------
UPDATE clinical.critical_value_alerts
   SET notified_at = raised_at
 WHERE notified_at IS NULL;

-- ----------------------------------------------------------------------------
-- 闭环时效查询索引（科室/待接收监控）
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_critical_closure_notified
  ON clinical.critical_value_alerts(notified_at)
  WHERE doctor_accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_critical_closure_open
  ON clinical.critical_value_alerts(processed_at)
  WHERE closed_at IS NULL;
