-- ============================================================================
-- 健澜科技 jlmedaios · M10-B 临床用血质量闭环
--
--  在 M10-A 输血全流程之上，补齐《医疗机构临床用血管理办法》与三甲等级评审
--  要求的用血质量闭环：
--   - clinical.transfusion_efficacy_assessments 输血疗效评估：
--       输注完成后对比输注前后指标，红细胞看 Hb、血小板看 PLT、血浆看 INR、
--       冷沉淀看纤维蛋白原，自动计算实际增量并对照预期增量分级。
--   - clinical.blood_utilization_reviews 用血合理性评价：
--       严格判定申请指征是否真正命中阈值、剂量是否合理、输血前检测是否完整，
--       给出合理/基本合理/不合理结论，问题清单留痕。
--   - 质控指标如成分输血率、适应证合格率、输血前检测率、不良反应率、疗效评估率
--       由应用层实时聚合，不在此冗余建表。
--   - 权限码：blood:assess 疗效评估，blood:audit 用血合理性评价与质控指标。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.transfusion_efficacy_assessments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfusion_id uuid NOT NULL REFERENCES clinical.blood_transfusions(id) ON DELETE CASCADE,
  request_id     uuid NOT NULL REFERENCES clinical.blood_transfusion_requests(id),
  visit_id       uuid NOT NULL,
  patient_id     uuid NOT NULL,
  assessed_by    uuid REFERENCES iam.users(id),
  component      text NOT NULL,
  -- 输注前/后指标值与计量单位
  pre_metric     numeric,
  post_metric    numeric,
  metric_unit    text,
  -- 预期增量与实际增量
  expected_delta numeric,
  actual_delta   numeric,
  -- 疗效分级：effective 显效 / partial 有效 / ineffective 无效 / indeterminate 无法判定
  efficacy_grade text NOT NULL DEFAULT 'indeterminate',
  -- 关联的输注前后检验结果
  pre_result_id  uuid,
  post_result_id uuid,
  note           text,
  assessed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transfusion_id)
);

CREATE INDEX IF NOT EXISTS idx_eff_grade ON clinical.transfusion_efficacy_assessments(efficacy_grade, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_eff_patient ON clinical.transfusion_efficacy_assessments(patient_id);

CREATE TABLE IF NOT EXISTS clinical.blood_utilization_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid NOT NULL UNIQUE REFERENCES clinical.blood_transfusion_requests(id),
  visit_id            uuid NOT NULL,
  patient_id          uuid NOT NULL,
  reviewed_by         uuid REFERENCES iam.users(id),
  -- 三项合规判定
  indication_compliant boolean NOT NULL DEFAULT false,
  dosage_compliant     boolean NOT NULL DEFAULT true,
  pre_test_complete    boolean NOT NULL DEFAULT false,
  -- 疗效分级快照，便于评审追溯
  efficacy_grade       text,
  -- 结论：rational 合理 / largely 基本合理 / irrational 不合理
  conclusion          text NOT NULL DEFAULT 'largely',
  issues              jsonb NOT NULL DEFAULT '[]'::jsonb,
  conclusion_note     text,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_util_conclusion ON clinical.blood_utilization_reviews(conclusion, reviewed_at DESC);

INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('blood:assess', '输血疗效评估', 'clinical', '对比输注前后指标评估输血疗效'),
  ('blood:audit',  '用血合理性评价', 'clinical', '用血合理性评价与质控指标看板')
ON CONFLICT (code) DO NOTHING;

-- admin 两项
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:assess' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:assess');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'blood:audit' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='blood:audit');
-- 医师评估本人患者疗效
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'blood:assess' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='blood:assess');
-- 输血科技师：疗效评估与合理性评价
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'blood:assess' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='blood:assess');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'blood:audit' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='blood:audit');
