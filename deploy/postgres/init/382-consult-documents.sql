-- ============================================================================
-- 健澜AI原生医院操作系统OS · M86 consult-agent 智能咨询助手迁移（380–385）
--
-- 本文件（382）：会话附件 consult.documents；父表 consult.threads（见 380），
--   可选归属消息 consult.messages（见 381）。
--
-- 医疗安全红线：
--  - 上传报告/化验单/影像/病历等仅作为证据材料抽取与辅助参考，AI 不据此出具确诊结论；
--  - extracted_evidence 只存脱敏后结构化证据条目（kind/label/source/snippet），
--    原始入参与未脱敏正文不回显、不扩散；
--  - 附件随线程级联删除；message_id 可空，消息先删时记录保留为线程级附件。
--
-- 权限码（登记与角色授权见 380-consult-threads.sql 末段）：
--   consult-agent:read 查看附件与抽取证据；consult-agent:write 上传附件。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS consult;

-- ---------------------------------------------------------------------------
-- 会话上传附件（病历/化验单/影像报告等；证据抽取结果结构化落 jsonb）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult.documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         uuid NOT NULL REFERENCES consult.threads(id) ON DELETE CASCADE,
  message_id        uuid REFERENCES consult.messages(id),
  file_name         text NOT NULL,
  mime_type         text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes        bigint,
  evidence_summary  text,
  extracted_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consult_documents_thread_created
  ON consult.documents(thread_id, created_at ASC);
