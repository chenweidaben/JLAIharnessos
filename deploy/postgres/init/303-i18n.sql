-- ============================================================================
-- 健澜科技 jlmedaios - 多语言支持框架 · 翻译字典表（M151-C）
--
-- 设计理念：i18n 不是写死在前端源码里的大对象，而是「数据」。
--   每一行 = 某个语言下、某个命名空间 key 的一句文案：
--     1. 命名空间 key（nav.* / action.* / error.* / common.*）天然分块，
--        新增页面只新增 key，不改动既有逻辑，可扩展；
--     2. 语言以 locale 维度成行，新增语言（如 zh-TW / ja-JP）只需插入
--        同一批 key 的新行，不改表结构；
--     3. BFF 聚合器（aggregators/i18nAggregator.ts）以本表为持久化字典，
--        运行时读入进程内 registry，纯函数 translate/getMissingTranslations/
--        autoTranslate 全部基于 registry 派生，不触网络、不触 DB，便于单测。
--
-- 表结构（与 i18nAggregator 的 TranslationEntry 字段一一对应）：
--   id              uuid 主键
--   locale          text 语言标识，CHECK 约束仅作初始白名单，新增语言靠
--                   放宽约束 / 直接插入（可扩展，不写死）
--   translation_key text 命名空间 key，如 nav.dashboard / action.save /
--                   error.network / common.confirm
--   message         text 该语言下的文案，支持 {{param}} 占位插值
--   description     text 备注（给翻译同学看的上下文）
--   created_at / updated_at timestamptz
--   UNIQUE(locale, translation_key) 同一语言同一 key 仅一条
--
-- 兼容：CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS，重复执行不报错；
--       种子数据用 ON CONFLICT DO NOTHING，重复导入不覆盖人工修订。
-- 不触碰 WebSocket；不新增业务依赖。
-- 注释标注「质量补齐与新场景」。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS sys;

-- 翻译字典表（质量补齐与新场景：多语言支持框架持久层）
CREATE TABLE IF NOT EXISTS sys.i18n_translation (
  id              uuid PRIMARY KEY,
  locale          text NOT NULL,
  translation_key text NOT NULL,
  message         text NOT NULL,
  description     text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_i18n_translation UNIQUE (locale, translation_key),
  -- 初始白名单仅约束当前已支持的两种语言；新增语言时直接放宽该 CHECK 即可（可扩展）
  CONSTRAINT ck_i18n_locale CHECK (locale IN ('zh-CN', 'en-US'))
);

CREATE INDEX IF NOT EXISTS idx_i18n_translation_locale
  ON sys.i18n_translation (locale);
CREATE INDEX IF NOT EXISTS idx_i18n_translation_key
  ON sys.i18n_translation (translation_key);

-- 中文（zh-CN）种子：命名空间 nav.* / action.* / error.* / common.*
INSERT INTO sys.i18n_translation (id, locale, translation_key, message, description) VALUES
  (gen_random_uuid(), 'zh-CN', 'nav.dashboard',       '工作台',       '顶部导航-首页工作台'),
  (gen_random_uuid(), 'zh-CN', 'nav.patient',          '患者管理',     '顶部导航-患者'),
  (gen_random_uuid(), 'zh-CN', 'nav.order',            '医嘱',         '顶部导航-医嘱'),
  (gen_random_uuid(), 'zh-CN', 'nav.settings',         '系统设置',     '顶部导航-设置'),
  (gen_random_uuid(), 'zh-CN', 'action.save',          '保存',         '通用操作-保存'),
  (gen_random_uuid(), 'zh-CN', 'action.cancel',        '取消',         '通用操作-取消'),
  (gen_random_uuid(), 'zh-CN', 'action.confirm',        '确认',         '通用操作-确认'),
  (gen_random_uuid(), 'zh-CN', 'action.submit',         '提交',         '通用操作-提交'),
  (gen_random_uuid(), 'zh-CN', 'error.network',         '网络异常，请稍后重试', '错误-网络'),
  (gen_random_uuid(), 'zh-CN', 'error.not_found',       '未找到请求的资源',     '错误-404'),
  (gen_random_uuid(), 'zh-CN', 'error.unauthorized',    '登录已过期，请重新登录', '错误-未授权'),
  (gen_random_uuid(), 'zh-CN', 'common.confirm',        '确定',         '通用-确定'),
  (gen_random_uuid(), 'zh-CN', 'common.loading',        '加载中…',      '通用-加载态'),
  (gen_random_uuid(), 'zh-CN', 'common.welcome',        '欢迎，{{name}}', '通用-欢迎语（带参数插值）')
ON CONFLICT (locale, translation_key) DO NOTHING;

-- 英文（en-US）种子：同一批 key 的英文文案（质量补齐与新场景）
INSERT INTO sys.i18n_translation (id, locale, translation_key, message, description) VALUES
  (gen_random_uuid(), 'en-US', 'nav.dashboard',       'Dashboard',            'Top nav - home'),
  (gen_random_uuid(), 'en-US', 'nav.patient',          'Patients',             'Top nav - patient'),
  (gen_random_uuid(), 'en-US', 'nav.order',            'Orders',               'Top nav - orders'),
  (gen_random_uuid(), 'en-US', 'nav.settings',         'Settings',             'Top nav - settings'),
  (gen_random_uuid(), 'en-US', 'action.save',          'Save',                 'Action - save'),
  (gen_random_uuid(), 'en-US', 'action.cancel',         'Cancel',               'Action - cancel'),
  (gen_random_uuid(), 'en-US', 'action.confirm',       'Confirm',              'Action - confirm'),
  (gen_random_uuid(), 'en-US', 'action.submit',        'Submit',               'Action - submit'),
  (gen_random_uuid(), 'en-US', 'error.network',       'Network error, please retry later', 'Error - network'),
  (gen_random_uuid(), 'en-US', 'error.not_found',     'Resource not found',                'Error - 404'),
  (gen_random_uuid(), 'en-US', 'error.unauthorized',   'Session expired, please sign in again', 'Error - unauthorized'),
  (gen_random_uuid(), 'en-US', 'common.confirm',       'OK',                   'Common - confirm'),
  (gen_random_uuid(), 'en-US', 'common.loading',      'Loading…',              'Common - loading'),
  (gen_random_uuid(), 'en-US', 'common.welcome',       'Welcome, {{name}}',     'Common - welcome (param interpolation)')
ON CONFLICT (locale, translation_key) DO NOTHING;
