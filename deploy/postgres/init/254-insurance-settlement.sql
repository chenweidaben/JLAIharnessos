-- ============================================================================
-- 健澜科技 jlmedaios · M130-C 医保结算智能审核（事后结算 · 建议级）
-- 核心业务深化：审核结果为「建议」，由医保办人工确认后调整，不直接拒付。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 结算审核记录：保存一次 reviewInsuranceSettlement 的费用测算与建议项。
-- issues 以 jsonb 落库（ReviewIssue[]），status 跟踪人工确认状态。
CREATE TABLE IF NOT EXISTS clinical.insurance_review (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   text,                                   -- 业务结算号（可空，演示级）
  patient_id      uuid,                                   -- 患者标识（PII 由应用层脱敏）
  total_amount    numeric NOT NULL DEFAULT 0,             -- 总金额（元）
  insurance_base  numeric NOT NULL DEFAULT 0,             -- 统筹纳入基数（元）
  self_pay_amount numeric NOT NULL DEFAULT 0,             -- 自费金额（元）
  self_pay_ratio  numeric NOT NULL DEFAULT 0,             -- 自费占比（0~1）
  issue_count      int     NOT NULL DEFAULT 0,             -- 建议项数量
  max_severity    text    NOT NULL DEFAULT 'none',        -- low/medium/high/none
  issues          jsonb   NOT NULL DEFAULT '[]'::jsonb,  -- ReviewIssue[]
  status          text    NOT NULL DEFAULT 'suggested'
                  CHECK (status IN ('suggested','confirmed','adjusted','dismissed')),
  reviewer_note   text,                                   -- 医保办人工备注
  confirmed_by    uuid,                                   -- 人工确认人
  confirmed_at    timestamptz,                            -- 人工确认时间
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 常用查询索引：按结算号、按确认状态检索
CREATE INDEX IF NOT EXISTS idx_insurance_review_settlement
  ON clinical.insurance_review (settlement_id);
CREATE INDEX IF NOT EXISTS idx_insurance_review_status
  ON clinical.insurance_review (status);

-- 权限码（幂等）
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('insurance_review:review', '医保结算智能审核（建议级）', 'operations',
   '医保办对已结算单据跑甲乙丙分类/目录匹配/自费占比/重复收费/超标准收费审核，结果为建议，需人工确认')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）：仅 admin（医保办管理员）可发起审核与确认
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, 'insurance_review:review' FROM (VALUES ('admin')) AS r(role_code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp
  WHERE rp.permission_code = 'insurance_review:review' AND rp.role_code = r.role_code
);
