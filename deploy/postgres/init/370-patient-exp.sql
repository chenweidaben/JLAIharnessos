-- ============================================================================
-- 健澜科技 jlmedaios - 患者服务与体验深化（M180-C · 质量与体验）
-- 370-patient-exp.sql
--
-- 【质量与体验】患者体验不能只是登记投诉，要真改进：
--   - 在 clinical.patient_service_ticket 上扩展体验度量字段，把"投诉工单"
--     升级为"体验改进闭环工单"；
--   - 四大体验维度全部落列：预约体验 / 就诊体验 / 缴费体验 / 投诉体验；
--   - 每一条工单都要记录：痛点识别结果、改进措施、改进责任人、改进后满意度；
--   - 体验得分（0-100）由 BFF 纯函数计算后回写，断库不阻断主流程；
--   - 48h 投诉响应红线保留，新增 7 日改进回访闭环红线。
--
-- 隐私红线：patient_id 在 BFF 层脱敏后入库（P0****23），本表不存明文 PII。
-- 幂等：ALTER TABLE ... ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 扩展患者服务工单：从"登记投诉"升级为"体验改进闭环"
-- ----------------------------------------------------------------------------

-- 【质量与体验】体验维度：appointment 预约 / visit 就诊 / payment 缴费 / complaint 投诉
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS experience_dimension text NOT NULL DEFAULT 'complaint';

-- 【质量与体验】痛点代码（由 BFF identifyExperiencePainPoint 纯函数识别后回写）
--   appt_wait / appt_channel / triage_long / wait_long / consult_short /
--   exam_fragmented / pharmacy_slow / payment_window / self_service_down /
--   mobile_pay_fail / receipt_dup / complaint_slow / no_feedback / low_satisfaction
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS pain_point_code text NOT NULL DEFAULT '';

-- 【质量与体验】痛点一句话描述（人工可读，≤120 字）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS pain_point_desc text NOT NULL DEFAULT '';

-- 【质量与体验】改进措施代码（由 BFF generateExperienceImprovement 生成后回写）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS improvement_code text NOT NULL DEFAULT '';

-- 【质量与体验】改进措施正文（可执行动作，≤500 字）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS improvement_action text NOT NULL DEFAULT '';

-- 【质量与体验】改进责任人（工号/姓名，分派改进任务时写入）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS improvement_owner text NOT NULL DEFAULT '';

-- 【质量与体验】改进截止时间（投诉受理后 7 日内须闭环）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS improvement_due_at timestamptz;

-- 【质量与体验】改进完成时间（null 表示未闭环）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS improvement_closed_at timestamptz;

-- 【质量与体验】本次体验综合得分（0-100，BFF measurePatientExperience 回写）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS experience_score integer NOT NULL DEFAULT 0
  CHECK (experience_score BETWEEN 0 AND 100);

-- 【质量与体验】改进后二次满意度（1-5，0 表示未回访）
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS followup_satisfaction integer NOT NULL DEFAULT 0
  CHECK (followup_satisfaction BETWEEN 0 AND 5);

-- 【质量与体验】改进后回访留言
ALTER TABLE clinical.patient_service_ticket
  ADD COLUMN IF NOT EXISTS followup_comment text NOT NULL DEFAULT '';

-- ----------------------------------------------------------------------------
-- 索引：按维度、痛点、闭环状态检索体验改进看板
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pst_experience_dimension
  ON clinical.patient_service_ticket (experience_dimension);
CREATE INDEX IF NOT EXISTS idx_pst_pain_point_code
  ON clinical.patient_service_ticket (pain_point_code);
CREATE INDEX IF NOT EXISTS idx_pst_improvement_open
  ON clinical.patient_service_ticket (improvement_due_at)
  WHERE improvement_closed_at IS NULL;

-- ----------------------------------------------------------------------------
-- 注释
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN clinical.patient_service_ticket.experience_dimension IS
  '【质量与体验】体验维度：appointment 预约 / visit 就诊 / payment 缴费 / complaint 投诉';
COMMENT ON COLUMN clinical.patient_service_ticket.pain_point_code IS
  '【质量与体验】痛点代码，由 BFF 纯函数识别后回写';
COMMENT ON COLUMN clinical.patient_service_ticket.improvement_action IS
  '【质量与体验】可执行改进措施正文，禁止只写"已处理"';
COMMENT ON COLUMN clinical.patient_service_ticket.experience_score IS
  '【质量与体验】本次就诊旅程综合体验得分 0-100';
COMMENT ON COLUMN clinical.patient_service_ticket.followup_satisfaction IS
  '【质量与体验】改进后 7 日内二次回访满意度 1-5';
