-- ============================================================================
-- 健澜科技杠OS - Schema 与通用机制
-- 02-schemas.sql
--
-- 分层 schema：
--   iam       用户、角色、权限（RBAC）
--   clinical  患者、就诊、病历、处方、医嘱、检验、影像（业务核心）
--   agent     智能体、工作流实例、人工任务、调用日志（编排平台）
--   knowledge 知识库、文档分块、药品/ICD/检验/检查/路径/指南/中医（知识中台）
--   audit     审计日志（哈希链防篡改）
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS agent;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS audit;

-- ----------------------------------------------------------------------------
-- 通用：updated_at 自动维护
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 通用：审计日志哈希链（前一条记录 hash 参与本条 hash，链式防篡改）
--   hash = sha256(prev_hash || seq || payload 规范化串)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit.compute_chain_hash()
RETURNS trigger AS $$
DECLARE
  prev_hash text;
BEGIN
  SELECT hash INTO prev_hash
  FROM audit.audit_logs
  ORDER BY seq DESC
  LIMIT 1;

  IF prev_hash IS NULL THEN
    prev_hash := 'GENESIS';
  END IF;

  NEW.seq := COALESCE(NEW.seq, nextval('audit.audit_logs_seq_seq'));
  NEW.prev_hash := prev_hash;
  NEW.hash := encode(
    digest(
      prev_hash
        || NEW.seq::text
        || COALESCE(NEW.actor_id::text, '')
        || COALESCE(NEW.action, '')
        || COALESCE(NEW.resource_type, '')
        || COALESCE(NEW.resource_id::text, '')
        || COALESCE(NEW.created_at::text, ''),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 通用：更新时间触发器便捷绑定
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bind_updated_at(p_table regclass)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON %2$s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
    replace(p_table::text, '.', '_'), p_table
  );
END;
$$ LANGUAGE plpgsql;
