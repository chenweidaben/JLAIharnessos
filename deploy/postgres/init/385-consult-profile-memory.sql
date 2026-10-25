-- ============================================================================
-- 健澜AI原生医院操作系统OS · M86 consult-agent 智能咨询助手迁移（380–385）
--
-- 本文件（385）：用户长期画像记忆 consult.profile_memory；父线程 consult.threads（见 380）。
--
-- 医疗安全红线：
--  - 画像仅沉淀既往过敏史、慢性病、药物不耐受、偏好语言等脱敏事实，供角色工具读取参考，
--    不替代病历，不据此出具确诊结论；
--  - facts 条目结构为 { key, value, source, updated_at }，source 标注事实来源会话；
--  - 画像跨会话复用：线程关闭/删除不清除长期画像，thread_id 仅记录最近来源线程；
--  - user_id 为跨端用户标识（text），不做强外键约束；事实合并由应用层去重与覆盖。
--
-- 权限码（登记与角色授权见 380-consult-threads.sql 末段）：
--   consult-agent:read 读取画像；consult-agent:write 合并写入画像事实。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / DROP TRIGGER IF EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS consult;

-- ---------------------------------------------------------------------------
-- 用户长期画像事实（每用户一行，facts 为 ProfileFact 数组；UNIQUE(user_id)）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consult.profile_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL UNIQUE,
  thread_id   uuid REFERENCES consult.threads(id) ON DELETE SET NULL,
  facts       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_consult_profile_updated ON consult.profile_memory;
CREATE TRIGGER trg_consult_profile_updated BEFORE UPDATE ON consult.profile_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
