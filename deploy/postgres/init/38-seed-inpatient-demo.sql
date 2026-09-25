-- ============================================================================
-- 健澜科技 jlmedaios - 住院病区/床位与当日在院患者种子
-- 38-seed-inpatient-demo.sql
--
-- 为住院床位图/入院登记/在院列表提供“真实落库、可信、脱敏”的主数据：
--  - 院区：总院区、城东院区（一院多区）；
--  - 病区：心血管内科一病区、心血管内科CCU、呼吸内科一病区（转科目标）；
--  - 床位：各病区床位，含维护/隔离状态；
--  - 当日在院患者：16 位住院患者及其就诊/入院记录/床位占用/入院 ADT 事件。
--
-- 附加员工：doctor_lin（呼吸内科主任医师）、nurse_zhao（心血管内科护士，DataScope 演示）。
--
-- 幂等：全部以稳定业务码（campus code / ward code / ward+bed_no / mrn / visit_no /
--   admission_no）冲突处理或 NOT EXISTS 守卫，可重复执行。
--
-- 说明：均为虚构演示患者，标识已脱敏；院方上线前应清空演示数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 附加员工（呼吸科医生 / 心内科护士）
-- ---------------------------------------------------------------------------
INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES
  ('doctor_lin', '林医生', 'DOC1002', '呼吸内科', '主任医师', 'doctor', 'active'),
  ('nurse_zhao', '赵护士', 'NUR3001', '心血管内科', '主管护师', 'nurse', 'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name, employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department, title = EXCLUDED.title,
      role = EXCLUDED.role, status = 'active', deleted_at = NULL;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'doctor', 'department', '呼吸内科'
FROM iam.users u WHERE u.username = 'doctor_lin'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '呼吸内科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'nurse', 'department', '心血管内科'
FROM iam.users u WHERE u.username = 'nurse_zhao'
ON CONFLICT (user_id, role_code) DO UPDATE
  SET data_scope = 'department', scope_value = '心血管内科';

-- ---------------------------------------------------------------------------
-- 院区（一院多区）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.campuses (code, name, address, status)
VALUES
  ('CAMP-MAIN', '总院区',   '杭州市文一西路（健澜科技示范院区）', 'active'),
  ('CAMP-EAST', '城东院区', '杭州市城东片区',                     'active')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, address = EXCLUDED.address, status = EXCLUDED.status;

-- ---------------------------------------------------------------------------
-- 病区
-- ---------------------------------------------------------------------------
INSERT INTO clinical.wards (code, name, department, campus_id, floor, nurse_station, director, status)
SELECT v.code, v.name, v.dept, c.id, v.floor, v.ns, v.direct, 'active'
FROM (VALUES
  ('WARD-CARDIO-1',   '心血管内科一病区', '心血管内科', '5F', '5楼护士站', '王*明'),
  ('WARD-CARDIO-CCU', '心血管内科CCU',    '心血管内科', '5F', 'CCU护士站',  '王*明'),
  ('WARD-RESP-1',     '呼吸内科一病区',   '呼吸内科',   '8F', '8楼护士站',  '林*')
) AS v(code, name, dept, floor, ns, direct)
JOIN clinical.campuses c ON c.code = 'CAMP-MAIN'
ON CONFLICT (campus_id, code) DO UPDATE
  SET name = EXCLUDED.name, department = EXCLUDED.department,
      floor = EXCLUDED.floor, nurse_station = EXCLUDED.nurse_station,
      director = EXCLUDED.director, status = 'active';

-- ---------------------------------------------------------------------------
-- 床位：心血管内科一病区（6 病房 × 3 床 = 18）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.beds (ward_id, bed_no, room_no, bed_type, status, sort_order)
SELECT w.id, r.room || '-' || p.pos, r.room, 'standard', 'available',
       RIGHT(r.room, 2)::int * 10 + p.pos
FROM clinical.wards w
CROSS JOIN (VALUES ('0501'),('0502'),('0503'),('0504'),('0505'),('0506')) AS r(room)
CROSS JOIN (VALUES (1),(2),(3)) AS p(pos)
WHERE w.code = 'WARD-CARDIO-1'
  AND NOT EXISTS (SELECT 1 FROM clinical.beds b WHERE b.ward_id = w.id)
ON CONFLICT DO NOTHING;

-- 心血管内科一病区：1 张维护、1 张隔离（幂等：仅在空闲时设置）
UPDATE clinical.beds SET status = 'maintenance'
WHERE ward_id = (SELECT id FROM clinical.wards WHERE code = 'WARD-CARDIO-1')
  AND bed_no = '0506-2' AND status = 'available';
UPDATE clinical.beds SET status = 'isolation', bed_type = 'isolation'
WHERE ward_id = (SELECT id FROM clinical.wards WHERE code = 'WARD-CARDIO-1')
  AND bed_no = '0506-3' AND status = 'available';

-- ---------------------------------------------------------------------------
-- 床位：心血管内科 CCU（4 床，ICU/抢救型）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.beds (ward_id, bed_no, room_no, bed_type, status, sort_order)
SELECT w.id, v.bed_no, 'CCU', v.btype, 'available', v.sorto
FROM clinical.wards w
CROSS JOIN (VALUES
  ('CCU-1', 'icu', 1), ('CCU-2', 'icu', 2), ('CCU-3', 'icu', 3), ('CCU-4', 'standard', 4)
) AS v(bed_no, btype, sorto)
WHERE w.code = 'WARD-CARDIO-CCU'
  AND NOT EXISTS (SELECT 1 FROM clinical.beds b WHERE b.ward_id = w.id)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 床位：呼吸内科一病区（6 病房 × 3 床 = 18）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.beds (ward_id, bed_no, room_no, bed_type, status, sort_order)
SELECT w.id, r.room || '-' || p.pos, r.room, 'standard', 'available',
       RIGHT(r.room, 2)::int * 10 + p.pos
FROM clinical.wards w
CROSS JOIN (VALUES ('0801'),('0802'),('0803'),('0804'),('0805'),('0806')) AS r(room)
CROSS JOIN (VALUES (1),(2),(3)) AS p(pos)
WHERE w.code = 'WARD-RESP-1'
  AND NOT EXISTS (SELECT 1 FROM clinical.beds b WHERE b.ward_id = w.id)
ON CONFLICT DO NOTHING;

-- 呼吸内科一病区：1 张维护
UPDATE clinical.beds SET status = 'maintenance'
WHERE ward_id = (SELECT id FROM clinical.wards WHERE code = 'WARD-RESP-1')
  AND bed_no = '0806-3' AND status = 'available';

-- ---------------------------------------------------------------------------
-- 在院患者主索引（脱敏，mrn 唯一）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.patients
  (mrn, name_masked, gender, birth_date, blood_type, allergies, past_history, tags, data_level)
VALUES
  ('PAT-INP-001','张*强','男',DATE '1968-05-14','A','[]'::jsonb,
    '[{"disease":"原发性高血压","since":"2018"}]'::jsonb,'["冠心病","病危"]'::jsonb,3),
  ('PAT-INP-002','李*英','女',DATE '1956-09-22','O',
    '[{"substance":"磺胺类","reaction":"瘙痒","severity":"low"}]'::jsonb,
    '[{"disease":"冠状动脉粥样硬化性心脏病","since":"2017"}]'::jsonb,'["心衰","病重"]'::jsonb,3),
  ('PAT-INP-003','王*国','男',DATE '1961-02-08','B','[]'::jsonb,
    '[{"disease":"原发性高血压","since":"2016"}]'::jsonb,'["冠心病"]'::jsonb,3),
  ('PAT-INP-004','赵*兰','女',DATE '1972-11-30','AB','[]'::jsonb,'[]'::jsonb,'["心绞痛","病重"]'::jsonb,3),
  ('PAT-INP-005','刘*军','男',DATE '1969-07-19','A','[]'::jsonb,
    '[{"disease":"2型糖尿病","since":"2020"}]'::jsonb,'["高血压"]'::jsonb,3),
  ('PAT-INP-006','陈*凤','女',DATE '1975-03-25','O','[]'::jsonb,'[]'::jsonb,'["房颤"]'::jsonb,3),
  ('PAT-INP-007','杨*生','男',DATE '1971-12-05','B',
    '[{"substance":"青霉素","reaction":"皮疹","severity":"medium"}]'::jsonb,
    '[]'::jsonb,'["冠心病","术后"]'::jsonb,3),
  ('PAT-INP-008','黄*珍','女',DATE '1967-08-17','A','[]'::jsonb,'[]'::jsonb,'["心肌病","病重"]'::jsonb,3),
  ('PAT-INP-009','周*梅','女',DATE '1988-01-11','O','[]'::jsonb,'[]'::jsonb,'["心悸"]'::jsonb,3),
  ('PAT-INP-010','吴*明','男',DATE '1965-04-28','A','[]'::jsonb,
    '[{"disease":"冠状动脉粥样硬化性心脏病","since":"2019"}]'::jsonb,'["心梗","病危"]'::jsonb,3),
  ('PAT-INP-011','徐*东','男',DATE '1970-10-03','O','[]'::jsonb,'[]'::jsonb,'["休克","病危"]'::jsonb,3),
  ('PAT-INP-012','孙*强','男',DATE '1963-06-21','B','[]'::jsonb,
    '[{"disease":"陈旧性心肌梗死","since":"2015"}]'::jsonb,'["心律失常","病危"]'::jsonb,3),
  ('PAT-INP-013','马*华','男',DATE '1978-12-09','A','[]'::jsonb,'[]'::jsonb,'["肺炎","病重"]'::jsonb,3),
  ('PAT-INP-014','朱*英','女',DATE '1959-05-16','O','[]'::jsonb,
    '[{"disease":"慢性阻塞性肺疾病","since":"2013"}]'::jsonb,'["慢阻肺","病重"]'::jsonb,3),
  ('PAT-INP-015','胡*静','女',DATE '1992-02-27','AB','[]'::jsonb,
    '[{"disease":"支气管哮喘","since":"2008"}]'::jsonb,'["哮喘"]'::jsonb,3),
  ('PAT-INP-016','郭*林','男',DATE '1968-09-13','B','[]'::jsonb,'[]'::jsonb,'["呼衰"]'::jsonb,3)
ON CONFLICT (mrn) DO UPDATE
  SET name_masked = EXCLUDED.name_masked, gender = EXCLUDED.gender,
      birth_date = EXCLUDED.birth_date, blood_type = EXCLUDED.blood_type,
      allergies = EXCLUDED.allergies, past_history = EXCLUDED.past_history,
      tags = EXCLUDED.tags;

-- ---------------------------------------------------------------------------
-- 入院计划（mrn → 病区/床/诊断/病情/住院天数/入院方式/来源/经治医生）
-- 临时表仅在本迁移事务内有效（ON COMMIT DROP）。
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_inp_plan (
  mrn text, ward_code text, bed_no text, diagnosis text, cond text,
  days int, adm_type text, src text, doctor_user text
) ON COMMIT DROP;

INSERT INTO tmp_inp_plan VALUES
  ('PAT-INP-001','WARD-CARDIO-1','0501-1','急性非ST段抬高型心肌梗死','critical',3,'emergency','emergency','doctor_chen'),
  ('PAT-INP-002','WARD-CARDIO-1','0501-2','慢性心力衰竭急性加重','serious',5,'emergency','emergency','doctor_chen'),
  ('PAT-INP-003','WARD-CARDIO-1','0501-3','冠状动脉粥样硬化性心脏病','stable',7,'elective','outpatient','doctor_chen'),
  ('PAT-INP-004','WARD-CARDIO-1','0502-1','不稳定型心绞痛','serious',2,'emergency','emergency','doctor_chen'),
  ('PAT-INP-005','WARD-CARDIO-1','0502-2','原发性高血压3级','stable',4,'elective','outpatient','doctor_chen'),
  ('PAT-INP-006','WARD-CARDIO-1','0503-1','心房颤动','stable',6,'elective','outpatient','doctor_chen'),
  ('PAT-INP-007','WARD-CARDIO-1','0503-2','冠状动脉粥样硬化性心脏病 PCI术后','stable',1,'emergency','emergency','doctor_chen'),
  ('PAT-INP-008','WARD-CARDIO-1','0504-1','扩张型心肌病','serious',8,'elective','outpatient','doctor_chen'),
  ('PAT-INP-009','WARD-CARDIO-1','0504-2','阵发性室上性心动过速','stable',3,'elective','outpatient','doctor_chen'),
  ('PAT-INP-010','WARD-CARDIO-CCU','CCU-1','急性ST段抬高型心肌梗死','critical',1,'emergency','emergency','doctor_chen'),
  ('PAT-INP-011','WARD-CARDIO-CCU','CCU-2','心源性休克','critical',2,'emergency','emergency','doctor_chen'),
  ('PAT-INP-012','WARD-CARDIO-CCU','CCU-3','恶性心律失常','critical',2,'emergency','emergency','doctor_chen'),
  ('PAT-INP-013','WARD-RESP-1','0801-1','社区获得性肺炎','serious',3,'emergency','emergency','doctor_lin'),
  ('PAT-INP-014','WARD-RESP-1','0801-2','慢性阻塞性肺疾病急性加重','serious',5,'emergency','emergency','doctor_lin'),
  ('PAT-INP-015','WARD-RESP-1','0801-3','支气管哮喘急性发作','stable',2,'emergency','emergency','doctor_lin'),
  ('PAT-INP-016','WARD-RESP-1','0802-1','呼吸衰竭','stable',6,'elective','outpatient','doctor_lin');

-- 住院就诊
INSERT INTO clinical.visits
  (patient_id, visit_no, visit_type, department, ward, bed_no, ward_id, bed_id,
   attending_doctor_id, chief_complaint, status, admit_at)
SELECT p.id, 'IP' || SUBSTRING(pl.mrn FROM '[0-9]+'), 'inpatient',
       w.department, w.name, pl.bed_no, w.id, b.id, u.id,
       pl.diagnosis, 'ongoing', now() - make_interval(days => pl.days)
FROM tmp_inp_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
JOIN clinical.wards w ON w.code = pl.ward_code
JOIN clinical.beds b ON b.ward_id = w.id AND b.bed_no = pl.bed_no
JOIN iam.users u ON u.username = pl.doctor_user
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.visits v
  WHERE v.patient_id = p.id AND v.visit_type = 'inpatient' AND v.status = 'ongoing'
);

