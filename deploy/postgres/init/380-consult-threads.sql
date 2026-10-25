-- ============================================================================
-- 健澜AI原生医院操作系统OS · M86 consult-agent 智能咨询助手迁移（380–385）
--
-- 本文件（380）：咨询会话 consult.threads；同批迁移：
--   381 consult.messages                        会话消息（用户/助手/工具/系统）
--   382 consult.documents                       会话上传附件与抽取证据
--   383 consult.diagnosis_prescription_drafts  诊断建议/用药处方 AI 草稿
--   384 consult.audit_trail                     角色/工具/急症旁路审计轨迹（traceId 透传）
--   385 consult.profile_memory                   用户长期画像事实（双层记忆之长期层）
--
-- 医疗安全红线：
--  - AI 仅作健康科普与就诊辅助，不替代执业医师/药师面对面诊断与处方决策；
--  - 诊断建议/用药处方恒为待医师复核草稿（needs_physician_review = true），
--    处方恒为非院外处方（is_out_of_hospital_prescription = false），AI 不自主开医嘱；
--  - 急症信号（胸痛/昏迷/大出血/中风等）由安全网关旁路：会话转 escalated，
--    不进入角色编排、不产草稿，仅推送急症引导与 120/就近急诊提示；
--  - 工具审计只留工具名/状态/耗时/证据数/错误分类，禁止回显原始入参明文。
--
-- 权限码：
--   consult-agent:read   只读（会话列表/历史消息/草稿/画像/规则快照；护士/医生/admin）
--   consult-agent:write  对话写操作（创建会话/发消息/转写/退出关闭；医生/admin）
--   consult-agent:audit  审计轨迹查看（仅 admin；doctor/nurse 不授予）
--
-- 幂等：CREATE SCHEMA/TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
--       DROP TRIGGER IF EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS consult;

-- ---------------------------------------------------------------------------
-- 咨询会话（状态机：idle -> collecting -> clarifying -> drafting -> review_pending；
--   任意非终态可转 escalated/closed/aborted；closed/aborted 为终态，拒绝新消息）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult.threads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES iam.users(id),          -- 发起用户（在岗医护）
  patient_id    uuid REFERENCES clinical.patients(id),          -- 关联患者（可空：泛健康咨询）
  title         text NOT NULL DEFAULT '咨询会话',
  status        text NOT NULL DEFAULT 'idle'
                CHECK (status IN ('idle','collecting','clarifying','drafting',
                                  'review_pending','escalated','closed','aborted')),
  intent        text NOT NULL DEFAULT 'unknown'
                CHECK (intent IN ('greeting','symptom_report','clarification_answer',
                                  'medication_question','chronic_management','acute_emergency',
                                  'document_upload','exit','unknown')),
  safety_level  text NOT NULL DEFAULT 'normal'
                CHECK (safety_level IN ('normal','caution','acute')),
  current_role  text CHECK (current_role IS NULL OR current_role IN
                ('supervisor','examiner','doctor','pharmacist')),
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consult_threads_user_updated
  ON consult.threads(user_id, updated_at DESC);
DROP TRIGGER IF EXISTS trg_consult_threads_updated ON consult.threads;
CREATE TRIGGER trg_consult_threads_updated BEFORE UPDATE ON consult.threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等；三条码在本模块首文件统一登记，381–385 不再重复写入）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('consult-agent:read',  'AI 咨询助手只读', 'consult_agent',
   '查看咨询会话、历史消息、诊断/处方草稿、用户画像与规则快照（护士/医生/admin）'),
  ('consult-agent:write', 'AI 咨询助手对话', 'consult_agent',
   '创建咨询会话、发送消息、语音转写、退出关闭会话（医生/admin；护士仅只读）'),
  ('consult-agent:audit',  'AI 咨询助手审计', 'consult_agent',
   '查看咨询会话审计轨迹（仅 admin，医生/护士不授予）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：admin 三码全量；doctor read+write；nurse read；audit 仅 admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'consult-agent:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions
                  WHERE role_code='admin' AND permission_code='consult-agent:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'consult-agent:write'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions
                  WHERE role_code='admin' AND permission_code='consult-agent:write');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'consult-agent:audit'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions
                  WHERE role_code='admin' AND permission_code='consult-agent:audit');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'consult-agent:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions
                  WHERE role_code='doctor' AND permission_code='consult-agent:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'consult-agent:write'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions
                  WHERE role_code='doctor' AND permission_code='consult-agent:write');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'consult-agent:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions
                  WHERE role_code='nurse' AND permission_code='consult-agent:read');
