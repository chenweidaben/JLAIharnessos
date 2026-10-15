-- ============================================================================
-- 健澜科技 jlmedaios - 转诊协同知识沉淀：历史最佳转往科室学习（依据宪法第三章）
--
-- 背景：每一例转诊（from_dept -> to_dept，referral_reason 转诊原因）结案后，
--       回流是否成功接收并完成诊疗（outcome）、转诊耗时（avg_days）与成功率
--       （success_rate）。本表按 (转诊原因, 转出科室, 转往科室) 沉淀历史规律：
--       哪种转诊原因最常被哪个科室成功接住、平均几天闭环。门诊/急诊发起转诊时，
--       据此自动推荐历史最佳转往科室，把「转诊教训」沉淀为「协同路径」。
--
-- 医疗安全红线（依据宪法第三章）：
--  - 本表为统计沉淀，只描述历史规律，不强制改派科室、不阻断转诊申请；
--  - 推荐科室仅作发起转诊时的辅助建议，最终转往科室由接诊医师与患方共同确认；
--  - AI 不自主开转诊单、不替代医师签名。
--
-- 权限码：medmuse:view（转诊知识只读视图，全科/急诊/专科/护士/admin）。
--
-- 幂等：CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 转诊知识归属 medmuse schema（首次部署兜底建 schema）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 转诊知识主表：按 (转诊原因, 转出科室, 转往科室) 唯一沉淀一行
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.referral_knowledge (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid,
  from_dept        text,
  to_dept          text,
  referral_reason  text,
  outcome          text,
  avg_days         numeric DEFAULT 0,
  success_rate     numeric DEFAULT 0,
  updated_at       timestamptz DEFAULT now()
);

-- 按转诊原因拉取后按成功率降序、耗时升序排序，命中本索引即可走索引序
CREATE INDEX IF NOT EXISTS idx_referral_knowledge_reason
  ON medmuse.referral_knowledge (referral_reason, success_rate DESC, avg_days ASC);

-- 同转诊原因同转往科室唯一约束：同一原因转往同一科室只沉淀一行
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_knowledge_key
  ON medmuse.referral_knowledge (referral_reason, from_dept, to_dept);

-- updated_at 自动刷新（依赖 public.set_updated_at，见既有初始化脚本）
DROP TRIGGER IF EXISTS trg_medmuse_referral_knowledge_updated ON medmuse.referral_knowledge;
CREATE TRIGGER trg_medmuse_referral_knowledge_updated BEFORE UPDATE ON medmuse.referral_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限字典：medmuse:view（幂等；可能已由其他 medmuse 模块种子写入）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module, description) VALUES
  ('medmuse:view', '转诊知识只读视图', 'medmuse', '查看转诊历史沉淀与最佳转往科室推荐（全科/急诊/专科/护士/admin 只读）')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：临床医护与 admin 均可只读查看（写库由转诊结案事件回流任务负责）
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',  'medmuse:view'),
  ('doctor', 'medmuse:view'),
  ('nurse',  'medmuse:view')
ON CONFLICT DO NOTHING;
