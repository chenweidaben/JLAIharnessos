-- ============================================================================
-- 健澜科技 jlmedaios - 急诊当日队列与绿色通道示范种子（M1-B1）
-- 41-seed-emergency-demo.sql
--
-- 为急诊分诊台/候诊队列/绿色通道/抢救室/留观区提供“真实落库、脱敏、可信”的主数据：
--   - 急诊医护：doctor_li（急诊科主任医师，DataScope 科室，可下转归）、
--               nurse_ma（急诊科主管护师，DataScope 科室，无转归权）；
--   - 8 位急诊患者，覆盖：
--       * 2 位待分诊（waiting_triage）；
--       * I 级濒危（抢救中，active resuscitation）；
--       * II 级危重（卒中绿色通道进行中，含 DCT 已达标、DNT 倒计时）；
--       * III 级急症（候诊 + 留观各一）；
--       * IV 级非急症（候诊）；
--       * 1 例 STEMI 胸痛绿色通道【完整时间链】（已完成，DB=75min，急诊收入 CCU）。
--
-- 号段：visit ER / triage FN / channel GC / resus RS / obs OB，均取序列
--   clinical.emergency_triage_no_seq；triage_no 由 visit_no 数值部分派生，同值不重号。
--
-- 幂等：全部以 mrn + NOT EXISTS（急诊就诊/分诊/通道/抢救/留观/转归）守卫，可重复执行。
--
-- 说明：均为虚构演示患者，标识已脱敏；院方上线前应清空演示数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 急诊医护
-- ---------------------------------------------------------------------------
INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES
  ('doctor_li', '李医生', 'DOC4001', '急诊科', '主任医师',   'doctor', 'active'),
  ('nurse_ma',  '马护士', 'NUR4001', '急诊科', '主管护师',   'nurse',  'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name, employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department, title = EXCLUDED.title,
      role = EXCLUDED.role, status = 'active', deleted_at = NULL;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'doctor', 'department', '急诊科'
FROM iam.users u WHERE u.username = 'doctor_li'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '急诊科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'nurse', 'department', '急诊科'
FROM iam.users u WHERE u.username = 'nurse_ma'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '急诊科';

-- ---------------------------------------------------------------------------
-- 急诊患者主索引（脱敏）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.patients
  (mrn, name_masked, gender, birth_date, blood_type, allergies, past_history, tags, data_level)
VALUES
  ('PAT-ER-001','周*强','男',DATE '1983-04-02','A','[]'::jsonb,'[]'::jsonb,'["急诊"]'::jsonb,3),
  ('PAT-ER-002','吴*娟','女',DATE '1990-11-18','O','[]'::jsonb,'[]'::jsonb,'["急诊","发热"]'::jsonb,3),
  ('PAT-ER-003','郑*林','男',DATE '1957-07-25','AB',
    '[{"substance":"阿司匹林","reaction":"牙龈出血","severity":"low"}]'::jsonb,
    '[{"disease":"高血压","since":"2010"},{"disease":"房颤","since":"2019"}]'::jsonb,'["急诊","卒中","绿色通道"]'::jsonb,3),
  ('PAT-ER-004','王*峰','男',DATE '1972-01-09','B','[]'::jsonb,
    '[{"disease":"冠心病","since":"2015"}]'::jsonb,'["急诊","濒危","抢救"]'::jsonb,3),
  ('PAT-ER-005','陈*芳','女',DATE '1986-09-30','O','[]'::jsonb,'[]'::jsonb,'["急诊"]'::jsonb,3),
  ('PAT-ER-006','林*浩','男',DATE '1995-03-14','A','[]'::jsonb,'[]'::jsonb,'["急诊"]'::jsonb,3),
  ('PAT-ER-007','黄*丽','女',DATE '1989-12-02','B','[]'::jsonb,
    '[{"disease":"支气管哮喘","since":"2008"}]'::jsonb,'["急诊","留观"]'::jsonb,3),
  ('PAT-ER-008','赵*民','男',DATE '1965-06-21','A','[]'::jsonb,
    '[{"disease":"2型糖尿病","since":"2018"},{"disease":"冠心病","since":"2016"}]'::jsonb,'["急诊","胸痛","绿色通道","已入院"]'::jsonb,3)
ON CONFLICT (mrn) DO UPDATE
  SET name_masked = EXCLUDED.name_masked, gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date, blood_type = EXCLUDED.blood_type,
      allergies = EXCLUDED.allergies, past_history = EXCLUDED.past_history,
      tags = EXCLUDED.tags;

-- ---------------------------------------------------------------------------
-- 急诊计划临时表（时间以“多少分钟前”表达；NULL 表示尚未发生/未记录）
--   arrive_ago 到达；triage_ago 完成分诊；level I–IV；em_status 主状态。
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_er_plan (
  mrn text, chief text, arrive_ago int, triage_ago int,
  level int, news int,
  gcs_e int, gcs_v int, gcs_m int, gcs_t int,
  vitals jsonb, stroke jsonb, basis text, em_status text, gc_active boolean
) ON COMMIT DROP;

INSERT INTO tmp_er_plan VALUES
  ('PAT-ER-001','胸痛、胸闷半小时', 5, NULL, NULL, NULL,
   NULL,NULL,NULL,NULL,
   '{}'::jsonb, '{}'::jsonb, NULL, 'waiting_triage', false),
  ('PAT-ER-002','发热、咳嗽2天', 12, NULL, NULL, NULL,
   NULL,NULL,NULL,NULL,
   '{}'::jsonb, '{}'::jsonb, NULL, 'waiting_triage', false),
  ('PAT-ER-003','突发口角歪斜、右侧肢体无力', 35, 32, 2, 1,
   4,5,6,15,
   '{"temperature":36.7,"pulse":88,"respiration":18,"systolic":172,"diastolic":98,"spo2":97,"consciousness":"alert","painScore":0}'::jsonb,
   '{"fast":{"face":true,"arm":true,"speech":true,"positive":true},"lams":{"face":1,"arm":2,"grip":1,"total":4}}'::jsonb,
   'FAST阳性、LAMS 4分，高度提示大血管闭塞；头颅CT已完成，启动卒中绿色通道',
   'in_treatment', true),
  ('PAT-ER-004','突发意识丧失、抽搐', 18, 16, 1, 11,
   2,1,2,5,
   '{"temperature":36.2,"pulse":0,"respiration":6,"systolic":60,"diastolic":30,"spo2":80,"consciousness":"unresponsive","painScore":null}'::jsonb,
   '{}'::jsonb,
   '意识丧失、颈动脉搏动消失、叹息样呼吸，NEWS2 11分、GCS 5分，符合 I 级濒危，立即抢救',
   'resuscitation', false),
  ('PAT-ER-005','持续性下腹痛6小时', 25, 19, 3, 0,
   NULL,NULL,NULL,NULL,
   '{"temperature":37.1,"pulse":92,"respiration":19,"systolic":128,"diastolic":80,"spo2":98,"consciousness":"alert","painScore":6}'::jsonb,
   '{}'::jsonb,
   '生命体征平稳、神志清楚，急性腹痛 III 级急症',
   'triaged', false),
  ('PAT-ER-006','左手轻微擦伤', 40, 30, 4, 0,
   NULL,NULL,NULL,NULL,
   '{"temperature":36.7,"pulse":80,"respiration":17,"systolic":120,"diastolic":76,"spo2":99,"consciousness":"alert","painScore":1}'::jsonb,
   '{}'::jsonb,
   '生命体征平稳、轻微软组织损伤，IV 级非急症',
   'triaged', false),
  ('PAT-ER-007','喘息、呼吸困难加重', 180, 175, 3, 6,
   NULL,NULL,NULL,NULL,
   '{"temperature":36.8,"pulse":110,"respiration":26,"systolic":126,"diastolic":82,"spo2":93,"consciousness":"alert","painScore":2,"supplementalO2":true}'::jsonb,
   '{}'::jsonb,
   '哮喘急性发作、呼吸急促、SpO2 93%（吸氧中），III 级急症，予留观处理',
   'observation', false),
  ('PAT-ER-008','持续胸痛2小时、大汗', 360, 358, 2, 2,
   NULL,NULL,NULL,NULL,
   '{"temperature":36.5,"pulse":104,"respiration":20,"systolic":150,"diastolic":90,"spo2":95,"consciousness":"alert","painScore":8}'::jsonb,
   '{}'::jsonb,
   'STEMI：首份心电图示II、III、aVF导联ST段抬高，启动胸痛绿色通道，急诊PCI后转CCU',
   'admitted', false);

-- ---------------------------------------------------------------------------
-- 建急诊就诊（仅为缺少急诊就诊的患者；visit_no 取序列）
--   急诊区内 visit.status=waiting；已入院（008）映射为 transferred。
-- ---------------------------------------------------------------------------
INSERT INTO clinical.visits
  (visit_no, patient_id, visit_type, department, attending_doctor_id,
   chief_complaint, status, admit_at, campus_id)
SELECT 'ER' || nextval('clinical.emergency_triage_no_seq'),
       p.id, 'emergency', '急诊科', NULL,
       pl.chief,
       CASE WHEN pl.em_status = 'admitted' THEN 'transferred' ELSE 'waiting' END,
       now() - (pl.arrive_ago || ' minutes')::interval,
       (SELECT id FROM clinical.campuses WHERE code = 'CAMP-MAIN')
FROM tmp_er_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.visits v
  WHERE v.patient_id = p.id AND v.visit_type = 'emergency'
);