-- 入院记录
INSERT INTO clinical.admissions
  (admission_no, visit_id, patient_id, ward_id, bed_id, department, admitting_doctor_id,
   admission_type, source, diagnosis, condition_on_admission, admitted_at, status)
SELECT 'ZY' || SUBSTRING(pl.mrn FROM '[0-9]+'),
       v.id, p.id, w.id, b.id, w.department, u.id,
       pl.adm_type, pl.src, pl.diagnosis, pl.cond, v.admit_at, 'admitted'
FROM tmp_inp_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
JOIN clinical.wards w ON w.code = pl.ward_code
JOIN clinical.beds b ON b.ward_id = w.id AND b.bed_no = pl.bed_no
JOIN iam.users u ON u.username = pl.doctor_user
JOIN clinical.visits v ON v.visit_no = 'IP' || SUBSTRING(pl.mrn FROM '[0-9]+')
WHERE NOT EXISTS (SELECT 1 FROM clinical.admissions a WHERE a.visit_id = v.id);

-- 床位占用（仅占用空闲床；重跑时已占用则不匹配）
UPDATE clinical.beds b
SET status = 'occupied', current_visit_id = v.id, current_patient_id = p.id,
    occupied_at = v.admit_at, updated_at = now()
FROM tmp_inp_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
JOIN clinical.wards w ON w.code = pl.ward_code
JOIN clinical.visits v ON v.visit_no = 'IP' || SUBSTRING(pl.mrn FROM '[0-9]+')
WHERE b.ward_id = w.id AND b.bed_no = pl.bed_no
  AND b.status = 'available' AND b.current_patient_id IS NULL;

-- 入院 ADT 事件
INSERT INTO clinical.adt_events
  (visit_id, patient_id, event_type, to_ward_id, to_bed_id, to_department, reason, operator_id, event_at)
SELECT v.id, p.id, 'admit', w.id, b.id, w.department, '入院登记', u.id, v.admit_at
FROM tmp_inp_plan pl
JOIN clinical.patients p ON p.mrn = pl.mrn
JOIN clinical.wards w ON w.code = pl.ward_code
JOIN clinical.beds b ON b.ward_id = w.id AND b.bed_no = pl.bed_no
JOIN iam.users u ON u.username = pl.doctor_user
JOIN clinical.visits v ON v.visit_no = 'IP' || SUBSTRING(pl.mrn FROM '[0-9]+')
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.adt_events e WHERE e.visit_id = v.id AND e.event_type = 'admit'
);
