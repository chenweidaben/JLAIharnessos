-- ============================================================================
-- 健澜科技 jlmedaios · M9-B 医疗质控缺陷整改闭环
--
--  终末质控"缺陷级"整改（真实落 PostgreSQL）：
--   - quality.rectification_tasks 整改任务表：
--       质控人确认缺陷后下发（created_by），指定责任医生（assignee_id）；
--       责任医生提交整改（rectified），质控人复核通过（reviewed）或驳回（pending）；
--       状态机：pending → in_progress → rectified → reviewed（驳回回 pending）。
--   - 幂等：唯一约束 (record_id, defect_rule_id)，同病历同缺陷只下发一次；
--   - 权限码：quality:rectify（责任医生提交整改）、quality:review（质控人下发/复核）；
--   - 职责分离：质控复核人不得为责任医生本人（应用层强制）；
--   - 审计：业务变更与审计哈希链同事务提交（audit_chain 见应用层）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS quality;

CREATE TABLE IF NOT EXISTS quality.rectification_tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id      uuid NOT NULL REFERENCES clinical.medical_records(id),
  visit_id       uuid,
  -- 命中缺陷规则编码（质控规则引擎规则 id / 编码）
  defect_rule_id text NOT NULL,
  -- 缺陷所在病历章节（如：入院记录/病程记录/护理记录）
  defect_section text,
  defect_message text NOT NULL,
  -- 缺陷类型：integrity 完整性 / standardization 规范性 / logic 逻辑性 / timeliness 时效性
  defect_type    text NOT NULL,
  -- 缺陷级别：minor 一般 / major 重要 / critical 严重
  defect_level   text NOT NULL,
  -- 扣分（质控评分体系）
  deduction      numeric NOT NULL DEFAULT 0,
  -- 责任医生（整改人）
  assignee_id    uuid NOT NULL REFERENCES iam.users(id),
  -- 下发人（质控人）
  created_by     uuid NOT NULL REFERENCES iam.users(id),
  -- 状态机：pending 待整改 / in_progress 整改中 / rectified 已整改待复核 / reviewed 已复核通过
  status         text NOT NULL DEFAULT 'pending',
  rectify_content text,
  rectify_note   text,
  rectified_at   timestamptz,
  review_result  text,
  review_note    text,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  deadline       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rectification_tasks_status_check
    CHECK (status IN ('pending', 'in_progress', 'rectified', 'reviewed')),
  CONSTRAINT rectification_tasks_type_check
    CHECK (defect_type IN ('integrity', 'standardization', 'logic', 'timeliness')),
  CONSTRAINT rectification_tasks_level_check
    CHECK (defect_level IN ('minor', 'major', 'critical')),
  CONSTRAINT rectification_tasks_review_check
    CHECK (review_result IN ('approved', 'rejected') OR review_result IS NULL),
  -- 同病历同缺陷只下发一条（幂等）
  CONSTRAINT rectification_tasks_record_rule_key UNIQUE (record_id, defect_rule_id)
);

CREATE INDEX IF NOT EXISTS idx_rectification_tasks_assignee
  ON quality.rectification_tasks(assignee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rectification_tasks_created_by
  ON quality.rectification_tasks(created_by, status);
CREATE INDEX IF NOT EXISTS idx_rectification_tasks_deadline
  ON quality.rectification_tasks(deadline)
  WHERE deadline IS NOT NULL AND status <> 'reviewed';

-- ============================================================================
-- 权限码与角色授权
-- ============================================================================

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('quality:rectify', '整改提交', 'qc', '责任医生提交缺陷整改内容'),
  ('quality:review',  '质控复核', 'qc', '质控人下发整改任务与复核整改结果')
ON CONFLICT (code) DO NOTHING;

-- 授予角色（DB 目录种子；运行时 RBAC 映射见 userView.ts ROLE_PERMISSIONS）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'quality:rectify'),
  ('admin', 'quality:review'),
  ('doctor', 'quality:rectify')
) AS r(role_code, permission_code)
ON CONFLICT (role_code, permission_code) DO NOTHING;
