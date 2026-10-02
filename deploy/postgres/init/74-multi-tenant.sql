-- ============================================================================
-- 健澜科技杠OS - 多租户 / 一院多区：租户与院区注册表
-- 74-multi-tenant.sql
--
-- 层级：hospital（医院/租户）→ campus（院区）。一家医院可挂多个院区。
-- 本表是「平台级」租户注册表，承载租户/院区的持久化；BFF 启动时把节点
-- 加载到 TenantService，运行时解析保持内存级，写操作写穿透回本表。
--
-- 隔离红线：停用/软删节点立即不可解析；默认医院租户受保护，不可停用/删除。
-- 业务行级隔离（tenantId/campusId 谓词）由后续切片接入，本迁移只建注册表。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 租户 / 院区节点
CREATE TABLE IF NOT EXISTS iam.tenants (
  id          text PRIMARY KEY,                          -- 如 demo-hospital / hospital_xxx
  name        text NOT NULL,                             -- 医院名 / 院区名
  level       text NOT NULL CHECK (level IN ('hospital','campus')),
  parent_id   text REFERENCES iam.tenants(id),           -- 院区指向医院；医院为空
  enabled     boolean NOT NULL DEFAULT true,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,        -- 租户键值配置，禁止存放密钥
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- 医院节点 parent_id 必须为空；院区节点 parent_id 必须非空
ALTER TABLE iam.tenants
  DROP CONSTRAINT IF EXISTS chk_tenants_hierarchy;
ALTER TABLE iam.tenants
  ADD CONSTRAINT chk_tenants_hierarchy CHECK (
    (level = 'hospital' AND parent_id IS NULL)
    OR (level = 'campus' AND parent_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_tenants_parent ON iam.tenants(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_active ON iam.tenants(enabled) WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_iam_tenants_updated'
        AND tgrelid = 'iam.tenants'::regclass
  ) THEN
    CREATE TRIGGER trg_iam_tenants_updated BEFORE UPDATE ON iam.tenants
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 默认医院 + 默认院区（开箱即用；与 TenantService 默认值一致）
-- 用 ON CONFLICT DO NOTHING 保证幂等，不覆盖用户后续对节点的修改。
-- ----------------------------------------------------------------------------
INSERT INTO iam.tenants (id, name, level, parent_id, enabled, config)
VALUES ('demo-hospital', '健澜示范医院', 'hospital', NULL, true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO iam.tenants (id, name, level, parent_id, enabled, config)
VALUES ('main-campus', '主院区', 'campus', 'demo-hospital', true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
