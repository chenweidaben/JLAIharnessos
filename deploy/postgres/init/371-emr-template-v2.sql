-- ============================================================================
-- 健澜科技 jlmedaios - 电子病历模板四级继承与审核留痕（EMR Template v2）
--
-- 用途：
--   在 217-emr-template.sql 的 clinical.emr_template 基础上扩列，支撑
--   L0 国标 / L1 院级 / L2 科室级 / L3 个人级 四级继承覆盖、版本与审核态、
--   时限 SLA 与责任角色绑定；并新建 clinical.emr_template_reviews 审核留痕表
--   （复用 front_page_reviews 的 prev_hash/cur_hash sha256 哈希链范式）。
--
-- 设计要点：
--   - 幂等：ALTER TABLE ... ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS，
--     可重复执行，不破坏 217 既有 5 列（id/name/category/content/created_by/created_at）；
--   - scope：national(厂商内置国标基线) / hospital(院级) / department(科室级) / personal(个人片段)；
--   - 覆盖优先级：personal > department > hospital > national；同优先级取最新 published 版本；
--   - 必填只升不降、控件类型锁定，由应用层 resolver 纯函数保证（templateResolver.ts）；
--   - status：draft / pending_review / published / deprecated；deprecated 保留历史引用不物理删；
--   - version：int 乐观锁，transitionTemplateStatus 用 FOR UPDATE + version=$expected，0 行返回 null；
--   - due_rule：时限表达式（如 admission_time + 8h），trigger_event 挂流程引擎，responsible_role 定书写角色。
--
-- 幂等：可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 扩列 clinical.emr_template（在 217 既有表上）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.emr_template
    ADD COLUMN IF NOT EXISTS scope           text    NOT NULL DEFAULT 'hospital',
    ADD COLUMN IF NOT EXISTS department_id   uuid,
    ADD COLUMN IF NOT EXISTS hospital_id     uuid,
    ADD COLUMN IF NOT EXISTS user_id         uuid,
    ADD COLUMN IF NOT EXISTS parent_id       uuid    REFERENCES clinical.emr_template(id),
    ADD COLUMN IF NOT EXISTS record_type     text    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS fields          jsonb   NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS status          text    NOT NULL DEFAULT 'published',
    ADD COLUMN IF NOT EXISTS version         int     NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS deprecated_at   timestamptz,
    ADD COLUMN IF NOT EXISTS due_rule        text,
    ADD COLUMN IF NOT EXISTS responsible_role text,
    ADD COLUMN IF NOT EXISTS trigger_event   text;

-- 四级继承最高频查询：按 record_type + scope + 归属过滤 published。
CREATE INDEX IF NOT EXISTS idx_emr_template_lookup
    ON clinical.emr_template (record_type, scope, department_id, user_id, hospital_id);

CREATE INDEX IF NOT EXISTS idx_emr_template_status_version
    ON clinical.emr_template (status, version DESC);

CREATE INDEX IF NOT EXISTS idx_emr_template_parent
    ON clinical.emr_template (parent_id);

-- ----------------------------------------------------------------------------
-- 2. 审核留痕表 clinical.emr_template_reviews（哈希链）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.emr_template_reviews (
    id            uuid PRIMARY KEY,
    template_id   uuid NOT NULL REFERENCES clinical.emr_template(id),
    reviewer_id   uuid,
    -- 审核动作：submit(提交审核) / approve(通过发布) / return(退回修改) / deprecate(作废)
    action        text NOT NULL,
    comment       text,
    -- 审核时模板快照（版本、字段数、content 哈希），便于回溯
    snapshot_version int,
    snapshot_fields  jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- 业务级哈希链：prev_hash 指向上一条 cur_hash，首条为 'GENESIS'
    prev_hash     text,
    cur_hash      text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emr_template_reviews_template
    ON clinical.emr_template_reviews (template_id, created_at DESC, id DESC);

COMMENT ON TABLE  clinical.emr_template_reviews            IS '电子病历模板审核留痕（哈希链）';
COMMENT ON COLUMN  clinical.emr_template.scope              IS '层级：national/hospital/department/personal';
COMMENT ON COLUMN  clinical.emr_template.record_type         IS '文书类型（门诊病历/入院记录/首次病程/...）';
COMMENT ON COLUMN  clinical.emr_template.fields              IS '结构化字段 jsonb（fieldName/fieldType/required/options/placeholder）';
COMMENT ON COLUMN  clinical.emr_template.status             IS 'draft/pending_review/published/deprecated';
COMMENT ON COLUMN  clinical.emr_template.version             IS '版本号（乐观锁，int）';
COMMENT ON COLUMN  clinical.emr_template.due_rule           IS '时限 SLA 表达式，如 admission_time + 8h';
COMMENT ON COLUMN  clinical.emr_template.responsible_role    IS '书写责任角色';
COMMENT ON COLUMN  clinical.emr_template.trigger_event     IS '触发事件，如 admission_created / pre_op_24h';
