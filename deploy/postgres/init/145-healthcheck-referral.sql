-- ============================================================================
-- 健澜科技 jlmedaios · M40-B 体检异常项门诊转诊建议
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.healthcheck_referrals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES clinical.health_check_orders(id),
  abnormal_item       text NOT NULL,
  finding_detail      text,
  suggested_department text NOT NULL,
  appointment_status  text NOT NULL DEFAULT 'recommended' CHECK (appointment_status IN ('recommended','booked','dismissed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hc_referrals_order ON clinical.healthcheck_referrals(order_id);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('healthcheck:referral', '体检异常转诊', 'healthcheck', '异常项转门诊建议/dismiss（admin）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r, p FROM (
  VALUES ('admin','healthcheck:referral'),('doctor','healthcheck:referral')
) AS t(r,p)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code=t.r AND rp.permission_code=t.p
);
