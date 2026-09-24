-- ============================================================================
-- 健澜科技 jlmedaios - 门诊演示患者与今日就诊（心血管内科）
-- 37-seed-outpatient-demo.sql
--
-- 为门诊工作台提供"已建档、可信、脱敏"的心血管门诊患者及其今日就诊，使
-- 候诊队列 → 问诊 → 病历/诊断/医嘱/处方全链路可在真实库上演示。
-- 幂等：患者按 mrn 冲突更新；当日同科室就诊已存在则不重复创建。
--
-- 说明：均为虚构演示患者，标识已脱敏；院方上线前应清空演示数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- 患者（mrn 唯一）
INSERT INTO clinical.patients
  (mrn, name_masked, gender, birth_date, blood_type, allergies, past_history, tags, data_level)
VALUES
  ('PAT-DEMO-001','张*','男',DATE '1964-03-12','A',
   '[]'::jsonb,
   '[{"disease":"冠状动脉粥样硬化性心脏病","since":"2019"},{"disease":"原发性高血压","since":"2015"}]'::jsonb,
   '["冠心病","随访"]'::jsonb, 3),
  ('PAT-DEMO-002','李*','女',DATE '1958-07-25','O',
   '[{"substance":"青霉素","reaction":"皮疹","severity":"medium"}]'::jsonb,
   '[{"disease":"原发性高血压","since":"2010"},{"disease":"2 型糖尿病","since":"2016"}]'::jsonb,
   '["高血压","糖尿病"]'::jsonb, 3),
  ('PAT-DEMO-003','王*','男',DATE '1971-11-02','B',
   '[]'::jsonb,
   '[{"disease":"心房颤动","since":"2022"}]'::jsonb,
   '["房颤"]'::jsonb, 3),
  ('PAT-DEMO-004','赵*','女',DATE '1978-05-19','AB',
   '[]'::jsonb,
   '[{"disease":"原发性高血压","since":"2020"}]'::jsonb,
   '["高血压"]'::jsonb, 3),
  ('PAT-DEMO-005','刘*','男',DATE '1954-09-30','A',
   '[{"substance":"磺胺类","reaction":"瘙痒","severity":"low"}]'::jsonb,
   '[{"disease":"冠状动脉粥样硬化性心脏病","since":"2012"},{"disease":"2 型糖尿病","since":"2014"}]'::jsonb,
   '["冠心病","糖尿病","高危"]'::jsonb, 3),
  ('PAT-DEMO-006','陈*','女',DATE '1991-02-08','O',
   '[]'::jsonb,
   '[]'::jsonb,
   '["心悸待查"]'::jsonb, 3)
ON CONFLICT (mrn) DO UPDATE
  SET name_masked = EXCLUDED.name_masked,
      gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date,
      blood_type = EXCLUDED.blood_type,
      allergies = EXCLUDED.allergies,
      past_history = EXCLUDED.past_history,
      tags = EXCLUDED.tags;

-- 今日心血管内科就诊（挂到 doctor_chen；当日已存在则跳过）
INSERT INTO clinical.visits
  (patient_id, visit_no, visit_type, department, attending_doctor_id, chief_complaint, admit_at)
SELECT p.id,
       'OP' || to_char(CURRENT_DATE,'YYYYMMDD') ||
         SUBSTRING(p.mrn FROM '[0-9]+'),
       'outpatient','心血管内科',
       (SELECT id FROM iam.users WHERE username='doctor_chen'),
       CASE p.mrn
         WHEN 'PAT-DEMO-001' THEN '反复胸闷胸痛 1 周，加重 1 天'
         WHEN 'PAT-DEMO-002' THEN '活动后气促、双下肢水肿 2 周'
         WHEN 'PAT-DEMO-003' THEN '反复心悸 3 天'
         WHEN 'PAT-DEMO-004' THEN '头晕、头痛半月'
         WHEN 'PAT-DEMO-005' THEN '胸痛再发 2 小时'
         WHEN 'PAT-DEMO-006' THEN '阵发性心悸 1 月' END,
       -- 到达时间按号次回退 6 分钟，形成不同候诊时长；
       -- GREATEST 钳制到当日 00:00，避免刚过午夜执行时回退到前一天导致当日队列为空。
       GREATEST(
         now() - (SUBSTRING(p.mrn FROM '[0-9]+')::int * INTERVAL '6 minutes'),
         CURRENT_DATE::timestamptz
       )
FROM clinical.patients p
WHERE p.mrn LIKE 'PAT-DEMO-%'
  AND NOT EXISTS (
    SELECT 1 FROM clinical.visits v
    WHERE v.patient_id = p.id AND v.department = '心血管内科'
      AND v.admit_at::date = CURRENT_DATE
  );
