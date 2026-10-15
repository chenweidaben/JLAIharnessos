-- ============================================================================
-- 健澜科技 jlmedaios - 医护统一消息通知中心（M134-C · 用户体验深化）
--
-- 设计理念：不要太吵，重要通知才推送。
--   全站统一收口医护侧的站内消息，四类来源共用一张表：
--     todo_task        待办任务（待审批 / 待执行 / 待闭环）
--     system_alert     系统告警（危重值 / 成本预算 / 质量阈值）
--     experience_rec   经验推荐（相似病例 / 科室学习曲线 / 智能体洞察）
--     peer_interact    同事互动（会诊邀请 / @提醒 / 协作请求）
--
-- 表结构（与需求字段一一对应）：
--   id          uuid 主键，业务侧由 sendNotification 纯函数生成
--   staff_id    uuid，接收人 = iam.users.id；仅本人可见、仅本人可改已读
--   type        text，四类枚举 CHECK 约束，防止脏类型落库
--   title       text，一句话标题（铃铛列表展示）
--   content     text，正文摘要（点击展开）
--   link        text 可空，点击后跳转的站内路由（如 /workbench/task/123）
--   read_at     timestamptz 可空，NULL = 未读；一旦置位即已读，不回退
--   created_at  timestamptz，推送时间，列表按此倒序
--
-- 隐私与权限红线：
--   - 本表只存站内消息元数据，不落患者直接标识符；
--   - BFF 层强制 staff_id = 当前登录用户 c.user.id，越权读 / 改他人已读在接口层即拒绝；
--   - 不单独登记权限码：任何已登录用户仅能读写自己这一组通知。
--
-- 幂等：重复执行不会报错、不会清空已有通知。
-- 不触碰 WebSocket：本版仅做站内拉取式铃铛，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.notifications (
  id          uuid PRIMARY KEY,
  staff_id    uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN
                ('todo_task','system_alert','experience_rec','peer_interact')),
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  link        text NULL,
  read_at     timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 「某人 + 未读」是铃铛角标的高频查询：partial index 只索引未读行，体积小、命中快
CREATE INDEX IF NOT EXISTS idx_notifications_staff_unread
  ON clinical.notifications (staff_id, created_at DESC)
  WHERE read_at IS NULL;

-- 列表分页按接收人 + 时间倒序扫描
CREATE INDEX IF NOT EXISTS idx_notifications_staff_created
  ON clinical.notifications (staff_id, created_at DESC);

COMMENT ON TABLE clinical.notifications IS
  '医护统一消息通知中心（待办/系统告警/经验推荐/同事互动），仅本人读写';