-- ---------------------------------------------------------------------------
-- 建急诊分诊记录（仅为缺少分诊记录的急诊就诊）
--   triage_no 由 visit_no 数值部分派生（FN），与 ER 同值，不重号。
-- ---------------------------------------------------------------------------
INSERT INTO clinical.emergency_triage (
  triage_no, visit_id, patient_id, triage_nurse_id, arrive_time, triage_time,
  chief_complaint, vitals, gcs_eye, gcs_verbal, gcs_motor, gcs_total,
  news_score, stroke_scale, level, rule_suggested_level, basis,
  confirmed, green_channel_active, em_status
)
SELECT 'FN' || substring(v.visit_no FROM 3),
       v.id, v.patient_id,
       CASE WHEN pl.level IS NOT NULL THEN n.id ELSE NULL END,
       v.admit_at,
       CASE WHEN pl.triage_ago IS NOT NULL
            THEN now() - (pl.triage_ago || ' minutes')::interval ELSE NULL END,
       pl.chief, pl.vitals,
       pl.gcs_e, pl.gcs_v, pl.gcs_m, pl.gcs_t,
       pl.news, pl.stroke, pl.level,
       CASE WHEN pl.level IS NOT NULL THEN pl.level ELSE NULL END,
       pl.basis,
       pl.level IS NOT NULL, pl.gc_active, pl.em_status
