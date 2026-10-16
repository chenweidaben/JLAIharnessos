-- =====================================================================
-- M164-A 医院数据中台深化 · 数据资产目录（data_asset_catalog）
-- =====================================================================
-- 「数据中台与AI大脑」——数据中台要真治理，不是建表就完。
-- data_asset_catalog 把每张表/字段登记为可管、可追、可评级的资产：
--   · table_fq          全限定表名（schema.table）
--   · column_name       字段名
--   · sensitivity_level 敏感级别 L1 公开 / L2 内部 / L3 机密(PHI) / L4 绝密
--   · is_pii            是否个人敏感信息
--   · quality_score     质量三维（完整性/准确性/一致性）加权分
--   · owner_domain      数据责任人所属业务域
--
-- 与《个人信息保护法》《医疗卫生机构网络安全管理办法》分类分级口径对齐：
-- L4 绝密（证件号/生物特征）不出现在对外数据服务出参；L3 机密(PHI) 出参必须脱敏。
--
-- 版权所有（c）2026 杭州健澜科技有限公司
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS dws;

CREATE TABLE IF NOT EXISTS dws.data_asset_catalog (
  id                 BIGSERIAL PRIMARY KEY,
  table_fq           text NOT NULL,
  layer              text NOT NULL DEFAULT 'DWD',
  column_name        text NOT NULL,
  column_cn          text,
  data_type          text,
  sensitivity_level  text NOT NULL DEFAULT 'L1',
  is_pii             boolean NOT NULL DEFAULT false,
  owner_domain       text,
  completeness       numeric(5,2) NOT NULL DEFAULT 0,
  accuracy           numeric(5,2) NOT NULL DEFAULT 0,
  consistency        numeric(5,2) NOT NULL DEFAULT 0,
  quality_score      numeric(5,2) NOT NULL DEFAULT 0,
  row_count          bigint NOT NULL DEFAULT 0,
  description        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_fq, column_name)
);

-- 按表/按敏感级别检索（治理面板、合规审计高频）
CREATE INDEX IF NOT EXISTS idx_data_asset_catalog_table
  ON dws.data_asset_catalog (table_fq);

CREATE INDEX IF NOT EXISTS idx_data_asset_catalog_sensitivity
  ON dws.data_asset_catalog (sensitivity_level);

CREATE INDEX IF NOT EXISTS idx_data_asset_catalog_pii
  ON dws.data_asset_catalog (is_pii) WHERE is_pii = true;

COMMENT ON TABLE dws.data_asset_catalog IS
  '数据资产目录：表/字段/敏感分级/质量三维分（M164-A 数据中台与AI大脑）';

-- 数据资产治理权限码（仅 admin / 数据治理岗）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('data_asset:catalog:read', '数据资产目录查看', 'data_mart',
     '查看数据资产清单、字段敏感分级与质量评分'),
  ('data_asset:lineage:read', '数据血缘追踪查看', 'data_mart',
     '追踪表/字段的来源→加工→应用血缘链路')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'data_asset:catalog:read'),
  ('admin', 'data_asset:lineage:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
