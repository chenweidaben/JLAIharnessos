-- ============================================================================
-- 健澜科技 jlmedaios - 系统设置与个人偏好（M148-A · 产品化收尾）
--
-- 依据「产品化收尾」要求：为每位登录员工提供一份可持久化的个人偏好，覆盖
--   通知偏好（短信/微信/站内信）/ 界面偏好（主题色/字号/密度）/
--   助手偏好（AI 开关/建议展示）/ 工作台偏好（默认首页/常用功能置顶），
--   使工作台随个人习惯即时自适应、跨终端漫游。
--
-- 表结构：
--   staff_id   text 主键，对应 iam.users.id；仅本人可见、仅本人可改
--   settings   jsonb，结构化存储四类偏好
--   updated_at timestamptz，最近一次保存时间
--
-- 隐私与权限红线：
--   - 本表只存 UI 偏好，严禁落患者直接标识符；
--   - BFF 层强制 staff_id = 当前登录用户 c.user.id，越权读写在接口层即被拒绝；
--   - 不单独登记权限码：任何已登录员工仅能读写自己这一行。
--
-- 幂等：重复执行不会报错、不会清空已有偏好。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS iam;

CREATE TABLE IF NOT EXISTS iam.user_settings (
  staff_id    text PRIMARY KEY,
  settings    jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 按最近保存时间倒序，加速「长期未登录员工偏好巡检 / 迁移」
CREATE INDEX IF NOT EXISTS idx_user_settings_updated
  ON iam.user_settings (updated_at DESC);

COMMENT ON TABLE iam.user_settings IS '员工个人偏好（通知/界面/AI助手/工作台），仅本人读写，M148-A';
