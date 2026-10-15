-- ============================================================================
-- 健澜科技 jlmedaios - M124-A 系统配置中心（运维工具）
--
-- 依据宪法第四十五条（国家发展医疗卫生事业，保护人民健康）：
-- 医疗信息系统的运行参数（会话超时、功能开关、通知阈值、维护窗口）必须
-- 可在线调整、可追溯变更人、可按分类收敛，避免每次微调都走代码发版。
--
-- 表结构：
--   medmuse.system_config
--     key         text          配置键（主键，形如 auth.session_timeout_minutes）
--     value       text          配置值（统一以字符串落库，BFF/前端按需解析类型）
--     description text          配置说明（运维人员可读的用途与取值范围）
--     category    text          分类（auth / notify / feature / maintenance / general）
--     updated_at  timestamptz   最近更新时间（默认 now()）
--     updated_by  text          最近更新人工号（仅 admin 可写）
--
-- 医疗安全红线（运维工具）：
--   - 本表仅存放运行参数，严禁落患者数据 / 密钥明文 / 数据库口令；
--   - 仅 admin 角色可读可写；普通员工与患者侧一律不下发；
--   - value 统一为文本，布尔/数值由 BFF 显式解析，避免隐式类型转换漏洞；
--   - key 命名采用 dot.case 命名空间，按 category 收敛看板视图。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行；
--       初始配置以 INSERT ... ON CONFLICT DO NOTHING 幂等写入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 系统配置表（运维在线调参，替代发版改常量）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.system_config (
  key         text PRIMARY KEY,
  value       text        NOT NULL DEFAULT '',
  description text        NOT NULL DEFAULT '',
  category    text        NOT NULL DEFAULT 'general',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text        NOT NULL DEFAULT ''
);

-- 按分类收敛看板视图：filterByCategory 走此索引
CREATE INDEX IF NOT EXISTS idx_system_config_category
  ON medmuse.system_config (category, key);

-- ---------------------------------------------------------------------------
-- 初始配置（幂等；已存在的 key 不覆盖，避免冲掉运维在线调整）
-- ---------------------------------------------------------------------------
INSERT INTO medmuse.system_config (key, value, description, category, updated_by)
VALUES
  ('auth.session_timeout_minutes', '30', '登录会话空闲超时（分钟）', 'auth', 'system'),
  ('auth.password_min_length',     '8',  '密码最小长度',                'auth', 'system'),
  ('notify.critical_value_channel','sms', '危急值通知渠道（sms/wechat/app）', 'notify', 'system'),
  ('notify.followup_reminder_days','3', '出院随访提前提醒天数',        'notify', 'system'),
  ('feature.ai_note_draft_enabled','true','AI 病历草稿功能开关',        'feature', 'system'),
  ('feature.multi_modal_upload_enabled','true','多模态影像上传开关',    'feature', 'system'),
  ('maintenance.readonly_mode',    'false','系统只读维护模式开关',      'maintenance', 'system'),
  ('maintenance.announcement',     '',   '维护公告横幅文案（空则不展示）', 'maintenance', 'system')
ON CONFLICT (key) DO NOTHING;
