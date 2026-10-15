-- ============================================================================
-- 健澜科技 jlmedaios - 统一通知中心（M148-B · 产品化收尾）
--
-- 产品理念：聚合通知，不能每个系统发一条。
--   全院各业务系统（医嘱/病历/审批/危急值/院感/药库/AI 推荐/同事协作……）
--   不再各自推送一条独立消息，而是统一收口到 clinical.unified_notification
--   一张表，按「四大类」聚合到医护本人的通知中心：
--     todo       待办：新医嘱待审 / 新病历待签 / 新审批待批
--     alert      告警：危急值 / 院感 / 药品低库存
--     recommend  推荐：AI 推荐经验 / 学习材料
--     interact   互动：同事 @你 / 知识被引用
--
-- 与旧表 clinical.notifications（M134-C）的关系：
--   旧表是「医护站内消息铃铛」的运行态；本表是「跨系统聚合」的权威持久层，
--   用 ref_type + ref_id 回指来源业务对象，点击可跳回原业务页面处理。
--
-- 表结构（与 notificationCenterAggregator 字段一一对应）：
--   id          uuid 主键，业务侧由 pushNotification 纯函数生成
--   staff_id    uuid，接收人 = iam.users.id；仅本人可见、仅本人可改已读
--   type        text，四大类枚举 CHECK 约束，防止脏类型落库
--   title       text，一句话标题（列表展示）
--   content     text，正文摘要（点击展开）
--   ref_type    text 可空，来源业务对象类型（order_review/record_sign/approval/
--               critical_value/infection/low_stock/ai_experience/learning_material/
--               mention/knowledge_cited ...）
--   ref_id      text 可空，来源业务对象主键，配合 ref_type 回跳原页面
--   read_at     timestamptz 可空，NULL = 未读；一旦置位即已读，不回退
--   created_at  timestamptz，推送时间，列表按此倒序
--
-- 隐私与权限红线：
--   - 本表只存站内消息元数据与业务对象引用，不落患者直接标识符；
--   - BFF 层强制 staff_id = 当前登录用户 c.user.id，越权读 / 改他人已读在接口层即拒绝；
--   - 不单独登记权限码：任何已登录用户仅能读写自己这一组通知。
--
-- 幂等：重复执行不会报错、不会清空已有通知。
-- 不触碰 WebSocket：本版仅做站内拉取式聚合中心，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.unified_notification (
  id          uuid PRIMARY KEY,
  staff_id    uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('todo','alert','recommend','interact')),
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  ref_type    text NULL,
  ref_id      text NULL,
  read_at     timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 「某人 + 未读」是铃铛角标的高频查询：partial index 只索引未读行，体积小、命中快
CREATE INDEX IF NOT EXISTS idx_unified_notification_staff_unread
  ON clinical.unified_notification (staff_id, created_at DESC)
  WHERE read_at IS NULL;

-- 列表分页按接收人 + 时间倒序扫描
CREATE INDEX IF NOT EXISTS idx_unified_notification_staff_created
  ON clinical.unified_notification (staff_id, created_at DESC);

-- 按来源业务对象回查（某条医嘱/审批产生过哪些通知），仅索引有引用的行
CREATE INDEX IF NOT EXISTS idx_unified_notification_ref
  ON clinical.unified_notification (ref_type, ref_id)
  WHERE ref_type IS NOT NULL;

COMMENT ON TABLE clinical.unified_notification IS
  '统一通知中心（待办/告警/推荐/互动跨系统聚合），仅本人读写；ref_type+ref_id 回指来源业务对象';
