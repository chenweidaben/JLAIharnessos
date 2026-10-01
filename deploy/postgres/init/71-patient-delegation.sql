-- =====================================================================
-- M3-Q 数字陪诊：家属代办授权
-- =====================================================================
-- 1. patient_profiles 增加授权范围与授权状态
-- 2. profile_delegations 记录授权/撤销历史（可追溯）
--
-- 安全边界：
--  · 授权范围必须显式授予，默认空（无代办权）；
--  · 高风险操作（支付/用药查阅）单独授权；
--  · 授权、撤销全程审计留痕。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

-- 1. patient_profiles 增加授权字段
ALTER TABLE clinical.patient_profiles
  ADD COLUMN IF NOT EXISTS delegated_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delegation_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delegation_revoked_at timestamptz;

-- 授权范围取值（规范化）：
--   booking     预约挂号/退号
--   consultation 在线问诊/查阅病历
--   payment     在线支付/退费
--   report      查阅检查检验报告
--   medication  处方续方/药品配送
-- 说明：jsonb 数组，元素为上述编码；空数组表示无代办权。

-- 2. 授权记录表
CREATE TABLE IF NOT EXISTS clinical.profile_delegations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES clinical.patient_profiles(id) ON DELETE CASCADE,
  granter_account_id uuid NOT NULL,          -- 授权人（患者本人账号或监护人账号）
  scopes          jsonb NOT NULL DEFAULT '[]'::jsonb,
  action          text NOT NULL DEFAULT 'grant'
                    CHECK (action IN ('grant','update','revoke')),
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','revoked')),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delegation_profile
  ON clinical.profile_delegations(profile_id);
CREATE INDEX IF NOT EXISTS idx_delegation_granter
  ON clinical.profile_delegations(granter_account_id);

-- 3. 权限码（数字陪诊/家属代办）
INSERT INTO iam.permissions (code, name, module, description)
VALUES
  ('delegation:manage', '家属代办授权管理', 'service', '为就诊人授予/撤销代办授权范围'),
  ('delegation:view',   '代办授权查看',     'service', '查看就诊人代办授权')
ON CONFLICT (code) DO NOTHING;

-- 4. 角色授权（医护/管理员可查看；患者通过 JWT 权限管理本人授权）
INSERT INTO iam.role_permissions (role_code, permission_code)
VALUES
  ('admin','delegation:view'),
  ('doctor','delegation:view'),
  ('nurse','delegation:view')
ON CONFLICT DO NOTHING;
