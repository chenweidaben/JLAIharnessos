-- ============================================================================
-- 健澜科技 jlmedaios - 审计哈希链并发加固
-- 51-audit-chain-lock.sql
--
-- 背景：compute_chain_hash 触发器以 "SELECT hash ORDER BY seq DESC LIMIT 1"
-- 读取前驱但无任何锁。并发事务可能同时读到同一条前驱（历史演示中
-- seq9/seq10 即如此分叉），导致哈希链在高并发写入下断裂。
--
-- 修复：插入前先取事务级咨询锁（固定键），将“读前驱→算哈希”串行化，
-- 锁持有到事务提交；后到事务一定能读到已提交的最新链头。
-- 只增不改表结构，幂等可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE OR REPLACE FUNCTION audit.compute_chain_hash()
RETURNS trigger AS $$
DECLARE
  prev_hash text;
BEGIN
  -- 串行化哈希链链接计算（事务级，提交即释放）
  PERFORM pg_advisory_xact_lock(hashtext('jlmedaios:audit-chain')::bigint);

  SELECT hash INTO prev_hash
  FROM audit.audit_logs
  ORDER BY seq DESC
  LIMIT 1;

  IF prev_hash IS NULL THEN
    prev_hash := 'GENESIS';
  END IF;

  NEW.seq := COALESCE(NEW.seq, nextval('audit.audit_logs_seq_seq'));
  NEW.prev_hash := prev_hash;
  -- 注意：哈希负载公式必须与 02-schemas.sql / 历史链逐字一致，
  -- 不得增删字段（actor_name 不参与哈希），否则历史链无法衔接。
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

-- 触发器无需重建（函数体已 OR REPLACE）；确保其仍然绑定
DROP TRIGGER IF EXISTS trg_audit_chain ON audit.audit_logs;
CREATE TRIGGER trg_audit_chain
  BEFORE INSERT ON audit.audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit.compute_chain_hash();
