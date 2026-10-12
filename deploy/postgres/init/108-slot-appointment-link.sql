-- ============================================================================
-- 健澜科技 jlmedaios · M19-C 号源约号与 clinical.appointments 打通
--
-- 给 appointments 加 slot_id 外键；约号事务内既占号又写 appointment，退号销号。
-- 复用 M19-A 权限码（schedule:book/schedule:manage），不新增权限。
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

ALTER TABLE clinical.appointments ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES clinical.appointment_slots(id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON clinical.appointments(slot_id);
