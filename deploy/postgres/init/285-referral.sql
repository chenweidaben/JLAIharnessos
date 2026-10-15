-- ============================================================================
-- 健澜科技 jlmedaios - 双向转诊管理（M143-C）【互联网医院与远程医疗】
--
-- 【业务目标】双向转诊要跟踪到底，不能转出去就不管了。
--   医联体双向转诊最怕「转出去 = 断了线」：基层上转后三甲收没收治、
--   三甲下转后基层接没接管，全靠电话追问。本模块把每一张转诊单收敛成
--   一条 referral_record，状态机强制走完全程：
--     待接收 -> 已接收 -> 已完成
--   创建时登记目标接收科室与预计接诊日期（expected_date），超过该日期
--   仍未完成闭环的转诊单自动打上超时预警标记，医联体协调员一眼看到
--   哪些病人「转出去没人接」。
--
-- 转诊方向（与 referralAggregator.ts 的 ReferralDirection 枚举一致）：
--   upward    上转：基层（社区卫生服务中心 / 卫生院）→ 三甲
--   downward  下转：三甲 → 基层康复（社区 / 康复机构）
--   intra     院内转科：本院内科室之间转科
--
-- 转诊状态（与 aggregator 的 ReferralStatus 一致）：
--   pending   待接收：已发起，等待目标科室接收
--   accepted  已接收：目标科室接诊医生已接收，开始接管诊疗
--   completed 已完成：诊疗闭环，登记转归结局（病情稳定 / 转回基层 / 死亡等）
--
-- 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket：本版仅做拉取式 REST，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 双向转诊单主表（referral_record）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.referral_record (
  id               uuid PRIMARY KEY,
  -- 患者 ID（院内患者主索引；上转场景由接收方建档后回填）
  patient_id       text NOT NULL,
  -- 转出科室：上转时为基层机构，下转时为三甲科室，院内转科时为源科室
  from_dept        text NOT NULL,
  -- 转入科室：上转时为三甲专科，下转时为基层康复机构，院内转科时为目标科室
  to_dept          text NOT NULL,
  -- 转诊方向：upward 上转（基层→三甲）/ downward 下转（三甲→基层康复）/ intra 院内转科
  direction        text NOT NULL
                   CHECK (direction IN ('upward','downward','intra')),
  -- 转诊原因 / 病情摘要
  reason           text NOT NULL DEFAULT '',
  -- 预计接诊日期（ISO 8601）；超过该日期仍未闭环即触发超时预警
  expected_date    timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','completed')),
  -- 接收医生工号；NULL = 目标科室尚未接收
  accepting_doctor text NULL,
  accepted_at      timestamptz NULL,
  -- 转归结局：完成闭环时登记（病情稳定转回基层 / 门诊随访 / 收入院 / 死亡等）
  outcome          text NULL,
  completed_at     timestamptz NULL,
  -- 超时预警标记：BFF 扫描发现 now > expected_date 且未闭环时置 true，
  -- 供医联体协调员看板红点提醒——「转出去就不管了」的兜底落点
  overdue_flag     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.referral_record IS
  '双向转诊单（互联网医院与远程医疗）：上转/下转/院内转科全程留痕，超期未接收或未完成自动预警';
COMMENT ON COLUMN clinical.referral_record.direction IS
  'upward 上转（基层→三甲）/ downward 下转（三甲→基层康复）/ intra 院内转科';
COMMENT ON COLUMN clinical.referral_record.expected_date IS
  '预计接诊日期；now 超过该值且转诊单未闭环即触发超时预警，杜绝转出去没人接';
COMMENT ON COLUMN clinical.referral_record.overdue_flag IS
  '超时预警标记：true 表示已超过预计接诊日期仍未完成闭环';

-- 转入队列：目标科室查「待我接收」的转诊单（GET /api/v1/referral/incoming 高频）
CREATE INDEX IF NOT EXISTS idx_referral_record_incoming
  ON clinical.referral_record (to_dept, status, expected_date);

-- 转出方跟踪：按患者查其全部转诊记录，跟踪是否闭环
CREATE INDEX IF NOT EXISTS idx_referral_record_patient
  ON clinical.referral_record (patient_id, created_at DESC);

-- 超时预警快查：只取已打标、未完成的转诊单
CREATE INDEX IF NOT EXISTS idx_referral_record_overdue
  ON clinical.referral_record (expected_date)
  WHERE overdue_flag = true AND status <> 'completed';