FROM tmp_er_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
JOIN clinical.visits v ON v.patient_id = p.id AND v.visit_type = 'emergency'
LEFT JOIN iam.users n ON n.username = 'nurse_ma'
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.emergency_triage t WHERE t.visit_id = v.id
);

-- ---------------------------------------------------------------------------
-- 稳定映射临时表（mrn → 急诊就诊/分诊），供通道/抢救/留观/转归使用
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_er_map ON COMMIT DROP AS
SELECT pl.mrn, v.id AS visit_id, t.patient_id, t.id AS triage_id,
       t.arrive_time, t.em_status
FROM tmp_er_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
JOIN clinical.visits v ON v.patient_id = p.id AND v.visit_type = 'emergency'
JOIN clinical.emergency_triage t ON t.visit_id = v.id;

-- ===========================================================================
-- 绿色通道
-- ===========================================================================

-- 通道头计划（activate_ago/end_ago 为“分钟前”）
CREATE TEMP TABLE tmp_er_gc_plan (
  mrn text, gctype text, subtype text, status text,
  activate_ago int, end_ago int, outcome text, quality text
) ON COMMIT DROP;

INSERT INTO tmp_er_gc_plan VALUES
  ('PAT-ER-003','stroke','急性缺血性卒中','active', 32, NULL, NULL, NULL),
  ('PAT-ER-008','chest_pain','STEMI','completed', 358, 240,
   '急诊PCI成功、血流恢复TIMI 3级，转心血管内科CCU继续治疗',
   '首份心电图8min、肌钙蛋白18min、DB 75min，关键节点均达标');

-- 通道头
INSERT INTO clinical.green_channels (
  channel_no, visit_id, patient_id, type, subtype, status,
  arrive_time, activate_time, end_time, notified_teams, outcome, quality_note
)
SELECT 'GC' || nextval('clinical.emergency_triage_no_seq'),
       m.visit_id, m.patient_id, g.gctype, g.subtype, g.status,
       m.arrive_time,
       now() - (g.activate_ago || ' minutes')::interval,
       CASE WHEN g.end_ago IS NOT NULL
            THEN now() - (g.end_ago || ' minutes')::interval ELSE NULL END,
       CASE g.gctype
         WHEN 'stroke' THEN '["神经内科","影像科(CT)","检验科","导管室"]'::jsonb
         WHEN 'chest_pain' THEN '["心血管内科","导管室","检验科","影像科"]'::jsonb
         ELSE '[]'::jsonb END,
       g.outcome, g.quality
FROM tmp_er_gc_plan g
JOIN tmp_er_map m ON m.mrn = g.mrn
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.green_channels c WHERE c.visit_id = m.visit_id
);

