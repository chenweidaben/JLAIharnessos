-- ============================================================================
-- 健澜科技 jlmedaios · M173-D 医院互联网医院深化（合规·不违规售药）
-- 347-internet-hospital.sql
--
-- 【质量提升与新场景】互联网医院要合规，不能违规售药。在 283-online-consult.sql
-- 的 clinical.online_consultation 之上，补齐「在线问诊深化 / 互联网药房 /
-- 健康管理 / 医患沟通」四大深化域的持久化骨架，并把合规红线直接落到列级约束：
--
--   ① 在线问诊深化：图文 / 语音 / 视频 + 复诊管理 + 处方流转；
--   ② 互联网药房：处方流转 + 药品配送 + 用药指导；
--   ③ 健康管理：在线建档 + 健康档案 + 慢病管理；
--   ④ 医患沟通：在线随访 + 健康宣教 + 满意度调查。
--
-- 合规红线（列级 / 注释级约束，BFF 纯函数层再做一次复核）：
--   - 仅复诊（visit_type='followup'）可在线处方，初诊（'initial'）必须线下；
--   - 处方流转必须电子签名（esignature_ref）+ 药师审核（pharmacist_review）；
--   - 药品配送必须冷链（cold_chain）/ 麻精药（controlled_substance）特殊管控；
--   - 无处方不卖药：prescription 必须挂在已结束且已审方的复诊问诊单上。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS /
--       DO $$ ... WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 0. 扩展既有 online_consultation：合规复诊 / 处方 / 签名 / 审核字段（幂等加列）
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- 就诊类型：initial 初诊（必须线下，禁在线处方）/ followup 复诊（可在线处方）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'online_consultation'
      AND column_name = 'visit_type'
  ) THEN
    ALTER TABLE clinical.online_consultation
      ADD COLUMN visit_type text NOT NULL DEFAULT 'followup'
      CHECK (visit_type IN ('initial', 'followup'));
  END IF;

  -- 问诊沟通方式：在原 mode(text/image/video) 基础上补 voice 语音
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'online_consultation'
      AND column_name = 'channel'
  ) THEN
    ALTER TABLE clinical.online_consultation
      ADD COLUMN channel text NOT NULL DEFAULT 'text'
      CHECK (channel IN ('text', 'image', 'voice', 'video'));
  END IF;

  -- 是否在线开方（仅复诊可置 true；BFF 复核初诊一律 false）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'online_consultation'
      AND column_name = 'online_prescribed'
  ) THEN
    ALTER TABLE clinical.online_consultation
      ADD COLUMN online_prescribed boolean NOT NULL DEFAULT false;
  END IF;

  -- 医师电子签名流水号（处方流转前置卡口之一）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'online_consultation'
      AND column_name = 'esignature_ref'
  ) THEN
    ALTER TABLE clinical.online_consultation
      ADD COLUMN esignature_ref text NOT NULL DEFAULT '';
  END IF;

  -- 药师审核状态：pending / approved / rejected
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'online_consultation'
      AND column_name = 'pharmacist_review'
  ) THEN
    ALTER TABLE clinical.online_consultation
      ADD COLUMN pharmacist_review text NOT NULL DEFAULT 'pending'
      CHECK (pharmacist_review IN ('pending', 'approved', 'rejected'));
  END IF;

  -- 药师工号（审核留痕）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'online_consultation'
      AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE clinical.online_consultation
      ADD COLUMN reviewed_by text NOT NULL DEFAULT '';
  END IF;
END $$;

COMMENT ON COLUMN clinical.online_consultation.visit_type IS
  '【质量提升与新场景】就诊类型：initial 初诊（必须线下，禁在线处方）/ followup 复诊（可在线处方）';
COMMENT ON COLUMN clinical.online_consultation.channel IS
  '在线问诊沟通方式：text 图文 / voice 语音 / video 视频';
COMMENT ON COLUMN clinical.online_consultation.online_prescribed IS
  '是否在线开方：仅复诊可 true；初诊一律 false（合规红线）';
COMMENT ON COLUMN clinical.online_consultation.esignature_ref IS
  '医师电子签名流水号；处方流转必须有签名（合规红线）';
COMMENT ON COLUMN clinical.online_consultation.pharmacist_review IS
  '药师审核状态 pending/approved/rejected；处方流转必须药师审核通过（合规红线）';
COMMENT ON COLUMN clinical.online_consultation.reviewed_by IS
  '审核药师工号（留痕）';

