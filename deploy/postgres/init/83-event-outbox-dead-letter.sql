-- =====================================================================
-- M7-D 死信队列（Dead-Letter Queue）与事件可观测性
-- =====================================================================
-- 在 M7-C 事务性发件箱的 at-least-once 状态机上补充：
--   · 发布失败达到最大次数后进入死信（status='dead'），不再无限重试，
--     避免一条无法投递的事件（如 payload 永久损坏）反复占用 Relay；
--   · 记录最后错误 last_error 与死信时间 dead_at，供运维定位与修复；
--   · 死信可在管理端修复后重投（requeue，重置为 pending）。
--
-- 状态机扩展为：pending -> processing -> published
--                                    \-> dead（失败超限）->（人工修复后）pending
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

-- 1. 扩展状态约束：加入 'dead'（内联 CHECK 默认约束名为 event_outbox_status_check）
ALTER TABLE clinical.event_outbox DROP CONSTRAINT IF EXISTS event_outbox_status_check;
ALTER TABLE clinical.event_outbox ADD CONSTRAINT event_outbox_status_check
  CHECK (status IN ('pending','processing','published','dead'));

-- 2. 新增最后错误与死信时间列
ALTER TABLE clinical.event_outbox ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE clinical.event_outbox ADD COLUMN IF NOT EXISTS dead_at timestamptz;

-- 3. 死信部分索引（仅索引 dead 行，便于管理端列表与重投）
CREATE INDEX IF NOT EXISTS idx_event_outbox_dead
  ON clinical.event_outbox (dead_at)
  WHERE status = 'dead';

COMMENT ON COLUMN clinical.event_outbox.last_error IS
  '最后一次发布失败的错误信息（M7-D 死信队列）';
COMMENT ON COLUMN clinical.event_outbox.dead_at IS
  '进入死信（dead）的时间（M7-D）';

-- 4. 管理权限码：死信查看与重投（仅 admin）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('outbox:manage', '事件发件箱管理', 'event-outbox',
     '查看死信队列、修复后重投无法投递的领域事件')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'outbox:manage')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
