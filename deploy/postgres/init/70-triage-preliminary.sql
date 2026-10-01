-- ============================================================================
-- 健澜科技 jlmedaios - M3-P 智能导诊 + 预问诊 迁移
--
-- 对标国家医院智慧服务三级（第 13 项「智能导医」，基本项）：
--   1. 智能导诊：症状人机对话 → 推荐科室（本地规则引擎确定性 + LLM 辅助可插拔）；
--   2. 预问诊：结构化采集病史（主诉/现病史/既往史/用药/过敏）→ 预问诊报告供医生参考。
--
-- 安全边界：导诊/预问诊结果均为「建议」，不构成诊断；最终诊断由医师本人确认。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 智能导诊会话
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.triage_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 患者账号（可空，支持未登录游客导诊）
  account_id      uuid,
  -- 患者 ID（实名后可关联）
  patient_id      uuid REFERENCES clinical.patients(id),
  -- 初始症状描述（自由文本）
  symptoms        text NOT NULL,
  -- 问答轮次（JSON 数组：{role, content}）
  dialog          jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 推荐科室（规则引擎 + LLM 结果，JSON 数组：{department, confidence, reason}）
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 最终选定科室（患者确认后）
  chosen_department text,
  -- 引擎类型：rule（本地规则）/ llm（大模型辅助）/ hybrid
  engine_type     text NOT NULL DEFAULT 'rule' CHECK (engine_type IN ('rule', 'llm', 'hybrid')),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'completed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_triage_sessions_account ON clinical.triage_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_triage_sessions_status ON clinical.triage_sessions(status);
CREATE INDEX IF NOT EXISTS idx_triage_sessions_created ON clinical.triage_sessions(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. 预问诊报告
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.preliminary_consultations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 关联导诊会话
  triage_session_id   uuid REFERENCES clinical.triage_sessions(id),
  account_id          uuid,
  patient_id          uuid REFERENCES clinical.patients(id),
  -- 预问诊目标科室
  target_department   text,
  -- 结构化病史
  chief_complaint     text,
  present_illness     text,
  past_history        text,
  medications         text,
  allergies           text,
  -- 其他补充（JSON：起病时间、伴随症状、生命体征等）
  structured          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 汇总的预问诊报告（供医生参考）
  report_text         text,
  -- 引擎类型
  engine_type         text NOT NULL DEFAULT 'form' CHECK (engine_type IN ('form', 'llm', 'hybrid')),
  -- 状态：draft（进行中）/ completed（已生成报告）/ consumed（医生已采用）
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'completed', 'consumed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_prelim_consult_session ON clinical.preliminary_consultations(triage_session_id);
CREATE INDEX IF NOT EXISTS idx_prelim_consult_patient ON clinical.preliminary_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_prelim_consult_status ON clinical.preliminary_consultations(status);

-- ----------------------------------------------------------------------------
-- 3. 权限码
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('triage:use',   '智能导诊使用', 'service', '使用智能导诊/预问诊服务（患者端）'),
  ('triage:view',  '预问诊报告查看', 'service', '查看患者预问诊报告（医护端）')
ON CONFLICT (code) DO NOTHING;

-- 授权：全部角色（含患者）可使用导诊；医护可查看预问诊报告
INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('admin', 'triage:use'), ('admin', 'triage:view'),
  ('doctor', 'triage:use'), ('doctor', 'triage:view'),
  ('nurse', 'triage:use'), ('nurse', 'triage:view'),
  ('pharmacist', 'triage:use'),
  ('patient', 'triage:use')
ON CONFLICT DO NOTHING;
