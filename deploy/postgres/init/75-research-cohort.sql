-- ============================================================================
-- 健澜科技杠OS - 科研专病队列：队列定义与成员库
-- 75-research-cohort.sql
--
-- 面向 M5「医疗大数据 / 科研专病库 / 真实世界证据」：
--  - research_cohorts：队列定义（疾病、纳入/排除标准、状态、创建人、最近运行）；
--  - research_cohort_members：自动匹配入组的患者（命中规则、脱敏数据快照）。
--
-- 红线：匹配规则确定性、可复现；成员快照默认脱敏，不写入明文身份；
--  队列仅用于科研分析与队列构建，不参与诊疗决策。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 队列定义
CREATE TABLE IF NOT EXISTS clinical.research_cohorts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                              -- 队列名称，如「2型糖尿病专病队列」
  disease       text NOT NULL,                              -- 目标疾病名称
  disease_code  text,                                       -- ICD-10 编码，可空
  criteria      jsonb NOT NULL DEFAULT '{}'::jsonb,         -- 纳入/排除标准，结构见规则引擎
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','archived')),
  created_by    uuid REFERENCES iam.users(id),
  last_run_at   timestamptz,
  last_run_added integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_cohorts_status
  ON clinical.research_cohorts(status) WHERE status <> 'archived';

-- 队列成员
CREATE TABLE IF NOT EXISTS clinical.research_cohort_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id     uuid NOT NULL REFERENCES clinical.research_cohorts(id) ON DELETE CASCADE,
  patient_id    uuid NOT NULL REFERENCES clinical.patients(id),
  matched_at    timestamptz NOT NULL DEFAULT now(),
  matched_rules jsonb NOT NULL DEFAULT '[]'::jsonb,         -- 命中的纳入规则名称
  data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,         -- 脱敏快照（不含明文身份）
  UNIQUE (cohort_id, patient_id)
);
CREATE INDEX IF NOT EXISTS idx_research_members_patient
  ON clinical.research_cohort_members(patient_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_research_cohorts_updated'
        AND tgrelid = 'clinical.research_cohorts'::regclass
  ) THEN
    CREATE TRIGGER trg_research_cohorts_updated BEFORE UPDATE ON clinical.research_cohorts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 权限码
--    research:read  队列与成员查看、统计、脱敏导出
--    research:write 队列创建/编辑、运行匹配、归档
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('research:read',  '科研队列查看', 'research', '科研专病队列、成员、统计与脱敏数据集查看'),
  ('research:write', '科研队列管理', 'research', '创建/编辑队列、运行匹配、归档与导出')
ON CONFLICT (code) DO NOTHING;

-- 授予角色：admin 全权；doctor 可查看与创建（科研协作）；其余角色不授予，越权 403
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'research:read'),
  ('admin', 'research:write'),
  ('doctor', 'research:read'),
  ('doctor', 'research:write')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
