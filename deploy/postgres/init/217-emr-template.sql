-- ============================================================================
-- 健澜科技 jlmedaios - 电子病历模板管理（EMR Template）
--
-- 用途：
--   维护全院可复用的病历书写模板（名称、分类、正文内容），供医生站“快速插入”
--   一键复制正文，标准化病历书写、降低重复劳动。
--
-- 设计要点：
--   - 模板为全院共享资源，读写经 BFF 登录鉴权（auth），不引入独立权限码；
--   - id 使用 uuid，由应用层生成（gen_random_uuid / 客户端预生成）；
--   - category 为自由文本分类（如：入院记录 / 病程记录 / 出院小结 / 知情同意），
--     便于按分类分组与筛选；
--   - created_by 记录创建人（用户 uuid），便于追溯；
--   - 仅追加 created_at，不做软删除（删除即物理删除，由调用方确认）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.emr_template (
    id          uuid PRIMARY KEY,
    name        text NOT NULL,
    category    text NOT NULL DEFAULT '未分类',
    content     text NOT NULL DEFAULT '',
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 按分类检索与“按时间倒序列表”是最高频查询，建支撑索引。
CREATE INDEX IF NOT EXISTS idx_emr_template_category
    ON clinical.emr_template (category);

CREATE INDEX IF NOT EXISTS idx_emr_template_created_at
    ON clinical.emr_template (created_at DESC);

COMMENT ON TABLE  clinical.emr_template            IS '电子病历模板（健澜科技）';
COMMENT ON COLUMN  clinical.emr_template.id          IS '模板主键 uuid';
COMMENT ON COLUMN  clinical.emr_template.name       IS '模板名称';
COMMENT ON COLUMN  clinical.emr_template.category    IS '模板分类（自由文本）';
COMMENT ON COLUMN  clinical.emr_template.content    IS '模板正文内容';
COMMENT ON COLUMN  clinical.emr_template.created_by IS '创建人 uuid（登录用户）';
COMMENT ON COLUMN  clinical.emr_template.created_at IS '创建时间';
