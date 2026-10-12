-- ============================================================================
-- 健澜科技 jlmedaios · M17-C 管路护理 + 非计划拔管闭环
--
-- 补齐迁移 98 NQI_UNPLANNED_EXTUBATION(pending) 的数据源：
--   clinical.tubes            留置管路台账（置入/在管/拔除，planned/unplanned 分类）；
--   clinical.tube_assessments 每日管路评估（部位完整性/固定/风险备注）。
--
-- 医疗安全：
--  - 拔管 CAS：in_place -> removed；unplanned 拔管必须填 removal_note（不良事件留痕）；
--  - removed_by 为执行人本人；高危管路(cvc/arterial_line)在评估中重点关注部位完整性。
--
-- 权限码：tube_care:read    管路台账只读（护士/医生/admin）；
--         tube_care:insert  置入管路登记（护士/admin）；
--         tube_care:remove  拔管登记（护士/admin）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 管路台账
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.tubes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id     uuid NOT NULL,
  tube_type      text NOT NULL CHECK (tube_type IN (
                   'cvc','arterial_line','urinary_catheter','ng_tube','feeding_tube',
                   'chest_drain','abdominal_drain','other')),
  site           text,
  fixation_note  text,
  inserted_by    uuid NOT NULL REFERENCES iam.users(id),
  inserted_at     timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'in_place' CHECK (status IN ('in_place','removed')),
  removed_at     timestamptz,
  removed_by     uuid REFERENCES iam.users(id),
  removal_type   text CHECK (removal_type IS NULL OR removal_type IN ('planned','unplanned')),
  removal_note   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tubes_visit ON clinical.tubes(visit_id, status);
CREATE INDEX IF NOT EXISTS idx_tubes_status ON clinical.tubes(status);
DROP TRIGGER IF EXISTS trg_tubes_updated ON clinical.tubes;
CREATE TRIGGER trg_tubes_updated BEFORE UPDATE ON clinical.tubes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 每日管路评估
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.tube_assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tube_id         uuid NOT NULL REFERENCES clinical.tubes(id) ON DELETE CASCADE,
  assessed_by     uuid REFERENCES iam.users(id),
  assessed_at     timestamptz NOT NULL DEFAULT now(),
  site_integrity  text CHECK (site_integrity IN ('good','redness','leak','dislodged')),
  fixation_secure boolean,
  risk_note       text
);
CREATE INDEX IF NOT EXISTS idx_tube_assess_tube ON clinical.tube_assessments(tube_id, assessed_at DESC);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('tube_care:read',   '管路护理只读',   'tube_care', '查看在院管路台账与每日评估（护士/医生只读）'),
  ('tube_care:insert', '管路置入登记',   'tube_care', '置入管路与每日评估登记（护士/admin）'),
  ('tube_care:remove', '管路拔除登记',   'tube_care', 'planned/unplanned 拔管登记，非计划拔管必填说明（护士/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：read 授 nurse/doctor/admin；insert/remove 授 nurse/admin
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'tube_care:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='tube_care:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'tube_care:insert'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='tube_care:insert');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'tube_care:remove'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='tube_care:remove');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'tube_care:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='tube_care:read');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'tube_care:read'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='tube_care:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'tube_care:insert'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='tube_care:insert');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'tube_care:remove'
WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='tube_care:remove');

-- ---------------------------------------------------------------------------
-- 迁移 98 种子：NQI_UNPLANNED_EXTUBATION(pending) -> auto
--   口径：分子=周期内 removal_type='unplanned' 的管路例数；
--         分母=周期内有 ≥1 根 in_place/置入管路的不同患者数。
-- ---------------------------------------------------------------------------
UPDATE clinical.nursing_indicators
SET source_type = 'auto',
    description = '来自 clinical.tubes：分子=周期内 removal_type=unplanned 拔管例数，分母=周期内有≥1根 in_place/置入管路的不同患者数'
WHERE code = 'NQI_UNPLANNED_EXTUBATION';
