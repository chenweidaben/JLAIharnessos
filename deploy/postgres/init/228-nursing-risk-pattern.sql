-- ============================================================================
-- 健澜科技 jlmedaios - 护理工作台「越用越准」风险模式沉淀（依据宪法第四章）
--
-- 背景：护理工作台在压疮/跌倒/管路滑脱等风险事件发生后，按
--       (病区, 风险类型, 患者画像) 三维沉淀历史模式：哪些患者组合/时段/病情
--       最易出风险。模式频次 occurrence_count 与平均严重度 avg_severity 随事件
--       回流持续累加，越用越准；prioritizeRisks 据此对在院患者动态排序，
--       本周重点风险患者随之滚动调整。
--
-- 医疗安全红线（依据宪法第四章）：
--  - 本表为统计沉淀，只描述历史规律，不直接触发医嘱或自动护理动作；
--  - 排序结果仅作护理人力排班/巡视重点的辅助参考，最终处置由责任护士本人判断执行；
--  - AI 不自主开医嘱、不替代护士签名。
--
-- 权限码：medmuse:view（护理工作台只读视图，护士/医生/admin）。
--
-- 幂等：CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 护理风险模式归属 medmuse schema（首次部署兜底建 schema）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 风险模式主表：按 (ward_id, risk_type, patient_profile) 唯一沉淀
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.nursing_risk_pattern (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid,
  ward_id          text NOT NULL,
  risk_type        text NOT NULL,
  patient_profile  text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 0,
  avg_severity     numeric NOT NULL DEFAULT 0,
  last_occurred    timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 按病区拉取后按频次/严重度排序，命中本索引即可走索引序
CREATE INDEX IF NOT EXISTS idx_nursing_risk_pattern_ward
  ON medmuse.nursing_risk_pattern (ward_id, occurrence_count DESC, avg_severity DESC);

-- 同画像模式唯一约束：同一病区同一风险类型同一患者画像只沉淀一行
CREATE UNIQUE INDEX IF NOT EXISTS uq_nursing_risk_pattern_key
  ON medmuse.nursing_risk_pattern (ward_id, risk_type, patient_profile);

-- updated_at 自动刷新（依赖 public.set_updated_at，见既有初始化脚本）
DROP TRIGGER IF EXISTS trg_medmuse_nursing_risk_pattern_updated ON medmuse.nursing_risk_pattern;
CREATE TRIGGER trg_medmuse_nursing_risk_pattern_updated BEFORE UPDATE ON medmuse.nursing_risk_pattern
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限字典：medmuse:view（幂等；可能已由其他 medmuse 模块种子写入）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module, description) VALUES
  ('medmuse:view', '护理工作台只读视图', 'medmuse', '查看护理工作台风险模式沉淀与本周重点风险患者（护士/医生/admin 只读）')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：临床医护与 admin 均可只读查看（写库由事件回流任务负责）
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',  'medmuse:view'),
  ('doctor', 'medmuse:view'),
  ('nurse',  'medmuse:view')
ON CONFLICT DO NOTHING;