-- 通道映射（mrn → channel_id）
CREATE TEMP TABLE tmp_er_gc ON COMMIT DROP AS
SELECT c.id AS channel_id, c.visit_id, c.arrive_time, m.mrn
FROM clinical.green_channels c
JOIN tmp_er_map m ON m.visit_id = c.visit_id;

-- 节点计划（actual_ago 为“分钟前”，NULL = 未完成）
CREATE TEMP TABLE tmp_er_gc_nodes (
  mrn text, node_key text, label text, target_min int, sort int, actual_ago int
) ON COMMIT DROP;

INSERT INTO tmp_er_gc_nodes VALUES
  -- 003 卒中（进行中）：CT/化验/同意已完成，溶栓（DNT）与取栓待完成
  ('PAT-ER-003','arrive','到达急诊',0,0,35),
  ('PAT-ER-003','activate','启动绿色通道',0,1,32),
  ('PAT-ER-003','ct_scan','完成头颅CT（DCT）',25,2,15),
  ('PAT-ER-003','labs','凝血/血常规/血糖回报',25,3,13),
  ('PAT-ER-003','family_consent','家属知情同意',45,4,5),
  ('PAT-ER-003','thrombolysis','静脉溶栓（DNT）',60,5,NULL),
  ('PAT-ER-003','intervention','血管内治疗/取栓',90,6,NULL),
  ('PAT-ER-003','transfer_ward','转专科病房',120,7,NULL),
  -- 008 胸痛 STEMI（完整时间链，全部完成）
  ('PAT-ER-008','arrive','到达急诊',0,0,360),
  ('PAT-ER-008','activate','启动绿色通道',0,1,358),
  ('PAT-ER-008','ecg','首份心电图',10,2,352),
  ('PAT-ER-008','troponin','肌钙蛋白结果',20,3,342),
  ('PAT-ER-008','dual_antiplatelet','双联抗血小板负荷',30,4,333),
  ('PAT-ER-008','pci','球囊扩张/PCI（DB）',90,5,285),
  ('PAT-ER-008','transfer_ccu','转CCU',120,6,245);

INSERT INTO clinical.green_channel_nodes
  (channel_id, node_key, label, target_minutes, actual_time, sort_order)
SELECT g.channel_id, n.node_key, n.label, n.target_min,
       CASE WHEN n.actual_ago IS NOT NULL
            THEN now() - (n.actual_ago || ' minutes')::interval ELSE NULL END,
       n.sort
FROM tmp_er_gc_nodes n
JOIN tmp_er_gc g ON g.mrn = n.mrn
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.green_channel_nodes x
  WHERE x.channel_id = g.channel_id AND x.node_key = n.node_key
);

-- 由节点实际时间回填关键质控指标（DCT/DNT/DB），保证与时间链一致
UPDATE clinical.green_channels c SET
  dct_minutes = sub.dct,
  dnt_minutes = sub.dnt,
  dbn_minutes = sub.dbn
FROM (
  SELECT g.channel_id,
    (SELECT round(extract(epoch FROM (n.actual_time - c2.arrive_time)) / 60)::int
       FROM clinical.green_channel_nodes n
       WHERE n.channel_id = g.channel_id AND n.node_key = 'ct_scan' AND n.actual_time IS NOT NULL
       LIMIT 1) AS dct,
    (SELECT round(extract(epoch FROM (n.actual_time - c2.arrive_time)) / 60)::int
       FROM clinical.green_channel_nodes n
       WHERE n.channel_id = g.channel_id AND n.node_key = 'thrombolysis' AND n.actual_time IS NOT NULL
       LIMIT 1) AS dnt,
    (SELECT round(extract(epoch FROM (n.actual_time - c2.arrive_time)) / 60)::int
       FROM clinical.green_channel_nodes n
       WHERE n.channel_id = g.channel_id AND n.node_key = 'pci' AND n.actual_time IS NOT NULL
       LIMIT 1) AS dbn
  FROM tmp_er_gc g JOIN clinical.green_channels c2 ON c2.id = g.channel_id
) sub
WHERE c.id = sub.channel_id;

