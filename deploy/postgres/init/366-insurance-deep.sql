-- ============================================================================
-- 健澜科技 jlmedaios - M179-C 【护理院感医保药事】医院医保管理深化
--
-- 医保管理要合规，不能骗保。在 254-insurance-settlement（结算审核建议级）之上，
-- 面向医保办沉淀"深化合规闭环"：
--   1. 医保政策目录：药品 / 诊疗项目 / 服务设施 三类 × 甲(全额纳入)/乙(先行自付)
--      /丙(目录外全自费)，可标注需事前审批；
--   2. 费用审核三道防线：事前（目录匹配+事前审批）、事中（重复计费监控）、
--      事后稽核（自费占比/目录外占比），结论为建议级，人工确认后才调整；
--   3. 结算管理：门诊 / 住院 / DRG / DIP 四类结算，统筹纳入基数、自费金额分列；
--   4. 拒付管理：拒付原因、申诉、整改、追回全程留痕，限期举证、闭环销号。
--
-- 生产红线：
--   - 仅医保办 / admin 可读写；金额 numeric 不取舍，比率 0..1 小数；
--   - 审核结论只读落库（append），不回写医嘱/结算；
--   - CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重复执行；
--   - 严禁诱导住院、挂床、分解收费、虚假诊疗等骗保行为，最终以医保经办清算为准。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 医保政策目录：药品 / 诊疗项目 / 服务设施 × 甲乙丙分级
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.insurance_policy_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code       text        NOT NULL UNIQUE,            -- 目录编码
  item_name       text        NOT NULL,                   -- 项目名称
  category        text        NOT NULL                    -- drug/treatment/facility
                  CHECK (category IN ('drug','treatment','facility')),
  level           text        NOT NULL                    -- 甲/乙/丙
                  CHECK (level IN ('甲','乙','丙')),
  self_pay_ratio  numeric(5,4) NOT NULL DEFAULT 0,        -- 先行自付比例 0~1
  need_prior_auth boolean     NOT NULL DEFAULT false,     -- 是否需事前审批
  effective_from  date        NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_policy_category
  ON clinical.insurance_policy_item (category);
CREATE INDEX IF NOT EXISTS idx_insurance_policy_level
  ON clinical.insurance_policy_item (level);

COMMENT ON TABLE clinical.insurance_policy_item IS
  'M179-C【护理院感医保药事】医保政策目录：药品/诊疗/服务设施 × 甲乙丙分级';

-- ----------------------------------------------------------------------------
-- 2) 医保结算主表（扩展深化列）：门诊/住院/DRG/DIP + 审核三道防线 + 拒付状态
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.insurance_settlement (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id            text        NOT NULL,                   -- 业务申报单号
  visit_id            uuid REFERENCES clinical.visits(id),
  patient_id          uuid REFERENCES clinical.patients(id),
  dept                text        NOT NULL DEFAULT '',
  period_key          text        NOT NULL DEFAULT '',        -- 考核期 2026-09
  settlement_type     text        NOT NULL DEFAULT 'outpatient'
                      CHECK (settlement_type IN ('outpatient','inpatient','drg','dip')),

  -- 结算金额
  total_amount        numeric(12,2) NOT NULL DEFAULT 0,      -- 费用总额
  insurance_base      numeric(12,2) NOT NULL DEFAULT 0,       -- 统筹纳入基数
  self_pay_amount     numeric(12,2) NOT NULL DEFAULT 0,       -- 自费金额（先行自付+目录外）
  self_pay_ratio      numeric(6,4)  NOT NULL DEFAULT 0,       -- 自费占比 0~1

  -- 费用审核三道防线（建议级）
  prior_auth          boolean     NOT NULL DEFAULT false,     -- 事前：是否已完成审批
  audit_status        text        NOT NULL DEFAULT 'pending'
                      CHECK (audit_status IN ('pending','pass','warn','reject_suggest')),
  issues              jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- 审核问题明细
  max_severity        text        NOT NULL DEFAULT 'none'
                      CHECK (max_severity IN ('none','low','medium','high')),
  audited_by          uuid REFERENCES iam.users(id),
  audited_at          timestamptz,

  los_days            numeric(5,1) NOT NULL DEFAULT 0,
  items               jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- 费用明细
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_settlement_period
  ON clinical.insurance_settlement (period_key);
CREATE INDEX IF NOT EXISTS idx_insurance_settlement_type
  ON clinical.insurance_settlement (settlement_type);
CREATE INDEX IF NOT EXISTS idx_insurance_settlement_audit
  ON clinical.insurance_settlement (audit_status);

DROP TRIGGER IF EXISTS trg_insurance_settlement_updated ON clinical.insurance_settlement;
CREATE TRIGGER trg_insurance_settlement_updated BEFORE UPDATE ON clinical.insurance_settlement
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE clinical.insurance_settlement IS
  'M179-C【护理院感医保药事】医保结算深化：门诊/住院/DRG/DIP + 事前/事中/事后审核 + 统筹基数与自费分列';

-- ----------------------------------------------------------------------------
-- 3) 拒付案件：原因 / 申诉 / 整改 / 追回 闭环
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.insurance_rejection (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         text        NOT NULL,                    -- 拒付案件号
  claim_id        text        NOT NULL,                    -- 关联申报单号
  period_key      text        NOT NULL DEFAULT '',
  reason          text        NOT NULL DEFAULT '',          -- 拒付原因
  amount          numeric(12,2) NOT NULL DEFAULT 0,        -- 拒付金额
  stage           text        NOT NULL DEFAULT 'rectification'
                  CHECK (stage IN ('appeal','rectification','recovered','closed')),
  appealed        boolean     NOT NULL DEFAULT false,     -- 是否已申诉
  recovered       boolean     NOT NULL DEFAULT false,     -- 是否已追回
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_rejection_claim
  ON clinical.insurance_rejection (claim_id);
CREATE INDEX IF NOT EXISTS idx_insurance_rejection_stage
  ON clinical.insurance_rejection (stage);

DROP TRIGGER IF EXISTS trg_insurance_rejection_updated ON clinical.insurance_rejection;
CREATE TRIGGER trg_insurance_rejection_updated BEFORE UPDATE ON clinical.insurance_rejection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE clinical.insurance_rejection IS
  'M179-C【护理院感医保药事】医保拒付管理：原因/申诉/整改/追回 闭环销号';

-- ----------------------------------------------------------------------------
-- 4) 权限点与角色授权（幂等）
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('insurance:deep:view', '医保管理深化查看', 'billing',
   '查看医保政策目录、费用三道防线审核、门诊/住院/DRG/DIP结算与拒付申诉整改追回（医保办/admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code = 'insurance:deep:view'
ON CONFLICT (role_code, permission_code) DO NOTHING;
