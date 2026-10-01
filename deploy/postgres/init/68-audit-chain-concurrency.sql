-- ============================================================================
-- 健澜科技 jlmedaios · 迁移 68：审计哈希链并发完整性加固（M3-N）
-- ----------------------------------------------------------------------------
-- 背景：audit.compute_chain_hash() 在 BEFORE INSERT 时 SELECT 链头；并发
--       INSERT 下，INSERT 语句快照在触发器执行前已建立，触发器内再读
--       链头仍见旧快照，产生“链分叉”（prev_hash 断裂），破坏防篡改语义。
-- 加固（双层，写入路径见 src/db/repositories/auditChainRepo.ts）：
--   1）recordChainAudit 在事务第一条语句获取 advisory 锁，使并发写入
--      串行化；INSERT 作为事务内新语句，语句级快照天然读到最新链头；
--   2）唯一约束 uq_audit_chain_prev(prev_hash)：任何残余分叉直接失败
--      （可检测、可重试），绝不静默分叉。
-- 说明：本迁移只加固写入路径，不重链既有数据；既有断裂的修复由
--       scripts/audit/relink-audit-chain.sql 完成（需审批）。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 1）唯一约束：prev_hash 全表唯一（GENESIS 仅首行一次），分叉即失败（幂等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_audit_chain_prev'
  ) THEN
    ALTER TABLE audit.audit_logs
      ADD CONSTRAINT uq_audit_chain_prev UNIQUE (prev_hash);
  END IF;
END $$;

-- 2）触发器保持简单（并发串行化由 recordChainAudit 的事务级 advisory 锁承担，
--    不再在触发器内加锁——触发器内的锁因 INSERT 语句快照先行而无串行化效果）
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
