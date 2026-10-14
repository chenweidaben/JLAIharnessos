-- ============================================================================
-- 健澜科技 jlmedaios - 质控整改闭环看板（215）
-- 215-qc-rectification.sql
--
-- clinical.qc_rectification：质控 issue → 整改任务 → 复核关闭 的闭环看板。
-- 状态机：open 待整改 → fixed 已整改待复核 → reviewed 复核通过 → closed 关闭。
--   - issue_id    关联质控 issue（缺陷/问题单）；
--   - assignee_id 整改责任人；
--   - note        整改/复核备注；
--   - closed_at   进入 closed 终态的时间戳。
-- 仅要求登录（auth），不新增权限码；不触碰 WebSocket。
--
-- 幂等：CREATE TABLE IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.qc_rectification (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id    uuid,                                       -- 关联质控 issue
  assignee_id uuid,                                       -- 整改责任人
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'fixed', 'reviewed', 'closed')),
  note        text,                                       -- 整改/复核备注
  created_at  timestamptz DEFAULT now(),
  closed_at   timestamptz                                 -- 进入 closed 的时间
);

CREATE INDEX IF NOT EXISTS idx_qc_rectification_status
  ON clinical.qc_rectification (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_rectification_assignee
  ON clinical.qc_rectification (assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_qc_rectification_issue
  ON clinical.qc_rectification (issue_id);
