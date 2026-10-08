-- ============================================================================
-- 健澜科技 jlmedaios · M16-A 移动护理 PDA 执行端核心闭环
--
--  本迁移仅登记一个移动护理执行权限码并完成角色授权，不新建业务表、不加列：
--   - mobile_nursing:execute  护士/医师/管理员在 PDA（移动 H5/PWA）端执行
--     床旁扫码核对给药、体征采集、护理任务执行、评估量表、护理记录与交接班。
--
--  条码口径复用现有唯一号，不新增腕带字段：
--   - 患者腕带 = clinical.visits.visit_no（IP 前缀）；
--   - 标本条码 = clinical.lab_specimens.specimen_no（SM 前缀）；
--   - 药品条码 = clinical.drug_catalog.drug_code（D + 三位数字）。
--
--  医疗安全：AI 仅辅助评分/建议/语音录入，不自主开医嘱或护理措施；
--   给药须五重核对通过并经护士本人电子签名，高风险药双人核对；
--   权限码在应用层 ROLE_PERMISSIONS（userView.ts）同步授予 nurse/admin/doctor。
--
--  幂等：INSERT ... ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重复执行。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 权限码登记（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('mobile_nursing:execute', '移动护理 PDA 执行', 'clinical',
   'PDA 床旁扫码核对给药、体征采集、护理任务执行、评估量表、护理记录与交接班')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：护士为主，医师/管理员兜底
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'mobile_nursing:execute'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'nurse' AND permission_code = 'mobile_nursing:execute'
);

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'mobile_nursing:execute'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'doctor' AND permission_code = 'mobile_nursing:execute'
);

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'mobile_nursing:execute'
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions
  WHERE role_code = 'admin' AND permission_code = 'mobile_nursing:execute'
);
