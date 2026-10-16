-- ============================================================================
-- 健澜科技 jlmedaios - M176-A 医院运营分析深化：DRG/DIP 付费深度分析
-- 【临床核心深化】
--
-- DRG 分析要真懂医保政策，不能外行。本表在 56-drg-grouping（本地分组）、
-- 112-drg-budget-alert（预算预警）、118-dip-point-system（DIP 点值）之上，
-- 面向医保办 / 运营处沉淀"深度付费分析"结果：
--   1. 分组正确性：主诊断 ICD 前缀 + 是否手术室操作（ORP）决定 MDC 与内外组，
--      反查"应入组"与"实际入组"，识别主诊断选错、内外组错配、低标入院；
--   2. 费用偏差：实际费用 vs DRG 标准费用（标准费用 = 权重 × 医保费率），
--      输出偏差额与偏差率；
--   3. 盈亏分析：DRG 超支自担、结余留用，单病例盈亏落库，可汇总到科室 / 院级；
--   4. 病种结构：CMI（病例组合指数）、时间消耗指数、费用消耗指数按期快照；
--   5. 离群病例：高费用（>组均 2 倍）、超长住院、低费用短住院三类离群，
--      离群病例可走"特例单议/特病单议"，不与普通病例同口径考核。
--
-- 生产红线：
--   - 仅医保办 / 运营处 / admin 可读写；金额 numeric 不取舍；比率 0..1 小数；
--   - 分析结论只读落库（append 快照），不回写分组、不触发改医嘱与结算；
--   - CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重复执行；
--   - 本模块仅运营辅助，最终付费以医保经办机构清算为准。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) clinical.drg_audit：DRG 深度付费分析结果表（逐病例快照）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.drg_audit (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id               uuid REFERENCES clinical.visits(id),
  patient_id             uuid REFERENCES clinical.patients(id),
  dept                   text        NOT NULL DEFAULT '',       -- 科室
  period_key             text        NOT NULL DEFAULT '',       -- 考核期 2026-09

  -- 入组信息
  primary_dx_code        text,                               -- 主诊断 ICD-10
  has_orp                boolean     NOT NULL DEFAULT false,   -- 是否含手术室操作
  group_code             text        NOT NULL DEFAULT '',      -- 实际入组
  group_name             text        NOT NULL DEFAULT '',
  mdc                    text        NOT NULL DEFAULT '',

  -- 分组正确性（应入组 vs 实际入组）
  expected_group_code    text        NOT NULL DEFAULT '',       -- 反推应入组
  grouping_correctness   text        NOT NULL DEFAULT 'correct'
                           CHECK (grouping_correctness IN ('correct','suspect','wrong')),
  grouping_reasons       jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- 疑点明细

  -- 费用偏差（标准费用 = 权重 × 费率）
  weight                 numeric(6,3) NOT NULL DEFAULT 1.000,
  payment_rate           numeric(12,2) NOT NULL DEFAULT 0,      -- 费率（元/权重）
  standard_payment       numeric(12,2) NOT NULL DEFAULT 0,     -- 标准付费
  actual_cost            numeric(12,2) NOT NULL DEFAULT 0,      -- 实际费用/成本
  cost_deviation         numeric(12,2) NOT NULL DEFAULT 0,     -- 偏差额 = 实际-标准
  cost_deviation_rate    numeric(8,4) NOT NULL DEFAULT 0,        -- 偏差率

  -- 盈亏（正=结余留用，负=超支自担）
  profit_loss            numeric(12,2) NOT NULL DEFAULT 0,
  los_days               numeric(5,1) NOT NULL DEFAULT 0,

  -- 离群识别：inlier / high_cost_outlier / long_los_outlier / low_cost_outlier
  inlier_status          text        NOT NULL DEFAULT 'inlier'
                           CHECK (inlier_status IN
                             ('inlier','high_cost_outlier','long_los_outlier','low_cost_outlier')),
  outlier_action         text        NOT NULL DEFAULT '',       -- 如：特例单议申报

  -- 病种结构快照（按期汇总冗余，便于报表）
  cmi                    numeric(6,3) NOT NULL DEFAULT 0,        -- 病例组合指数
  time_efficiency_index  numeric(8,3) NOT NULL DEFAULT 0,        -- 时间消耗指数
  cost_efficiency_index  numeric(8,3) NOT NULL DEFAULT 0,        -- 费用消耗指数

  conclusion             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by            uuid REFERENCES iam.users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drg_audit_dept_period
  ON clinical.drg_audit (dept, period_key);
CREATE INDEX IF NOT EXISTS idx_drg_audit_group
  ON clinical.drg_audit (group_code);
CREATE INDEX IF NOT EXISTS idx_drg_audit_correctness
  ON clinical.drg_audit (grouping_correctness);
CREATE INDEX IF NOT EXISTS idx_drg_audit_inlier
  ON clinical.drg_audit (inlier_status);

DROP TRIGGER IF EXISTS trg_drg_audit_updated ON clinical.drg_audit;
CREATE TRIGGER trg_drg_audit_updated BEFORE UPDATE ON clinical.drg_audit
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE clinical.drg_audit IS
  'M176-A【临床核心深化】DRG/DIP 深度付费分析：分组正确性/费用偏差/盈亏/CMI/消耗指数/离群病例';

-- ----------------------------------------------------------------------------
-- 2) 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('drg:deep:view', 'DRG深度付费分析查看', 'billing',
   '查看分组正确性、费用偏差、盈亏、CMI与离群病例分析（医保办/运营处）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code = 'drg:deep:view'
ON CONFLICT (role_code, permission_code) DO NOTHING;
