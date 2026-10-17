-- ============================================================================
-- 健澜科技 jlmedaios - 手术安全学习引擎：术式风险模式沉淀（依据宪法第四章）
--
-- 背景：每台手术结束后，从手术安全核查表（Time-out / Sign-in / Sign-out）的执行
--       记录与术后结局中，按 (术式 surgery_type, 风险点 risk_factor) 沉淀历史模式：
--       哪些术式在术前准备阶段最易出问题。occurrence_rate 为该风险点在同类术式
--       术前核查中出现偏差的比例，avg_prep_minutes 为同类术式平均术前准备耗时，
--       complication_rate 为同类术式术后并发症发生率。术前开台时据此自动向术者/
--       麻醉/巡回展示该术式历史风险点，把「教训」沉淀为「流程」。
--
-- 医疗安全红线（依据宪法第四章）：
--  - 本表为统计沉淀，只描述历史规律，不直接拦截手术或自动改准备医嘱；
--  - 术前提醒仅作 Time-out 环节的辅助复核参考，最终开台决策由术者本人判断执行；
--  - AI 不自主开医嘱、不替代术者签名。
--
-- 权限码：medmuse:view（手术安全只读视图，外科/麻醉/护士/admin）。
--
-- 幂等：CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 手术安全风险模式归属 medmuse schema（首次部署兜底建 schema）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 风险模式主表：按 (surgery_type, risk_factor) 唯一沉淀一行
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.surgery_safety_pattern (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_type        text NOT NULL,
  risk_factor         text NOT NULL,
  occurrence_rate     numeric NOT NULL DEFAULT 0,
  avg_prep_minutes    numeric NOT NULL DEFAULT 0,
  complication_rate  numeric NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 按术式拉取后按发生率/并发症率排序，命中本索引即可走索引序
CREATE INDEX IF NOT EXISTS idx_surgery_safety_pattern_type
  ON medmuse.surgery_safety_pattern (surgery_type, occurrence_rate DESC, complication_rate DESC);

-- 同术式同风险点唯一约束：同一术式的同一风险点只沉淀一行
CREATE UNIQUE INDEX IF NOT EXISTS uq_surgery_safety_pattern_key
  ON medmuse.surgery_safety_pattern (surgery_type, risk_factor);

-- updated_at 自动刷新（依赖 public.set_updated_at，见既有初始化脚本）
DROP TRIGGER IF EXISTS trg_medmuse_surgery_safety_pattern_updated ON medmuse.surgery_safety_pattern;
CREATE TRIGGER trg_medmuse_surgery_safety_pattern_updated BEFORE UPDATE ON medmuse.surgery_safety_pattern
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限字典：medmuse:view（幂等；可能已由其他 medmuse 模块种子写入）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module, description) VALUES
  ('medmuse:view', '手术安全只读视图', 'medmuse', '查看术式历史风险模式沉淀与术前风险提醒（外科/麻醉/护士/admin 只读）')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：临床医护与 admin 均可只读查看（写库由手术核查事件回流任务负责）
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',  'medmuse:view'),
  ('doctor', 'medmuse:view'),
  ('nurse',  'medmuse:view')
ON CONFLICT DO NOTHING;
