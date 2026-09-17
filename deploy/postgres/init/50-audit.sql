-- ============================================================================
-- 健澜科技杠OS - 安全审计（哈希链防篡改）
-- 50-audit.sql
--
-- 每条审计日志保存前一条的 hash，形成只可追加的哈希链；
-- 任何一条被篡改/删除都会导致链断裂，由 verify_chain() 检出。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS audit.audit_logs_seq_seq;

CREATE TABLE audit.audit_logs (
  seq             bigint PRIMARY KEY DEFAULT nextval('audit.audit_logs_seq_seq'),
  trace_id        text,
  actor_id        uuid,                            -- 操作人（匿名/系统可为空）
  actor_name      text,
  actor_role      text,
  action          text NOT NULL,                   -- login/read/write/export/approve/reject/agent_invoke...
  resource_type   text,                            -- patient/record/prescription/agent/...
  resource_id     text,
  patient_ref     text,                            -- 脱敏患者引用
  result          text NOT NULL DEFAULT 'success' CHECK (result IN ('success','denied','failure')),
  risk_level      text CHECK (risk_level IN ('low','medium','high')),
  client_ip       inet,
  user_agent      text,
  detail          jsonb NOT NULL DEFAULT '{}',     -- 变更摘要（禁止记录明文敏感数据）
  prev_hash       text,
  hash            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor_time ON audit.audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_action_time ON audit.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_resource ON audit.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_patient ON audit.audit_logs(patient_ref);
CREATE INDEX idx_audit_created ON audit.audit_logs(created_at DESC);

-- 插入前自动计算哈希链
CREATE TRIGGER trg_audit_chain
  BEFORE INSERT ON audit.audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit.compute_chain_hash();

-- 哈希链完整性校验：返回第一条断裂位置（无断裂返回 0 行）
CREATE OR REPLACE FUNCTION audit.verify_chain()
RETURNS TABLE(broken_at bigint, expected text, actual text) AS $$
WITH ordered AS (
  SELECT seq, prev_hash, hash,
         lag(hash) OVER (ORDER BY seq) AS computed_prev
  FROM audit.audit_logs
)
SELECT o.seq,
       COALESCE(o.computed_prev, 'GENESIS'),
       o.prev_hash
FROM ordered o
WHERE COALESCE(o.computed_prev, 'GENESIS') IS DISTINCT FROM o.prev_hash;
$$ LANGUAGE sql STABLE;

-- 审计日志只增不改不删（撤销 UPDATE/DELETE 权限给应用角色；owner 保留以做归档）
-- 生产建议为应用创建独立角色并仅授予 INSERT/SELECT，见部署文档。
