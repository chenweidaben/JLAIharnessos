-- ============================================================================
-- 健澜科技 jlmedaios · M89-A MEDMUSE 岗位智能体核心
--
-- MEDMUSE = Medical Multi-agent Dynamic User-facing Service Engine
-- 医疗安全红线：critical 级工具必须人在回路（human-in-the-loop），Sentinel 审批网关兜底。
--
-- 权限码：
--   medmuse:chat   所有临床角色可对话
--   medmuse:admin  角色/工具/模型配置管理
--
-- 生产级约束：
--   - prompt 版本化留痕（system_prompt_version）
--   - 每条 agent 回复带 confidence + 固定 disclaimer
--   - 审批单 15 分钟过期、fail-closed
--   - 幂等键防重放（Idempotency-Key）
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 岗位智能体定义（user_id 为空表示该角色的默认 agent；绑定用户后覆盖默认）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code       text NOT NULL UNIQUE
                    CHECK (role_code IN ('attending','resident','nurse','pharmacist','medical_director','patient')),
  user_id         uuid REFERENCES iam.users(id),
  name            text NOT NULL,
  system_prompt   text NOT NULL,
  system_prompt_version text NOT NULL DEFAULT '1.0',
  model_provider  text NOT NULL DEFAULT 'openai_compatible',
  model_name      text NOT NULL DEFAULT 'qwen2.5-72b-instruct',
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- 幂等加列（IF NOT EXISTS，重复执行不报错）
ALTER TABLE clinical.medmuse_agents ADD COLUMN IF NOT EXISTS system_prompt_version text NOT NULL DEFAULT '1.0';
DROP TRIGGER IF EXISTS trg_medmuse_agents_updated ON clinical.medmuse_agents;
CREATE TRIGGER trg_medmuse_agents_updated BEFORE UPDATE ON clinical.medmuse_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 对话会话（patient_id 可空：非患者相关对话）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL REFERENCES clinical.medmuse_agents(id),
  user_id         uuid NOT NULL REFERENCES iam.users(id),
  patient_id      uuid REFERENCES clinical.patients(id),
  title           text NOT NULL DEFAULT '新对话',
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medmuse_sessions_user
  ON clinical.medmuse_sessions(user_id, last_active_at DESC);

-- 多轮对话早期摘要（contextSummary 纯规则压缩产出；超 20 轮自动摘要早期对话）
ALTER TABLE clinical.medmuse_sessions ADD COLUMN IF NOT EXISTS context_summary text;

