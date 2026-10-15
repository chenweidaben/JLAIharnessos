-- ============================================================================
-- 健澜科技 jlmedaios - 用户个人设置（M132-D · 产品化收尾）
--
-- 依据「产品化收尾」要求：为每位登录用户提供一份可持久化的个人偏好，覆盖
--   通知偏好 / 界面偏好（主题·字号）/ 智能助手开关 / 默认科室病房，
--   使工作台在不同角色间开箱即用、随个人习惯自适应。
--
-- 表结构：
--   user_id     text 主键，对应 iam.users.id；仅本人可见、仅本人可改
--   settings    jsonb，结构化存储四类偏好（notification/appearance/assistant/workspace）
--   updated_at  timestamptz，最近一次保存时间
--
-- 隐私与权限红线：
--   - 本表只存 UI 偏好，严禁落患者直接标识符；
--   - BFF 层强制 user_id = 当前登录用户 c.user.id，越权读写在接口层即被拒绝；
--   - 不单独登记权限码：任何已登录用户仅能读写自己这一行。
--
-- 幂等：重复执行不会报错、不会清空已有偏好。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS iam;

CREATE TABLE IF NOT EXISTS iam.user_settings (
  user_id     text PRIMARY KEY,
  settings    jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 按最近保存时间倒序，加速「长期未登录用户偏好巡检 / 迁移」
CREATE INDEX IF NOT EXISTS idx_user_settings_updated
  ON iam.user_settings (updated_at DESC);

COMMENT ON TABLE iam.user_settings IS '用户个人设置（通知/界面/智能助手/默认科室病房），仅本人读写';