-- ---------------------------------------------------------------------------
-- 1. 互联网药房：处方流转单（无处方不卖药；冷链 / 麻精特殊管控）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.online_prescription (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_no               text NOT NULL UNIQUE,                 -- 处方流水号 RX+日期+序号
  consultation_id     uuid NOT NULL,                       -- 关联已结束复诊问诊单
  patient_id          text NOT NULL DEFAULT '',             -- 【质量提升与新场景】脱敏患者标识
  doctor_id           text NOT NULL DEFAULT '',             -- 开方医师工号
  diagnosis           text NOT NULL DEFAULT '',             -- 临床诊断
  -- 合规卡口：电子签名 + 药师审核（均通过才允许流转/售药）
  esignature_ref      text NOT NULL DEFAULT '',
  pharmacist_review  text NOT NULL DEFAULT 'pending'
                      CHECK (pharmacist_review IN ('pending', 'approved', 'rejected')),
  -- 药品特殊属性：冷链（生物制剂/胰岛素）/ 麻精毒放（特殊管控，禁快递）
  cold_chain          boolean NOT NULL DEFAULT false,
  controlled_substance boolean NOT NULL DEFAULT false,
  -- 流转状态：draft 草稿 → signed 已签名 → reviewed 已审方 → routed 已流转药房
  --           → delivering 配送中 → delivered 已送达 → cancelled 已作废
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','signed','reviewed','routed','delivering','delivered','cancelled')),
  pharmacy_id         text NOT NULL DEFAULT '',             -- 就近双证药房
  delivery_channel    text NOT NULL DEFAULT 'self_pick'
                      CHECK (delivery_channel IN ('self_pick','express')),
  patient_lng         numeric(10,4),                        -- 患者定位（就近选药房）
  patient_lat         numeric(10,4),
  rejection_reason    text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_online_rx_patient
  ON clinical.online_prescription(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_rx_status
  ON clinical.online_prescription(status) WHERE status IN ('reviewed','routed','delivering');

COMMENT ON TABLE clinical.online_prescription IS
  '【质量提升与新场景】互联网医院处方流转单：无处方不卖药；电子签名+药师审核双卡口；冷链/麻精特殊管控';

-- ---------------------------------------------------------------------------
-- 2. 健康管理：在线建档 / 健康档案 / 慢病管理随访计划
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.online_health_record (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      text NOT NULL DEFAULT '',
  archive_no      text NOT NULL UNIQUE,                 -- 健康档案号 HA+日期+序号
  chronic_tags    text[] NOT NULL DEFAULT '{}',         -- 慢病标签：高血压/糖尿病/冠心病…
  risk_level      text NOT NULL DEFAULT 'low'
                  CHECK (risk_level IN ('low','medium','high')),
  -- 随访计划：随访周期（天）、下次随访日、随访方式
  followup_period_days int NOT NULL DEFAULT 90,
  next_followup_at timestamptz,
  followup_channel text NOT NULL DEFAULT 'phone'
                  CHECK (followup_channel IN ('phone','wechat','video','visit')),
  -- 健康宣教已触达条目数 / 满意度调查回收数（医患沟通域汇总）
  education_reach  int NOT NULL DEFAULT 0,
  satisfaction_score numeric(3,1),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_record_patient
  ON clinical.online_health_record(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_record_next_followup
  ON clinical.online_health_record(next_followup_at)
  WHERE next_followup_at IS NOT NULL;

COMMENT ON TABLE clinical.online_health_record IS
  '【质量提升与新场景】在线健康档案与慢病管理：建档/慢病标签/随访计划/宣教与满意度汇总';

-- ---------------------------------------------------------------------------
-- 3. 医患沟通：线上患者旅程节点跟踪（建档→问诊→开方→流转→配送→随访→满意度）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.online_patient_journey (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   text NOT NULL DEFAULT '',
  step         text NOT NULL,                         -- 旅程节点 code
  step_name    text NOT NULL DEFAULT '',              -- 节点人读名
  done_at      timestamptz,                           -- 完成时间（空=未完成/卡点）
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, step)
);

CREATE INDEX IF NOT EXISTS idx_journey_patient
  ON clinical.online_patient_journey(patient_id, created_at DESC);

COMMENT ON TABLE clinical.online_patient_journey IS
  '【质量提升与新场景】线上患者旅程跟踪：定位卡点节点，支撑主动随访与满意度';

-- updated_at 自动维护触发器（沿用既有公共函数 public.set_updated_at）
DROP TRIGGER IF EXISTS trg_online_rx_updated ON clinical.online_prescription;
CREATE TRIGGER trg_online_rx_updated BEFORE UPDATE ON clinical.online_prescription
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_health_record_updated ON clinical.online_health_record;
CREATE TRIGGER trg_health_record_updated BEFORE UPDATE ON clinical.online_health_record
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_journey_updated ON clinical.online_patient_journey;
CREATE TRIGGER trg_journey_updated BEFORE UPDATE ON clinical.online_patient_journey
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
