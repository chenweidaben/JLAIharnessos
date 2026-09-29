-- ============================================================================
-- 健澜科技 jlmedaios · M3-D DRG/DIP 本地分组骨架
-- 56-drg-grouping.sql
--
-- 在 M3-A 病案首页（已含主诊断 ICD 编码 + 手术操作清单）之上，做本地 DRG 分组：
--   不接外部医保接口，纯本地规则库；分组结果可解释、可复核。
--
-- 两张表：
--  （1）clinical.drg_group_rules   本地分组规则目录（诊断 ICD 前缀 + 是否需手术室手术、
--     权重、平均付费）。上线后可由医保办维护，不影响分组引擎。
--  （2）clinical.drg_group_results 单个出院就诊一次分组结果（visit_id 唯一，幂等重分组
--     覆盖），记录分组码/权重/预估付费/实际费用/结余、状态机与解释依据。
--
-- 状态机 status：grouped（已分组待复核）→ confirmed（医保办确认）/ rejected（退回）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （1）本地 DRG 分组规则目录
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.drg_group_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code         text NOT NULL UNIQUE,
  group_name         text NOT NULL,
  mdc                text NOT NULL,
  -- 主诊断 ICD-10 前缀集合（如 'I50' 命中 I50.x）
  dx_prefixes        text[] NOT NULL DEFAULT '{}',
  -- true 表示该组必须含手术室手术操作（外科组）；false 为内科组
  requires_orp       boolean NOT NULL DEFAULT false,
  -- 分组权重（相对权重）与次均付费（元，本地演示基准）
  weight             numeric(6, 3) NOT NULL DEFAULT 1.000,
  avg_payment        numeric(12, 2) NOT NULL DEFAULT 0,
  enabled            boolean NOT NULL DEFAULT true,
  sort               integer NOT NULL DEFAULT 100,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- （2）分组结果（一个出院就诊一份，幂等重分组）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.drg_group_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id             uuid NOT NULL UNIQUE REFERENCES clinical.visits(id),
  front_page_id        uuid REFERENCES clinical.medical_record_front_pages(id),
  patient_id           uuid NOT NULL REFERENCES clinical.patients(id),
  department           text NOT NULL,

  -- 分组输入快照
  primary_dx_code      text,
  has_orp              boolean NOT NULL DEFAULT false,

  -- 分组输出
  group_code           text NOT NULL,
  group_name           text,
  mdc                  text,
  grouper_version      text NOT NULL DEFAULT 'local-1.0',
  weight               numeric(6, 3) NOT NULL DEFAULT 1.000,
  estimated_payment    numeric(12, 2) NOT NULL DEFAULT 0,
  total_fee            numeric(12, 2),
  -- 结余 = 预估付费 - 实际费用（正数为结余，负数为超支）
  balance              numeric(12, 2),

  -- 解释依据（命中规则 / 匹配前缀 / 是否兜底组），供医师与医保办复核
  explanation          jsonb NOT NULL DEFAULT '{}'::jsonb,

  status               text NOT NULL DEFAULT 'grouped'
                         CHECK (status IN ('grouped', 'confirmed', 'rejected')),
  grouped_by           uuid REFERENCES iam.users(id),
  grouped_at            timestamptz NOT NULL DEFAULT now(),
  confirmed_by         uuid REFERENCES iam.users(id),
  confirmed_at          timestamptz,
  reject_reason        text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drg_results_status ON clinical.drg_group_results(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drg_results_department ON clinical.drg_group_results(department);
CREATE INDEX IF NOT EXISTS idx_drg_results_group ON clinical.drg_group_results(group_code);

DROP TRIGGER IF EXISTS trg_drg_results_updated ON clinical.drg_group_results;
CREATE TRIGGER trg_drg_results_updated BEFORE UPDATE ON clinical.drg_group_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （3）本地规则种子（演示基准，上线后由医保办维护）
-- ----------------------------------------------------------------------------
INSERT INTO clinical.drg_group_rules
  (group_code, group_name, mdc, dx_prefixes, requires_orp, weight, avg_payment, sort) VALUES
  ('ES29', '内科-肺炎伴合并症',           'J',  ARRAY['J18','J15','J16'], false, 0.800,  8000.00, 10),
  ('FB29', '内科-心力衰竭',               'F',  ARRAY['I50'],             false, 0.900,  9000.00, 20),
  ('FC25', '内科-冠脉介入',               'F',  ARRAY['I21','I22'],       false, 1.200, 12000.00, 30),
  ('GB25', '外科-胆囊切除伴合并症',       'G',  ARRAY['K80'],             true,  1.500, 15000.00, 40),
  ('IB29', '外科-阑尾切除',               'I',  ARRAY['K35'],             true,  1.000, 10000.00, 50),
  ('UZ00', '未入组-其他',                 'Z',  ARRAY[]::text[],           false, 1.000,  7000.00, 999)
ON CONFLICT (group_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- （4）权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('drg:view',  'DRG分组查看', 'billing', '查看出院病例 DRG 分组结果与规则'),
  ('drg:group', 'DRG分组运算', 'billing', '对出院病例运行本地 DRG 分组并确认/退回')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('drg:view', 'drg:group')
ON CONFLICT (role_code, permission_code) DO NOTHING;
