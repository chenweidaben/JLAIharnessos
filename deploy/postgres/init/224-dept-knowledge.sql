-- ============================================================================
-- 健澜科技 jlmedaios - 科室知识沉淀引擎（M101-A）
--
-- 背景：各科室在临床路径 / 用药 / 诊断三类场景下沉淀的科室专属知识条目，
--       由系统内置（system）与医生反馈（doctor_feedback）两路汇聚，
--       按 success_rate（命中率/采纳成功率）排序驱动 AI 推荐优先级。
--
-- 知识类型：pathway（临床路径）/ drug（用药知识）/ diagnosis（诊断要点）
-- 来源：    system（系统内置）/ doctor_feedback（医生反馈回流）
--
-- 幂等：全部 CREATE ... IF NOT EXISTS / ON CONFLICT DO NOTHING，可重复执行，
--       不删表、不改既有数据。
--
-- 权限码：dept_knowledge:view（科室知识查看），授予 admin / doctor / nurse / pharmacist。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- 科室知识沉淀归属 medmuse  schema（首次部署兜底建 schema）
CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 科室知识条目主表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.dept_knowledge (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code     text NOT NULL,
  knowledge_type text NOT NULL
                  CHECK (knowledge_type IN ('pathway', 'drug', 'diagnosis')),
  title         text NOT NULL DEFAULT '',
  content       text NOT NULL DEFAULT '',
  source        text NOT NULL DEFAULT 'system'
                  CHECK (source IN ('system', 'doctor_feedback')),
  usage_count   integer NOT NULL DEFAULT 0,
  success_rate  numeric NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 按科室 + 类型拉取后按成功率排序，命中本索引即可走索引序
CREATE INDEX IF NOT EXISTS idx_dept_knowledge_dept_type_rate
  ON medmuse.dept_knowledge (dept_code, knowledge_type, success_rate DESC, usage_count DESC);

-- updated_at 自动刷新（依赖 public.set_updated_at，见既有初始化脚本）
DROP TRIGGER IF EXISTS trg_medmuse_dept_knowledge_updated ON medmuse.dept_knowledge;
CREATE TRIGGER trg_medmuse_dept_knowledge_updated BEFORE UPDATE ON medmuse.dept_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限字典：dept_knowledge:view
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module) VALUES
  ('dept_knowledge:view', '科室知识沉淀查看', 'medmuse')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：临床医护与药师均可只读查看科室沉淀知识（写库由系统/回流任务负责）
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',      'dept_knowledge:view'),
  ('doctor',     'dept_knowledge:view'),
  ('nurse',      'dept_knowledge:view'),
  ('pharmacist', 'dept_knowledge:view')
ON CONFLICT DO NOTHING;
