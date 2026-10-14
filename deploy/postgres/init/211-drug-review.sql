-- 合理用药实时审查（AI 第八剑客）：权限码注册
-- 健澜科技 jlmedaios
INSERT INTO iam.permissions(code, name, module) VALUES
  ('drug_review:view', '合理用药实时审查', 'emr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor','drug_review:view'), ('admin','drug_review:view')
ON CONFLICT DO NOTHING;
