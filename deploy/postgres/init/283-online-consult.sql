-- ============================================================================
-- 健澜科技 jlmedaios · M143-A 互联网医院在线问诊（online_consultation）
--
-- 【互联网医院与远程医疗】在线问诊全生命周期持久化：
--   状态机：pending 待接单 → ongoing 咨询中 → ended 已结束（completed/timeout）
--                                      ↘ cancelled 已取消
--   问诊模式：text 文字咨询 / image 图文咨询 / video 视频咨询。
--
-- 医疗安全红线：
--  - 接单即起算 30 分钟时长窗口（deadline_at = accepted_at + interval '30 minutes'），
--    超时未结束由 BFF sweepTimeouts 自动标记 end_reason='timeout' 关单；
--  - 手动结束必须回写诊疗小结 summary（医师手写处置建议，不可空单结束）；
--  - doctor_id 在 pending 阶段可为空（公共候诊池抢单），接单后写本人工号留痕。
--
-- 权限码：consult:create  患者发起问诊；
--         consult:accept  医师接单；
--         consult:end     医师结束问诊并书写小结。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.online_consultation (
  id           uuid PRIMARY KEY,
  patient_id    text NOT NULL,
  doctor_id     text,
  dept         text NOT NULL,
  symptoms      text NOT NULL,
  mode         text NOT NULL DEFAULT 'text'
               CHECK (mode IN ('text','image','video')),
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','ongoing','ended','cancelled')),
  end_reason   text CHECK (end_reason IN ('completed','timeout')),
  summary      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  ended_at     timestamptz,
  -- 咨询中倒计时截止：接单后 30 分钟，越过即自动超时关单
  deadline_at  timestamptz,
  -- 实际问诊时长（秒）：ended_at - accepted_at
  duration_sec  int,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 按患者查问诊历史 / 按医师查接诊池
CREATE INDEX IF NOT EXISTS idx_online_consult_patient
  ON clinical.online_consultation(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_consult_doctor
  ON clinical.online_consultation(doctor_id, accepted_at DESC);
-- 超时巡检：捞所有 ongoing 且 deadline_at 已过期的单
CREATE INDEX IF NOT EXISTS idx_online_consult_timeout
  ON clinical.online_consultation(status, deadline_at)
  WHERE status = 'ongoing';

DROP TRIGGER IF EXISTS trg_online_consult_updated ON clinical.online_consultation;
CREATE TRIGGER trg_online_consult_updated BEFORE UPDATE ON clinical.online_consultation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
