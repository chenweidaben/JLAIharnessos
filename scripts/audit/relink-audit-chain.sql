-- ============================================================================
-- 健澜科技 jlmedaios · 审计哈希链重链修复脚本（开发/测试库专用）
-- ----------------------------------------------------------------------------
-- 用途：当链出现断裂（并发分叉或历史取证遗留）时，按 seq 顺序重算
--       prev_hash 与 hash，恢复链完整性。链式防篡改语义：本脚本本身
--       相当于一次“受控重建”，仅限开发/测试环境执行；生产环境必须经
--       医院信息科/审计委员会书面批准后，在维护窗口执行同一脚本，且
--       执行前须完整备份 audit.audit_logs。
-- 用法：psql -h 127.0.0.1 -p 5433 -U postgres -d jlmedaios -f relink-audit-chain.sql
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

BEGIN;

-- 0）重链前置校验：确认当前存在断裂（防止误用）
DO $$
DECLARE
  broken_count bigint;
BEGIN
  WITH scoped AS (
    SELECT seq, prev_hash,
           COALESCE(lag(hash) OVER (ORDER BY seq), 'GENESIS') AS prev_expected
    FROM audit.audit_logs
  )
  SELECT count(*) INTO broken_count FROM scoped
  WHERE prev_expected IS DISTINCT FROM prev_hash;

  IF broken_count = 0 THEN
    RAISE EXCEPTION '审计链当前无断裂，无需重链（拒绝执行）';
  END IF;
  RAISE NOTICE '检测到 % 处断裂，开始重链', broken_count;
END $$;

-- 1）临时释放唯一约束（重链中间态 prev 可能与残留旧值重复），重链后恢复
ALTER TABLE audit.audit_logs DROP CONSTRAINT IF EXISTS uq_audit_chain_prev;

-- 2）按 seq 升序逐行迭代重链：每行 prev_hash 取“上一行新计算出的 hash”
DO $$
DECLARE
  r record;
  cur_prev text := 'GENESIS';
  cur_hash text;
  relinked_count bigint := 0;
BEGIN
  FOR r IN
    SELECT seq, created_at, actor_id, action, resource_type, resource_id
    FROM audit.audit_logs
    ORDER BY seq ASC
  LOOP
    cur_hash := encode(
      digest(
        cur_prev
          || r.seq::text
          || COALESCE(r.actor_id::text, '')
          || COALESCE(r.action, '')
          || COALESCE(r.resource_type, '')
          || COALESCE(r.resource_id::text, '')
          || COALESCE(r.created_at::text, ''),
        'sha256'
      ),
      'hex'
    );
    UPDATE audit.audit_logs
    SET prev_hash = cur_prev, hash = cur_hash
    WHERE seq = r.seq;
    cur_prev := cur_hash;
    relinked_count := relinked_count + 1;
  END LOOP;
  RAISE NOTICE '已重链 % 行', relinked_count;
END $$;

-- 3）重链后校验：必须 0 断裂
DO $$
DECLARE
  broken_after bigint;
BEGIN
  WITH scoped AS (
    SELECT seq, prev_hash,
           COALESCE(lag(hash) OVER (ORDER BY seq), 'GENESIS') AS prev_expected
    FROM audit.audit_logs
  )
  SELECT count(*) INTO broken_after FROM scoped
  WHERE prev_expected IS DISTINCT FROM prev_hash;

  IF broken_after > 0 THEN
    RAISE EXCEPTION '重链后仍存在 % 处断裂，事务回滚', broken_after;
  END IF;
  RAISE NOTICE '重链完成，% 行全部校验通过', (SELECT count(*) FROM audit.audit_logs);
END $$;

-- 4）恢复唯一约束（重链后 prev 已全表唯一）
ALTER TABLE audit.audit_logs
  ADD CONSTRAINT uq_audit_chain_prev UNIQUE (prev_hash);

COMMIT;