-- ===========================================================================
-- 抢救记录（PAT-ER-004，进行中）
-- ===========================================================================
INSERT INTO clinical.resuscitations (
  resus_no, visit_id, patient_id, bed_no, start_time, end_time, diagnosis,
  lead_doctor_id, lead_nurse_id, status, events, vital_trend, medications, team
)
SELECT 'RS' || nextval('clinical.emergency_triage_no_seq'),
       m.visit_id, m.patient_id, '抢救床-1',
       now() - 16 * interval '1 minute', NULL, pl.chief,
       d.id, n.id, 'resuscitating',
       jsonb_build_array(
         jsonb_build_object('time', now() - 16 * interval '1 minute', 'type', 'assessment',
           'content', '发现意识丧失、颈动脉搏动消失，立即开始心肺复苏', 'operator', '李医生'),
         jsonb_build_object('time', now() - 15 * interval '1 minute', 'type', 'defibrillation',
           'content', '双向波200J除颤1次', 'operator', '李医生'),
         jsonb_build_object('time', now() - 14 * interval '1 minute', 'type', 'airway',
           'content', '气管插管、球囊辅助通气', 'operator', '马护士'),
         jsonb_build_object('time', now() - 12 * interval '1 minute', 'type', 'cpr',
           'content', '持续胸外按压，建立静脉通路', 'operator', '马护士'),
         jsonb_build_object('time', now() - 8 * interval '1 minute', 'type', 'medication',
           'content', '予肾上腺素1mg静推', 'operator', '马护士')
       ),
       jsonb_build_array(
         jsonb_build_object('time', now() - 16 * interval '1 minute', 'hr', 0, 'bp_s', 60, 'spo2', 80),
         jsonb_build_object('time', now() - 8 * interval '1 minute', 'hr', 45, 'bp_s', 82, 'spo2', 92),
         jsonb_build_object('time', now() - 2 * interval '1 minute', 'hr', 78, 'bp_s', 104, 'spo2', 96)
       ),
       jsonb_build_array(
         jsonb_build_object('time', now() - 8 * interval '1 minute', 'name', '肾上腺素注射液',
           'dose', '1mg', 'route', 'IV', 'operator', '马护士'),
         jsonb_build_object('time', now() - 6 * interval '1 minute', 'name', '盐酸胺碘酮注射液',
           'dose', '150mg', 'route', 'IV', 'operator', '马护士')
       ),
       jsonb_build_array('李医生（主任医师）', '马护士（主管护师）', '抢救护理团队')
FROM tmp_er_map m
JOIN tmp_er_plan pl ON pl.mrn = m.mrn
JOIN iam.users d ON d.username = 'doctor_li'
JOIN iam.users n ON n.username = 'nurse_ma'
WHERE m.mrn = 'PAT-ER-004'
  AND NOT EXISTS (SELECT 1 FROM clinical.resuscitations r WHERE r.visit_id = m.visit_id);

-- ===========================================================================
-- 急诊留观（PAT-ER-007，进行中）
-- ===========================================================================
INSERT INTO clinical.observations (
  obs_no, visit_id, patient_id, bed_no, start_time, end_time, diagnosis,
  nursing_level, vitals, iv_status, pending_tasks, status, expected_outcome
)
SELECT 'OB' || nextval('clinical.emergency_triage_no_seq'),
       m.visit_id, m.patient_id, '留观床-3',
       now() - 168 * interval '1 minute', NULL, pl.chief,
       'level1', pl.vitals, '雾化吸入 + 补液中',
       jsonb_build_array(
         jsonb_build_object('task', '沙丁胺醇雾化吸入 q20min', 'done', false),
         jsonb_build_object('task', '30分钟后复测 SpO2 与呼吸频率', 'done', false),
         jsonb_build_object('task', '评估喘息缓解情况，决定离院或入院', 'done', false)
       ),
       'observing', '缓解后离院'
FROM tmp_er_map m
JOIN tmp_er_plan pl ON pl.mrn = m.mrn
WHERE m.mrn = 'PAT-ER-007'
  AND NOT EXISTS (SELECT 1 FROM clinical.observations o WHERE o.visit_id = m.visit_id);

-- ===========================================================================
-- 急诊转归（PAT-ER-008：急诊收入 CCU）
-- ===========================================================================
INSERT INTO clinical.emergency_dispositions (
  visit_id, patient_id, disposition, destination, ward_id, bed_id,
  remark, operator_id, disposition_time
)
SELECT m.visit_id, m.patient_id, 'admitted', '心血管内科CCU',
       w.id, NULL,
       'STEMI 急诊PCI术后，经胸痛绿色通道转 CCU 监护治疗',
       d.id,
       now() - 240 * interval '1 minute'
FROM tmp_er_map m
JOIN iam.users d ON d.username = 'doctor_li'
JOIN clinical.wards w ON w.code = 'WARD-CARDIO-CCU'
WHERE m.mrn = 'PAT-ER-008'
  AND NOT EXISTS (
    SELECT 1 FROM clinical.emergency_dispositions dp WHERE dp.visit_id = m.visit_id
  );
