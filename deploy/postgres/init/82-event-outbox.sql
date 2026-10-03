-- =====================================================================
-- M7-C 事务性发件箱（Transactional Outbox）
-- =====================================================================
-- 业务事务与领域事件写入同一事务（原子化），后台 Outbox Relay 轮询
-- 未发布事件并投递到 WebSocket/Kafka，投递成功后标记 published。
--
-- 解决的问题：
--   · 内存事件总线在「业务落库后、推送前」崩溃会丢事件；
--   · 业务写与事件推送无法放在同一事务。
--
-- 投递与消费语义：
--   · Relay 至少一次投递（at-least-once），可能重复；
--   · 每条事件有稳定 event_id（uuid），消费端按 event_id 幂等
--     （前端 useAlert 已按 id 去重，M7-B）；
--   · 状态机 pending -> processing -> published：
--       - 认领（claim）：pending -> processing，FOR UPDATE SKIP LOCKED；
--       - 发布成功：processing -> published；
--       - 发布失败：processing -> pending，attempts+1，下轮重试；
--       - 认领后崩溃（processing 超时）：由 reclaim 回收为 pending。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

CREATE TABLE IF NOT EXISTS clinical.event_outbox (
  id             bigserial PRIMARY KEY,
  event_id       uuid NOT NULL,
  event_type     text NOT NULL,
  aggregate_type text,
  aggregate_id   text,
  payload        jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','published')),
  attempts       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  locked_at      timestamptz,
  published_at   timestamptz,
  -- 同一稳定事件仅允许一条，重复写入由业务事务保证不发生
  UNIQUE (event_id)
);

-- Relay 按顺序拉取未发布事件（部分索引，仅索引 pending 行）
CREATE INDEX IF NOT EXISTS idx_event_outbox_pending
  ON clinical.event_outbox (id)
  WHERE status = 'pending';

-- 回收超时 processing（认领后崩溃），部分索引仅索引 processing 行
CREATE INDEX IF NOT EXISTS idx_event_outbox_processing
  ON clinical.event_outbox (locked_at)
  WHERE status = 'processing';

-- 按聚合查询其事件历史（排障/审计）
CREATE INDEX IF NOT EXISTS idx_event_outbox_aggregate
  ON clinical.event_outbox (aggregate_type, aggregate_id, id);

COMMENT ON TABLE clinical.event_outbox IS
  '事务性发件箱：业务事务内写入领域事件，Relay 至少一次发布（pending→processing→published，event_id 幂等）（M7-C）';
