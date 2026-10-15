-- ============================================================================
-- 健澜科技 jlmedaios - 门诊医生工作台「越用越懂医生」偏好自学习
--
-- 依据宪法第四章（医生工作台智能化）：系统从医生历史门诊医嘱中自学习其
--   常用药品 TOP5、常用检查检验 TOP5、常用临床路径，并沉淀平均就诊时长与
--   累计学习次数，使工作台随使用时间推移越来越贴合该医生的开方习惯。
--
-- 表结构：
--   doctor_id           医生（iam.users.id）院内脱敏标识，主键
--   preferred_drugs     jsonb：常用药品偏好 [{name,count,category}]
--   preferred_exams     jsonb：常用检查检验偏好 [{name,count,category}]
--   common_pathways     jsonb：常用临床路径偏好 [{name,count}]
--   avg_visit_minutes   numeric：平均单次门诊时长（分钟）
--   visit_count         int：累计学习（刷新）次数
--   updated_at          timestamptz：最近一次学习时间
--
-- 隐私红线：本表只存「药品/检查/路径」级聚合权重，严禁落患者姓名、
--   身份证号等直接标识符；医生本人仅可见/触发本人记录。
--
-- 权限：medmuse:view（查看医生偏好），仅授予医生 / 护士 / 药师 / 管理员，
--   Agent 服务账号不授予。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

CREATE TABLE IF NOT EXISTS medmuse.doctor_preference (
  doctor_id           text PRIMARY KEY,
  preferred_drugs     jsonb,
  preferred_exams     jsonb,
  common_pathways     jsonb,
  avg_visit_minutes  numeric,
  visit_count         int DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);

-- 按最近学习时间倒序，加速「长期未刷新偏好」巡检
CREATE INDEX IF NOT EXISTS idx_doctor_preference_updated
  ON medmuse.doctor_preference (updated_at DESC);

-- 权限字典（module 统一 medmuse；medmuse:view 已由 223 号文件登记，这里幂等兜底）
INSERT INTO iam.permissions(code, name, module) VALUES
  ('medmuse:view', '医生工作台偏好查看', 'medmuse')
ON CONFLICT (code) DO NOTHING;

-- 角色授予：医生 / 护士 / 药师 / 管理员可查看；患者与 Agent 服务账号不授予
INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin',      'medmuse:view'),
  ('doctor',     'medmuse:view'),
  ('nurse',      'medmuse:view'),
  ('pharmacist', 'medmuse:view')
ON CONFLICT DO NOTHING;
