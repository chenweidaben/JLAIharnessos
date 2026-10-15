-- ============================================================================
-- 健澜科技 jlmedaios - 药师审方「越审越准」拦截模式沉淀（依据宪法第四章）
--
-- 背景：药师在前置审方拦截药物相互作用/禁忌配伍后，按
--       (药品编码 drug_code, 相互作用类型 interaction_type) 二维沉淀历史拦截
--       模式——哪些药物组合最常被拦截、平均风险分级多高。模式频次 frequency 与
--       平均风险分级 avg_risk_level 随审方拦截回流持续累加，越用越准；
--       rankHighRisk 据此对高频问题药物组合自动高亮预警，提示药师重点复核。
--
-- 医疗安全红线（依据宪法第四章）：
--  - 本表为统计沉淀，只描述历史拦截规律，不自动驳回处方、不替代药师签名；
--  - 高亮预警仅作药师审方的辅助参考，最终放行/拦截由药师本人判断执行；
--  - AI 不自主改方、不替代药师承担审方责任。
--
-- 权限码：medmuse:view（药师/医生/admin 只读视图）。
--
-- 幂等：CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 审方学习模式归属 medmuse schema（首次部署兜底建 schema）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 审方拦截模式主表：按 (drug_code, interaction_type) 唯一沉淀
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.pharmacy_audit_pattern (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid,
  drug_code        text NOT NULL,
  interaction_type text NOT NULL,
  frequency        integer NOT NULL DEFAULT 0,
  avg_risk_level   numeric NOT NULL DEFAULT 0,
  last_occurred    timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 高频风险组合拉取后按频次/风险分级排序，命中本索引即可走索引序
CREATE INDEX IF NOT EXISTS idx_pharmacy_audit_pattern_freq
  ON medmuse.pharmacy_audit_pattern (frequency DESC, avg_risk_level DESC);

-- 同一药品编码同一相互作用类型只沉淀一行
CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_audit_pattern_key
  ON medmuse.pharmacy_audit_pattern (drug_code, interaction_type);

-- updated_at 自动刷新（依赖 public.set_updated_at，见既有初始化脚本）
DROP TRIGGER IF EXISTS trg_medmuse_pharmacy_audit_pattern_updated ON medmuse.pharmacy_audit_pattern;
CREATE TRIGGER trg_medmuse_pharmacy_audit_pattern_updated BEFORE UPDATE ON medmuse.pharmacy_audit_pattern
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限字典：medmuse:view（幂等；可能已由其他 medmuse 模块种子写入）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module, description) VALUES
  ('medmuse:view', 'medmuse 只读视图', 'medmuse', '查看药师审方高频风险药物组合等 medmuse 只读沉淀视图（药师/医生/admin）')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：临床医护、药师与 admin 均可只读查看（写库由审方拦截回流任务负责）
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',  'medmuse:view'),
  ('doctor', 'medmuse:view'),
  ('nurse',  'medmuse:view'),
  ('pharmacist', 'medmuse:view')
ON CONFLICT DO NOTHING;
