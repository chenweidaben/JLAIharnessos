-- 健澜科技 jlmedaios：补齐权限种子（数据库重建后仅种入23个权限，前端菜单被RBAC过滤）
-- 本迁移幂等：INSERT ... ON CONFLICT DO NOTHING
-- Copyright (c) 2026 杭州健澜科技有限公司

-- 1. 补齐权限码（与 src/bff/permissions.ts 常量对齐）
INSERT INTO iam.permissions (code, name, description, module, created_at)
SELECT * FROM (VALUES
  ('dashboard:view',        '工作台查看',   '查看工作台首页',                    'dashboard', now()),
  ('patient:view',          '患者查看',     '查看患者列表与360视图',              'patient',   now()),
  ('emr:view',              '病历查看',     '查看门诊病历与文书',                 'emr',       now()),
  ('emr:write',             '病历书写',     '书写门诊病历',                       'emr',       now()),
  ('order:view',            '医嘱查看',     '查看住院医嘱',                       'order',     now()),
  ('emg:view',              '急诊分诊查看', '查看急诊分诊台/候诊/抢救/留观队列',  'emergency', now()),
  ('imaging:view',          '影像查看',     '查看影像AI结果/目录/任务',           'imaging',   now()),
  ('imaging:ai:analyze',    '影像AI分析',   '提交影像AI分析任务',                 'imaging',   now()),
  ('imaging:ai:review',     '影像AI复核',   '放射科医师复核签名',                 'imaging',   now()),
  ('ai:chat:use',           'AI问诊使用',   '使用AI问诊/智能体',                  'agent',     now()),
  ('system:config',         '系统配置',     '系统配置管理',                       'system',    now()),
  ('system:user:view',      '用户查看',     '查看用户管理',                       'system',    now()),
  ('system:role:view',      '角色查看',     '查看角色管理',                       'system',    now()),
  ('system:perm:manage',    '权限管理',     '权限管理',                           'system',    now()),
  ('system:audit:view',     '审计查看',     '查看操作审计',                       'system',    now()),
  ('system:loginlog:view',  '登录日志查看', '查看登录日志',                       'system',    now()),
  ('qc:view',               '质量查看',     '查看质量管理',                       'quality',   now()),
  ('ops:view',              '运营查看',     '查看科室运营',                       'operation', now())
) AS v(code, name, description, module, created_at)
WHERE NOT EXISTS (SELECT 1 FROM iam.permissions p WHERE p.code = v.code);

-- 2. 补齐 admin 角色授权（管理类 + 全部业务权限；与 src/bff/view/userView.ts ROLE_PERMISSIONS 对齐）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', p.code
FROM iam.permissions p
WHERE p.code IN (
  'system:admin','system:user:view','system:role:view','system:perm:manage',
  'system:audit:view','system:loginlog:view','system:config',
  'dashboard:view','patient:view','report:view',
  'medical_record:read','medical_record:write','medical_record:audit',
  'front_page:read','front_page:code','front_page:audit',
  'billing:read','billing:charge','billing:refund',
  'order:write','order:view','prescription:write','prescription:review',
  'lab:read','imaging:read','imaging:view',
  'agent:build','agent:publish','knowledge:manage',
  'ai:chat:use','qc:view','ops:view',
  'inpatient:view','inpatient:admit','inpatient:manage',
  'inpatient:discharge','inpatient:bed:manage',
  'emergency:view','emergency:triage','emergency:green_channel',
  'emergency:resuscitation','emergency:observation','emergency:disposition',
  'emr:view','emr:write','emg:view',
  'ward_round:write','ward_round:countersign',
  'nursing:record','nursing:task',
  'inpatient_order:write','inpatient_order:review','inpatient_order:administer',
  'pharmacy:view','pharmacy:review','pharmacy:dispense',
  'inventory:view','cds:override'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 3. 补齐 doctor 角色授权（临床相关）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', p.code
FROM iam.permissions p
WHERE p.code IN (
  'dashboard:view','patient:view',
  'medical_record:read','medical_record:write','medical_record:audit',
  'front_page:read','front_page:audit','billing:read',
  'order:write','order:view','prescription:write',
  'lab:read','imaging:read','imaging:view',
  'report:view','agent:build','agent:publish','knowledge:manage',
  'ai:chat:use',
  'inpatient:view','inpatient:admit','inpatient:manage',
  'inpatient:discharge','inpatient:bed:manage',
  'emergency:view','emergency:triage','emergency:green_channel',
  'emergency:resuscitation','emergency:observation','emergency:disposition',
  'emr:view','emr:write','emg:view',
  'ward_round:write','ward_round:countersign',
  'inpatient_order:write','inpatient_order:review',
  'cds:override'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 4. 补齐 nurse 角色授权（护理相关）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', p.code
FROM iam.permissions p
WHERE p.code IN (
  'dashboard:view','patient:view',
  'medical_record:read','lab:read','order:write','order:view','emg:view',
  'inpatient:view','inpatient:admit','inpatient:manage','inpatient:bed:manage',
  'emergency:view','emergency:triage','emergency:green_channel',
  'emergency:resuscitation','emergency:observation',
  'nursing:record','nursing:task','inpatient_order:administer',
  'inventory:view','billing:read'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 5. 补齐 pharmacist 角色授权（药房相关）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'pharmacist', p.code
FROM iam.permissions p
WHERE p.code IN (
  'dashboard:view','patient:view',
  'prescription:review','prescription:write',
  'medical_record:read','lab:read','report:view',
  'pharmacy:view','pharmacy:review','pharmacy:dispense','inventory:view',
  'billing:read'
)
ON CONFLICT (role_code, permission_code) DO NOTHING;
