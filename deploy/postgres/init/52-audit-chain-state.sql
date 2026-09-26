-- ============================================================================
-- 健澜科技 jlmedaios - 审计哈希链并发加固（链头状态表 + 行锁）
-- 52-audit-chain-state.sql
--
-- 51 号迁移在触发器内以 pg_advisory_xact_lock 串行化“读链头→算哈希”，但多进程
-- 高并发压测仍可观察到间歇分叉（链拓扑与 seq 顺序错位）。根因：BEFORE INSERT
-- 触发器执行时，外层 INSERT 语句的快照在等锁之前已经固定；咨询锁虽把 nextval
-- 串行，触发器内 SELECT 链头仍可能使用旧快照而读不到另一事务已提交的新链头。
--
-- 修复：引入单行链头状态表 audit.chain_state，触发器以 SELECT ... FOR UPDATE
-- 锁定该行后再读链头：
--   * READ COMMITTED 下 FOR UPDATE 经 EvalPlanQual 必定取到最新已提交版本，
--     不依赖语句快照时机；
--   * 同一事务内多行/多语句插入时，后续行可读到本事务刚更新的链头
--     （read-your-writes），从而连多值 INSERT 也能逐行正确链接；
--   * 业务事务回滚时链头推进一并回滚，不会产生空洞。
-- 哈希负载公式与 02-schemas.sql / 50-audit.sql / 51 号迁移逐字一致，不改表结构。
-- 幂等可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- 1、链头状态表（单行，id 恒为 1）
CREATE TABLE IF NOT EXISTS audit.chain_state (
  id        smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  head_seq  bigint NOT NULL,
  head_hash text   NOT NULL
);

-- 2、以当前链头初始化（历史分叉保持原样，仅记录当前 tip；区间核验不受影响）
INSERT INTO audit.chain_state (id, head_seq, head_hash)
SELECT 1,
       COALESCE((SELECT max(seq) FROM audit.audit_logs), 0),
       COALESCE(
         (SELECT hash FROM audit.audit_logs ORDER BY seq DESC LIMIT 1),
         'GENESIS'
       )
WHERE NOT EXISTS (SELECT 1 FROM audit.chain_state);

-- 3、触发器函数：FOR UPDATE 锁定链头行 → 取下一 seq → 算哈希 → 推进链头
CREATE OR REPLACE FUNCTION audit.compute_chain_hash()
RETURNS trigger AS $$
DECLARE
  v_seq  bigint;
  v_prev text;
BEGIN
  SELECT head_seq, head_hash INTO v_seq, v_prev
  FROM audit.chain_state
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_seq  := 0;
    v_prev := 'GENESIS';
    INSERT INTO audit.chain_state (id, head_seq, head_hash)
    VALUES (1, 0, 'GENESIS');
  END IF;

  v_seq := v_seq + 1;
  NEW.seq := v_seq;
  NEW.prev_hash := v_prev;
  -- 哈希负载公式必须与历史链逐字一致：
  -- prev_hash||seq||actor_id||action||resource_type||resource_id||created_at
  NEW.hash := encode(
    digest(
      v_prev
        || v_seq::text
        || COALESCE(NEW.actor_id::text, '')
        || COALESCE(NEW.action, '')
        || COALESCE(NEW.resource_type, '')
        || COALESCE(NEW.resource_id::text, '')
        || COALESCE(NEW.created_at::text, ''),
      'sha256'
    ),
    'hex'
  );

  UPDATE audit.chain_state
  SET head_seq = v_seq, head_hash = NEW.hash
  WHERE id = 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4、触发器绑定保持不变（函数体已 OR REPLACE）
DROP TRIGGER IF EXISTS trg_audit_chain ON audit.audit_logs;
CREATE TRIGGER trg_audit_chain
  BEFORE INSERT ON audit.audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit.compute_chain_hash();

-- 5、同步序列位置，避免任何走 DEFAULT nextval 的路径与链头状态冲突
SELECT setval(
  'audit.audit_logs_seq_seq',
  GREATEST(
    (SELECT last_value FROM audit.audit_logs_seq_seq),
    (SELECT head_seq FROM audit.chain_state WHERE id = 1)
  ),
  true
);