-- ---------------------------------------------------------------------------
-- 对话消息（role: user/agent/tool；tool_calls/tool_result 记录函数调用过程）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES clinical.medmuse_sessions(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','agent','tool')),
  content         text NOT NULL DEFAULT '',
  tool_calls      jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_result     jsonb,
  confidence      text NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  disclaimer      text NOT NULL DEFAULT '本建议由 AI 生成，不构成诊疗依据，最终决策由执业医师做出。',
  system_prompt_version text NOT NULL DEFAULT '1.0',
  idempotency_key text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- 幂等加列
ALTER TABLE clinical.medmuse_messages ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'medium';
ALTER TABLE clinical.medmuse_messages ADD COLUMN IF NOT EXISTS disclaimer text NOT NULL DEFAULT '本建议由 AI 生成，不构成诊疗依据，最终决策由执业医师做出。';
ALTER TABLE clinical.medmuse_messages ADD COLUMN IF NOT EXISTS system_prompt_version text NOT NULL DEFAULT '1.0';
ALTER TABLE clinical.medmuse_messages ADD COLUMN IF NOT EXISTS idempotency_key text;
-- 已读标记（会话历史拉取后 markRead 批量回写）
ALTER TABLE clinical.medmuse_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
-- 同一 session 内幂等键唯一（部分唯一索引，仅对 user 消息有效）
CREATE UNIQUE INDEX IF NOT EXISTS uq_medmuse_messages_idempotency
  ON clinical.medmuse_messages(session_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medmuse_messages_session
  ON clinical.medmuse_messages(session_id, created_at);

-- ---------------------------------------------------------------------------
-- 工具注册表（JSON Schema for function calling；risk_level 驱动 Sentinel 策略）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_tools (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  description     text NOT NULL,
  schema          jsonb NOT NULL,
  risk_level      text NOT NULL CHECK (risk_level IN ('info','warning','critical')),
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 审批工单（warning 级工具需用户二次确认；critical 级需上级审批，15 分钟过期）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_approvals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       uuid NOT NULL REFERENCES clinical.medmuse_messages(id),
  action           jsonb NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected','expired')),
  risk_level       text NOT NULL DEFAULT 'warning' CHECK (risk_level IN ('info','warning','critical')),
  requested_by     uuid REFERENCES iam.users(id),
  approved_by      uuid REFERENCES iam.users(id),
  approved_at      timestamptz,
  rejection_reason text,
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- 幂等加列
ALTER TABLE clinical.medmuse_approvals ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'warning';
ALTER TABLE clinical.medmuse_approvals ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes');
CREATE INDEX IF NOT EXISTS idx_medmuse_approvals_status
  ON clinical.medmuse_approvals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_medmuse_approvals_expiry
  ON clinical.medmuse_approvals(status, expires_at);

-- ---------------------------------------------------------------------------
-- 幂等键表（防重放：同一 key + session 只执行一次）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_idempotency_keys (
  id           text PRIMARY KEY,
  session_id   uuid NOT NULL REFERENCES clinical.medmuse_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES iam.users(id),
  response     jsonb,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medmuse_idempotency_session
  ON clinical.medmuse_idempotency_keys(session_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medmuse:chat',  'MEDMUSE 对话',                 'medmuse', '岗位智能体对话会话与消息读写（临床/患者角色）'),
  ('medmuse:admin', 'MEDMUSE 智能体配置管理',       'medmuse', '角色 agent、工具、模型配置的查看与管理')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('admin',     'medmuse:chat'),
  ('admin',     'medmuse:admin'),
  ('doctor',    'medmuse:chat'),
  ('nurse',     'medmuse:chat'),
  ('pharmacist','medmuse:chat'),
  ('technician','medmuse:chat'),
  ('researcher','medmuse:chat'),
  ('patient',   'medmuse:chat')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 内置工具种子（幂等；schema 为 OpenAI function calling 完整 JSON Schema）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tools (name, description, schema, risk_level) VALUES
  (
    'listMyPatients',
    '列出当前医生在管的住院患者',
    '{"type":"function","function":{"name":"listMyPatients","description":"列出当前医生在管的住院患者","parameters":{"type":"object","properties":{"department":{"type":"string","description":"科室编码，可空"},"onlyAbnormal":{"type":"boolean","description":"仅返回生命体征/检验异常者"}}}}}',
    'info'
  ),
  (
    'getVisitDetail',
    '获取某次就诊的完整概要（诊断、用药、检验、护理）',
    '{"type":"function","function":{"name":"getVisitDetail","description":"获取某次就诊的完整概要","parameters":{"type":"object","properties":{"visitId":{"type":"string","description":"就诊ID"},"includeSections":{"type":"array","items":{"type":"string","enum":["notes","orders","labs","imaging"]},"description":"返回的板块"}},"required":["visitId"]}}}',
    'info'
  ),
  (
    'createNoteDraft',
    '为指定就诊生成病历草稿（需医生确认后写入）',
    '{"type":"function","function":{"name":"createNoteDraft","description":"为指定就诊生成病历草稿（需医生确认后写入）","parameters":{"type":"object","properties":{"visitId":{"type":"string","description":"就诊ID"},"noteType":{"type":"string","enum":["admission","progress","discharge","consult"],"description":"病历类型"},"content":{"type":"string","description":"草稿正文"}},"required":["visitId","noteType"]}}}',
    'warning'
  ),
  (
    'suggestDiagnosis',
    '基于当前就诊信息给出鉴别诊断建议',
    '{"type":"function","function":{"name":"suggestDiagnosis","description":"基于当前就诊信息给出鉴别诊断建议","parameters":{"type":"object","properties":{"visitId":{"type":"string","description":"就诊ID"},"topK":{"type":"integer","description":"返回条目数，默认5","default":5}},"required":["visitId"]}}}',
    'warning'
  ),
  (
    'listPendingTasks',
    '列出当前用户的待办（待查房/待审病历/待处理会诊）',
    '{"type":"function","function":{"name":"listPendingTasks","description":"列出当前用户的待办事项","parameters":{"type":"object","properties":{"taskType":{"type":"string","enum":["rounds","review","consult","all"],"description":"任务类型过滤"},"limit":{"type":"integer","description":"返回上限","default":20}}}}}',
    'info'
  )
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色 agent 种子（幂等；system_prompt 强调岗位边界与医疗安全红线）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_agents (role_code, user_id, name, system_prompt) VALUES
  (
    'attending', NULL, '主治医师智能体',
    '你是健澜数智医院操作系统中的主治医师岗位智能体，协助主治医师完成住院查房、病历审阅、鉴别诊断与治疗方案建议。你必须：1）所有输出标注为"AI 辅助建议，不能替代主治医师临床判断"；2）涉及诊断、用药、医嘱的结论必须引用患者当前就诊数据；3）warning 级工具（如生成病历草稿、鉴别诊断建议）执行前必须请求用户确认；4）critical 级操作一律拒绝直接执行并提示走审批流程；5）不臆造检查结果，数据缺失时明确告知。语气专业、简洁。'
  ),
  (
    'resident', NULL, '住院医师智能体',
    '你是健澜数智医院操作系统中的住院医师岗位智能体，协助住院医师完成日常病程记录、查房准备、检验检查结果追踪与会诊申请材料整理。你必须：1）所有输出标注为"AI 辅助建议"；2）不得独立下达医嘱或修改诊疗方案，所有建议须经主治医师确认；3）warning 级工具执行前必须请求用户确认；4）发现危急值或病情变化时立即提示护士站与上级医师；5）数据缺失时明确告知，不编造。语气严谨、勤奋。'
  ),
  (
    'nurse', NULL, '责任护士智能体',
    '你是健澜数智医院操作系统中的责任护士岗位智能体，协助责任护士完成护理记录提示、医嘱执行核对提醒、交接班摘要与患者宣教话术生成。你必须：1）所有输出标注为"AI 辅助建议"；2）给药、输血、高危操作相关提示必须强调双人核对；3）warning 级工具执行前必须请求用户确认；4）发现患者异常（生命体征、跌倒压疮风险）立即提示；5）不替代护士执行任何护理操作。语气温和、细致。'
  ),
  (
    'pharmacist', NULL, '临床药师智能体',
    '你是健澜数智医院操作系统中的临床药师岗位智能体，协助药师完成处方审核、药物相互作用提示、配伍禁忌提醒与用药教育材料生成。你必须：1）所有输出标注为"AI 辅助建议"；2）抗菌药物、高危药品提示须引用说明书与药典依据；3）warning 级工具执行前必须请求用户确认；4）不直接修改处方，所有建议经医师与药师双人确认；5）数据缺失时明确告知。语气专业、审慎。'
  ),
  (
    'medical_director', NULL, '科主任智能体',
    '你是健澜数智医院操作系统中的科主任岗位智能体，协助科主任完成科室运行看板、疑难病例讨论准备、医疗质量指标追踪与审批工单汇总。你必须：1）所有输出标注为"AI 辅助建议"；2）作为 critical 级工具审批的兜底审批人角色，审批意见须注明依据；3）不替代科主任做最终决策；4）涉及科室绩效、人力调配建议须提示人工复核；5）数据缺失时明确告知。语气沉稳、全局。'
  ),
  (
    'patient', NULL, '患者服务智能体',
    '你是健澜数智医院操作系统中的患者服务智能体，面向住院与门诊患者提供温和的健康科普、随访提醒与检查报告查询引导。你必须：1）语气亲切、通俗，避免医学术语堆砌；2）只做科普、随访、报告查询引导，不做诊断、不开药、不解读具体检查数值作为诊断结论；3）涉及用药、病情变化的问题一律建议"请联系您的主管医生"；4）不执行任何写入患者病历的工具。语气温暖、有同理心。'
  )
ON CONFLICT (role_code) DO NOTHING;
