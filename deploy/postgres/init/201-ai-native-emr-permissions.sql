-- ============================================================================
-- 健澜科技 jlmedaios - M88 AI 原生五剑客 + M87-C/D EMR 缺口权限补齐
--
-- 背景：M88-A~E / M87-C / M87-D 后端 aggregator 已通过
--   view.permissions.includes('...') 强校验，但对应权限码此前只在 aggregator 内
--   引用、未注册进 iam.permissions / userView.ts 硬编码表，导致全角色 403。
--   本迁移幂等补齐权限字典与角色授予（ON CONFLICT DO NOTHING）。
--
-- 医疗安全红线：critical 级 AI 建议必须人在回路（human-in-the-loop），
--   生成/审核/豁免类写权限仅授予医生与管理员；护士仅授查看类。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 权限字典（module 统一 emr）
INSERT INTO iam.permissions(code, name, module) VALUES
  ('ai_note:generate',     'AI病历草稿生成',     'emr'),
  ('ai_note:review',       'AI病历草稿审核',     'emr'),
  ('med_review:view',      '合理用药审查查看',   'emr'),
  ('med_review:override',  '合理用药审查豁免',   'emr'),
  ('ai_diagnosis:view',    'AI鉴别诊断查看',     'emr'),
  ('ai_pathway:view',      'AI临床路径推荐查看', 'emr'),
  ('ai_los_pred:view',     'AI住院天数费用预测查看', 'emr'),
  ('timeliness:view',      '文书时效监控查看',   'emr'),
  ('timeliness:alert',     '文书逾期预警',       'emr'),
  ('emr_assessment:view',  '病历评级自评查看',   'emr')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：admin/doctor 全套；pharmacist 合理用药审查类；nurse 仅查看类
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',  'ai_note:generate'),
  ('admin',  'ai_note:review'),
  ('admin',  'med_review:view'),
  ('admin',  'med_review:override'),
  ('admin',  'ai_diagnosis:view'),
  ('admin',  'ai_pathway:view'),
  ('admin',  'ai_los_pred:view'),
  ('admin',  'timeliness:view'),
  ('admin',  'timeliness:alert'),
  ('admin',  'emr_assessment:view'),
  ('doctor', 'ai_note:generate'),
  ('doctor', 'ai_note:review'),
  ('doctor', 'med_review:view'),
  ('doctor', 'med_review:override'),
  ('doctor', 'ai_diagnosis:view'),
  ('doctor', 'ai_pathway:view'),
  ('doctor', 'ai_los_pred:view'),
  ('doctor', 'timeliness:view'),
  ('doctor', 'timeliness:alert'),
  ('doctor', 'emr_assessment:view'),
  ('pharmacist', 'med_review:view'),
  ('pharmacist', 'med_review:override'),
  ('nurse',  'med_review:view'),
  ('nurse',  'timeliness:view')
ON CONFLICT DO NOTHING;
