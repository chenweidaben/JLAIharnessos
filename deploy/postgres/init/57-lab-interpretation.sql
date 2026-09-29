-- ============================================================================
-- 健澜科技 jlmedaios · M3-E 检查检验 AI 辅助解读骨架
-- 57-lab-interpretation.sql
--
-- 基于 clinical.lab_results（已含 numeric_value / ref_low / ref_high /
-- abnormal_flag / is_critical）做确定性规则解读：
--   不调外部 LLM，本地引擎按参考区间与危急值生成"解读草稿"，
--   状态机 pending_review -> signed（医师复核签名）/ rejected（退回）。
-- 铁律：AI 仅辅助，草稿不得作为诊疗依据，必须医师本人签名后方生效。
--
-- 一张表：clinical.lab_interpretations
--   一个就诊一份解读草稿（visit_id 唯一，重新生成幂等覆盖，状态重置待复核）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.lab_interpretations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id             uuid NOT NULL UNIQUE REFERENCES clinical.visits(id),
  patient_id           uuid NOT NULL REFERENCES clinical.patients(id),
  department           text NOT NULL,

  -- 解读输入快照
  item_count           integer NOT NULL DEFAULT 0,
  abnormal_count       integer NOT NULL DEFAULT 0,
  critical_count       integer NOT NULL DEFAULT 0,

  -- 解读输出
  summary              text NOT NULL,
  abnormal_items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  critical_items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  engine_version       text NOT NULL DEFAULT 'lab-rule-1.0',

  -- 状态机：pending_review 待医师复核 -> signed 已签名生效 / rejected 退回
  status               text NOT NULL DEFAULT 'pending_review'
                         CHECK (status IN ('pending_review', 'signed', 'rejected')),
  generated_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by          uuid REFERENCES iam.users(id),
  reviewed_at           timestamptz,
  reject_reason        text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_interp_status ON clinical.lab_interpretations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_interp_department ON clinical.lab_interpretations(department);

DROP TRIGGER IF EXISTS trg_lab_interp_updated ON clinical.lab_interpretations;
CREATE TRIGGER trg_lab_interp_updated BEFORE UPDATE ON clinical.lab_interpretations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('lab:interpret:view',  '检验解读查看', 'lab', '查看就诊检验 AI 辅助解读草稿'),
  ('lab:interpret:sign',  '检验解读签名', 'lab', '对检验 AI 辅助解读草稿复核签名/退回')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('lab:interpret:view', 'lab:interpret:sign')
ON CONFLICT (role_code, permission_code) DO NOTHING;
