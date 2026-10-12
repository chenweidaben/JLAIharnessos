-- ============================================================================
-- 健澜科技 jlmedaios · M22-D 超支归因转临床改进任务
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.clinical_improvement_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL DEFAULT 'drg_attribution' CHECK (source IN ('drg_attribution','quality_safety','other')),
  visit_id        uuid NULL,
  group_code      text NULL,
  category        text NULL,
  title           text NOT NULL,
  finding         text NOT NULL,
  assignee_id     uuid NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','in_progress','resolved','verified','closed','rejected')),
  due_date        date NULL,
  resolution_note text NULL,
  resolved_at     timestamptz NULL,
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_improvement_assignee ON clinical.clinical_improvement_tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_improvement_source ON clinical.clinical_improvement_tasks(source, visit_id);

-- 权限码
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('improvement_task:assign', '整改任务分派', 'operations', '质控/医保办建单分派主治医师'),
  ('improvement_task:handle', '整改任务处理', 'operations', '医生认领/处理分派给自己的整改单')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等：先查后插）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.code
FROM (VALUES ('admin','improvement_task:assign'), ('admin','improvement_task:handle'),
             ('doctor','improvement_task:handle'),
             ('nurse','improvement_task:handle')) AS r(role_code, code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.role_code = r.role_code AND rp.permission_code = r.code
);
