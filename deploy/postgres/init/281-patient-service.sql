-- ============================================================================
-- 健澜科技 jlmedaios - 患者服务中心（M142-C · 预防保健与患者服务）
-- 281-patient-service.sql
--
-- 【预防保健与患者服务】患者诉求限时处理，不能石沉大海：
--   - 五类诉求：咨询电话 / 投诉建议 / 病历复印 / 诊断证明 / 转诊预约；
--   - 状态机：已创建 → 已分派（处理中）→ 已解决 → 已关闭（满意度回访后）；
--   - 48 小时未处理自动升级提醒（escalation_level 0→1→2），
--     由应用层纯函数扫描 created_at + interval '48 hours' < now() 触发；
--   - 诉求全程留痕：受理人、处理结果、满意度评分均可回溯。
--
-- 隐私红线：patient_id 在 BFF 层脱敏后入库（P0****23），本表不沉淀明文 PII。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.patient_service_ticket (
  -- 工单主键（应用层 randomUUID）
  id                      uuid PRIMARY KEY,
  -- 工单编号（人读：SV + 时间戳 + 随机后缀）
  ticket_no               text NOT NULL UNIQUE,
  -- 【预防保健与患者服务】脱敏患者标识（P0****23），不存明文 patient_id
  patient_id              text NOT NULL DEFAULT '',
  -- 诉求类型代码（与应用层 CHECK 口径一致）：
  --   consultation_call / complaint_suggestion / medical_record_copy /
  --   diagnosis_proof / referral_appointment
  service_type            text NOT NULL CHECK (
                            service_type IN (
                              'consultation_call',
                              'complaint_suggestion',
                              'medical_record_copy',
                              'diagnosis_proof',
                              'referral_appointment'
                            )
                          ),
  -- 患者诉求描述（应用层敏感词过滤后落库，截断 1000 字）
  description             text NOT NULL DEFAULT '',
  -- 状态代码：created / assigned / resolved / closed
  status                  text NOT NULL DEFAULT 'created' CHECK (
                            status IN ('created', 'assigned', 'resolved', 'closed')
                          ),
  -- 受理人标识（分派后写入；未分派为 ''）
  handler_id              text NOT NULL DEFAULT '',
  -- 受理人姓名（冗余，便于台账直显）
  handler_name            text NOT NULL DEFAULT '',
  -- 处理结果（解决时填写）
  resolution              text NOT NULL DEFAULT '',
  -- 满意度回访评分（1-5；0 表示未回访）
  satisfaction_score     integer NOT NULL DEFAULT 0 CHECK (satisfaction_score BETWEEN 0 AND 5),
  -- 满意度留言（选填）
  satisfaction_comment    text NOT NULL DEFAULT '',
  -- 升级等级：0 正常 / 1 一级升级（超 48h）/ 2 二级升级（超 96h）
  escalation_level        integer NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 2),
  -- 应处理时限：created_at + 48h；超过即触发升级提醒
  deadline_at             timestamptz NOT NULL,
  -- 分派时间（未分派为 NULL）
  assigned_at             timestamptz,
  -- 解决时间（未解决为 NULL）
  resolved_at             timestamptz,
  -- 满意度回访时间（未回访为 NULL）
  satisfaction_at         timestamptz,
  -- 创建时间
  created_at              timestamptz NOT NULL DEFAULT now(),
  -- 最近更新时间
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE clinical.patient_service_ticket IS
  '【预防保健与患者服务】患者诉求工单：限时 48h 处理，超时自动升级，不石沉大海';
COMMENT ON COLUMN clinical.patient_service_ticket.service_type IS
  '诉求类型：咨询电话/投诉建议/病历复印/诊断证明/转诊预约';
COMMENT ON COLUMN clinical.patient_service_ticket.status IS
  '状态机：已创建 → 已分派 → 已解决 → 已关闭（满意度回访后）';
COMMENT ON COLUMN clinical.patient_service_ticket.escalation_level IS
  '升级等级：0 正常 / 1 超 48h 一级升级 / 2 超 96h 二级升级';
COMMENT ON COLUMN clinical.patient_service_ticket.deadline_at IS
  '应处理时限：创建时间 + 48 小时';

-- 患者端「我的诉求」：按患者 + 创建时间倒序
CREATE INDEX IF NOT EXISTS idx_pst_patient_created
  ON clinical.patient_service_ticket (patient_id, created_at DESC);

-- 管理员看板：按状态 + 升级等级过滤超时件
CREATE INDEX IF NOT EXISTS idx_pst_status_escalation
  ON clinical.patient_service_ticket (status, escalation_level, created_at DESC);

-- 超时扫描：deadline_at 之前仍未解决的工单
CREATE INDEX IF NOT EXISTS idx_pst_deadline
  ON clinical.patient_service_ticket (deadline_at)
  WHERE status IN ('created', 'assigned');
