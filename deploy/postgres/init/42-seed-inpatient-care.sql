-- ============================================================================
-- 健澜科技 jlmedaios - 住院在院诊疗日常种子（M1-B2）
-- 42-seed-inpatient-care.sql
--
-- 为在院患者补"真实落库、可信、脱敏"的多日在院诊疗数据：
--  - 医生查房记录（含上级查房 + 上级审签）；
--  - 护士护理记录单（生命体征、出入量、护理级别、压疮/跌倒风险）；
--  - 在院医嘱（长期/临时）与医嘱执行记录（执行人、双人核对）。
--
-- 覆盖 3 位代表性在院患者：
--  PAT-INP-001 急性非ST段抬高型心肌梗死（心血管一病区，病危，一级护理）
--  PAT-INP-002 慢性心力衰竭急性加重（心血管一病区，病重，一级护理）
--  PAT-INP-013 社区获得性肺炎（呼吸一病区，病重，二级护理）
--
-- 附加员工（支撑职责分离 / 双人核对 / 跨科越权测试）：
--  doctor_zhou 心血管内科主治医师；nurse_qian 心血管内科护士；nurse_sun 呼吸内科护士。
--
-- 幂等：全部以稳定业务码（SEED-* 编号）ON CONFLICT DO NOTHING / DO UPDATE，
--   员工以 username 冲突处理，可重复执行。
--
-- 说明：均为虚构演示患者，标识已脱敏；院方上线前应清空演示数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 附加员工
-- ---------------------------------------------------------------------------
INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES
  ('doctor_zhou', '周医生', 'DOC1003', '心血管内科', '主治医师', 'doctor', 'active'),
  ('nurse_qian',  '钱护士', 'NUR3002', '心血管内科', '护师',     'nurse',  'active'),
  ('nurse_sun',    '孙护士', 'NUR5001', '呼吸内科',   '主管护师', 'nurse',  'active')
ON CONFLICT (username) DO UPDATE
  SET name = EXCLUDED.name, employee_no = EXCLUDED.employee_no,
      department = EXCLUDED.department, title = EXCLUDED.title,
      role = EXCLUDED.role, status = 'active', deleted_at = NULL;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'doctor', 'department', '心血管内科' FROM iam.users u WHERE u.username='doctor_zhou'
ON CONFLICT (user_id, role_code) DO UPDATE SET data_scope='department', scope_value='心血管内科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'nurse', 'department', '心血管内科' FROM iam.users u WHERE u.username='nurse_qian'
ON CONFLICT (user_id, role_code) DO UPDATE SET data_scope='department', scope_value='心血管内科';

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'nurse', 'department', '呼吸内科' FROM iam.users u WHERE u.username='nurse_sun'
ON CONFLICT (user_id, role_code) DO UPDATE SET data_scope='department', scope_value='呼吸内科';

-- ---------------------------------------------------------------------------
-- 目标患者上下文（临时表，本事务结束自动清理）
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_care (
  mrn text, visit_no text, author_user text, superior_user text,
  nurse_user text, nurse2_user text, level text, dx text,
  symptom text, pe jsonb, vitals jsonb, intake jsonb, output jsonb,
  pressure text, fall text, measures text, assess_base text, plan_base text
) ON COMMIT DROP;

INSERT INTO tmp_care VALUES (
  'PAT-INP-001','IP001','doctor_zhou','doctor_chen','nurse_zhao','nurse_qian','level1',
  '急性非ST段抬高型心肌梗死',
  '胸痛较前明显缓解，活动后偶有胸闷，无气促、出汗',
  jsonb_build_object('temperature',36.6,'pulse',78,'respiration',18,'bp','122/76','spo2',97),
  jsonb_build_object('temperature',36.6,'pulse',78,'respiration',18,'sbp',122,'dbp',76,'spo2',97),
  jsonb_build_object('oral',1200,'iv',500,'total',1700),
  jsonb_build_object('urine',1450,'stool',100,'total',1550),
  'low','medium',
  '卧床休息、心电监护、低盐低脂饮食指导，观察穿刺点无渗血，健康教育',
  '生命体征平稳，胸痛缓解，心电监护未见恶性心律失常，心肌损伤标志物回落，病情趋于稳定',
  '继续抗血小板、调脂、抗凝、控制心率治疗，择期复查心电图及心肌酶'
),
(
  'PAT-INP-002','IP002','doctor_zhou','doctor_chen','nurse_zhao','nurse_qian','level1',
  '慢性心力衰竭急性加重',
  '气促减轻，夜间可平卧，双下肢水肿消退，尿量增多',
  jsonb_build_object('temperature',36.4,'pulse',86,'respiration',20,'bp','128/72','spo2',95),
  jsonb_build_object('temperature',36.4,'pulse',86,'respiration',20,'sbp',128,'dbp',72,'spo2',95),
  jsonb_build_object('oral',1000,'iv',300,'total',1300),
  jsonb_build_object('urine',1900,'stool',150,'total',2050),
  'medium','medium',
  '半卧位休息、限水限钠、记24小时出入量、监测体重、皮肤护理与防跌倒宣教',
  '气促缓解、水肿消退、出入量负平衡，心功能较前改善，继续当前抗心衰方案',
  '继续利尿、改善心室重构治疗，据出入量及血压调整利尿剂，复查BNP'
),
(
  'PAT-INP-013','IP013','doctor_lin',NULL,'nurse_sun',NULL,'level2',
  '社区获得性肺炎',
  '咳嗽、咳痰减轻，无发热，活动后气促改善',
  jsonb_build_object('temperature',36.7,'pulse',84,'respiration',19,'bp','120/75','spo2',96),
  jsonb_build_object('temperature',36.7,'pulse',84,'respiration',19,'sbp',120,'dbp',75,'spo2',96),
  jsonb_build_object('oral',1500,'iv',600,'total',2100),
  jsonb_build_object('urine',1600,'stool',200,'total',1800),
  'low','low',
  '指导有效咳嗽排痰、雾化吸入、协助翻身拍背、氧疗及用药观察',
  '热退、呼吸道症状改善，血氧饱和度正常，抗感染治疗有效，继续足疗程',
  '继续抗感染、化痰、氧疗，复查血常规、CRP及胸部影像'
);

-- ---------------------------------------------------------------------------
-- 医生查房记录：3 天 × 3 患者（d=2/1/0），d=1 为上级查房并已审签
-- ---------------------------------------------------------------------------
WITH gen AS (
  SELECT c.*, g.d,
    CASE WHEN c.superior_user IS NOT NULL AND g.d = 1 THEN 'superior' ELSE 'routine' END AS rtype,
    (date_trunc('day', now()) - make_interval(days => g.d) + interval '8 hours') AS rat
  FROM tmp_care c
  CROSS JOIN generate_series(2, 0, -1) AS g(d)
),
ins AS (
  INSERT INTO clinical.ward_rounds (
    id, visit_id, patient_id, round_no, round_type, is_superior, round_at,
    symptom_change, physical_exam, assessment, diagnosis, plan_adjustment,
    ai_assisted, ai_suggestion, status, author_id, signed_by, signed_at,
    countersigned_by, countersigned_at, return_reason, version,
    created_at, updated_at, deleted_at
  )
  SELECT
    gen_random_uuid(), v.id, p.id,
    'SEED-WR-' || g.visit_no || '-' || g.d,
    g.rtype, (g.rtype = 'superior'),
    g.rat,
    g.symptom, g.pe,
    CASE g.d
      WHEN 2 THEN '入院后病情评估：' || g.assess_base
      WHEN 1 THEN '上级医师查房评估：' || g.assess_base
      ELSE '今日查房评估：' || g.assess_base END,
    g.dx,
    CASE g.d
      WHEN 2 THEN '入院初步方案：' || g.plan_base
      WHEN 1 THEN '上级查房意见：' || g.plan_base
      ELSE g.plan_base END,
    false, '{}'::jsonb,
    CASE WHEN g.rtype = 'superior' THEN 'countersigned' ELSE 'signed' END,
    ua.id, ua.id, g.rat,
    CASE WHEN g.rtype = 'superior' THEN us.id ELSE NULL END,
    CASE WHEN g.rtype = 'superior' THEN g.rat + interval '1 hour' ELSE NULL END,
    NULL, 1, now(), now(), NULL
  FROM gen g
  JOIN clinical.visits v ON v.visit_no = g.visit_no AND v.visit_type = 'inpatient'
  JOIN clinical.patients p ON p.id = v.patient_id
  JOIN iam.users ua ON ua.username = g.author_user
  LEFT JOIN iam.users us ON us.username = g.superior_user
  ON CONFLICT (round_no) DO NOTHING
  RETURNING id
)
SELECT count(*) AS rounds_inserted FROM ins;

-- ---------------------------------------------------------------------------
-- 护士护理记录单：3 天白班（10:00），并为病危 001 增加一条夜班（22:00）
-- ---------------------------------------------------------------------------
WITH gen AS (
  SELECT c.*, g.d, 'day'::text AS shift,
    (date_trunc('day', now()) - make_interval(days => g.d) + interval '10 hours') AS rec_at
  FROM tmp_care c
  CROSS JOIN generate_series(2, 0, -1) AS g(d)
  UNION ALL
  SELECT c.*, 1 AS d, 'night'::text,
    (date_trunc('day', now()) - make_interval(days => 1) + interval '22 hours')
  FROM tmp_care c WHERE c.mrn = 'PAT-INP-001'
),
ins AS (
  INSERT INTO clinical.nursing_records (
    id, visit_id, patient_id, record_no, recorded_at, shift, nursing_level,
    vitals, intake, output, measures, pressure_sore_risk, fall_risk,
    risk_assessment, ai_assisted, status, nurse_id, signed_by, signed_at,
    created_at, updated_at, deleted_at
  )
  SELECT
    gen_random_uuid(), v.id, p.id,
    'SEED-NR-' || g.visit_no || '-' || to_char(g.rec_at, 'YYYYMMDD-HH24'),
    g.rec_at, g.shift, g.level,
    g.vitals, g.intake, g.output, g.measures, g.pressure, g.fall,
    jsonb_build_object(
      'braden', CASE g.pressure WHEN 'medium' THEN 13 WHEN 'low' THEN 16 ELSE 19 END,
      'morse', CASE g.fall WHEN 'medium' THEN 55 WHEN 'low' THEN 30 ELSE 10 END
    ),
    false, 'signed', un.id, un.id, g.rec_at, now(), now(), NULL
  FROM gen g
  JOIN clinical.visits v ON v.visit_no = g.visit_no AND v.visit_type = 'inpatient'
  JOIN clinical.patients p ON p.id = v.patient_id
  JOIN iam.users un ON un.username = g.nurse_user
  ON CONFLICT (record_no) DO NOTHING
  RETURNING id
)
SELECT count(*) AS nursing_records_inserted FROM ins;

-- ---------------------------------------------------------------------------
-- 在院医嘱计划（长期/临时；active/executed/stopped/pending_review）
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_orders (
  order_no text, visit_no text, category text, order_type text, content text,
  priority text, status text, doctor_user text, reviewer_user text,
  requires_double_check boolean, freq_hours int, detail jsonb
) ON COMMIT DROP;

INSERT INTO tmp_orders VALUES
  -- PAT-INP-001 急性 NSTEMI
  ('SEED-ORD-001','IP001','long_term','drug','阿司匹林肠溶片 100mg 口服 qd',
   'routine','active','doctor_zhou','doctor_chen',false,24,
   jsonb_build_object('frequency','qd','route','po')),
  ('SEED-ORD-002','IP001','long_term','drug','琥珀酸美托洛尔缓释片 47.5mg 口服 qd',
   'routine','active','doctor_zhou','doctor_chen',false,24,
   jsonb_build_object('frequency','qd','route','po')),
  ('SEED-ORD-003','IP001','long_term','drug','那屈肝素钙注射液 0.4ml 皮下注射 q12h',
   'routine','active','doctor_zhou','doctor_chen',true,12,
   jsonb_build_object('frequency','q12h','route','ih','highAlert',true)),
  ('SEED-ORD-004','IP001','short_term','imaging','床旁12导联心电图 1次',
   'routine','executed','doctor_zhou','doctor_chen',false,NULL,
   jsonb_build_object('bodyPart','heart')),
  ('SEED-ORD-005','IP001','short_term','lab','心肌酶谱+肌钙蛋白定量 复查',
   'routine','pending_review','doctor_zhou',NULL,false,NULL,'{}'::jsonb),
  -- PAT-INP-002 慢性心衰急性加重
  ('SEED-ORD-006','IP002','long_term','drug','呋塞米注射液 20mg 静脉注射 qd',
   'routine','active','doctor_zhou','doctor_chen',false,24,
   jsonb_build_object('frequency','qd','route','iv')),
  ('SEED-ORD-007','IP002','long_term','drug','沙库巴曲缬沙坦钠片 100mg 口服 bid',
   'routine','active','doctor_zhou','doctor_chen',false,12,
   jsonb_build_object('frequency','bid','route','po')),
  ('SEED-ORD-008','IP002','long_term','drug','0.9%氯化钠注射液 500ml 静脉滴注 qd',
   'routine','stopped','doctor_zhou','doctor_chen',false,24,
   jsonb_build_object('frequency','qd','route','ivgtt','stopReason','补液已足，停止静脉补液')),
  ('SEED-ORD-009','IP002','short_term','lab','B型利钠肽(BNP)测定 1次',
   'routine','executed','doctor_zhou','doctor_chen',false,NULL,'{}'::jsonb),
  ('SEED-ORD-010','IP002','short_term','imaging','心脏彩色多普勒超声复查',
   'routine','pending_review','doctor_zhou',NULL,false,NULL,
   jsonb_build_object('bodyPart','heart')),
  -- PAT-INP-013 社区获得性肺炎
  ('SEED-ORD-011','IP013','long_term','drug','注射用头孢呋辛钠 1.5g 静脉滴注 q8h',
   'routine','active','doctor_lin','doctor_lin',false,8,
   jsonb_build_object('frequency','q8h','route','ivgtt')),
  ('SEED-ORD-012','IP013','long_term','treatment','氧气吸入 3L/min（按班次执行）',
   'routine','active','doctor_lin','doctor_lin',false,12,
   jsonb_build_object('frequency','q12h')),
  ('SEED-ORD-013','IP013','short_term','imaging','胸部CT平扫 1次',
   'routine','executed','doctor_lin','doctor_lin',false,NULL,
   jsonb_build_object('bodyPart','chest')),
  ('SEED-ORD-014','IP013','short_term','lab','血常规+C反应蛋白复查',
   'routine','pending_review','doctor_lin',NULL,false,NULL,'{}'::jsonb);

-- 插入医嘱（按稳定 order_no 幂等）
WITH ins AS (
  INSERT INTO clinical.orders (
    id, visit_id, order_no, order_type, content, detail, priority, status, category,
    doctor_id, reviewer_id, reviewed_at, reject_reason, requires_double_check,
    start_at, stop_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v.id, o.order_no, o.order_type, o.content, o.detail,
    o.priority, o.status, o.category,
    ud.id,
    CASE WHEN o.status = 'pending_review' THEN NULL ELSE ur.id END,
    CASE WHEN o.status = 'pending_review' THEN NULL
         ELSE (date_trunc('day', now()) - interval '3 days' + interval '8 hours' + interval '10 min') END,
    NULL, o.requires_double_check,
    CASE WHEN o.category = 'long_term'
         THEN date_trunc('day', now()) - interval '3 days' + interval '8 hours'
         WHEN o.status = 'pending_review' THEN now()
         ELSE date_trunc('day', now()) - interval '2 days' + interval '9 hours' END,
    CASE o.status
      WHEN 'stopped' THEN date_trunc('day', now()) - interval '1 day' + interval '9 hours'
      WHEN 'executed' THEN date_trunc('day', now()) - interval '2 days' + interval '9 hours'
      ELSE NULL END,
    now(), now()
  FROM tmp_orders o
  JOIN clinical.visits v ON v.visit_no = o.visit_no AND v.visit_type = 'inpatient'
  JOIN iam.users ud ON ud.username = o.doctor_user
  LEFT JOIN iam.users ur ON ur.username = o.reviewer_user
  ON CONFLICT (order_no) DO NOTHING
  RETURNING id
)
SELECT count(*) AS orders_inserted FROM ins;

-- ---------------------------------------------------------------------------
-- 医嘱执行记录：
--  - 长期 active/stopped：按 freq_hours 从 3 天前 08:00 起生成时点（stopped 止于 1 天前）；
--  - 临时 executed：单次（2 天前 09:00）；
--  - pending_review：无执行记录。
-- 高风险医嘱 SEED-ORD-003 带双人核对 checked_by。
-- ---------------------------------------------------------------------------
WITH recurring AS (
  SELECT o.order_no, o.content, o.requires_double_check, c.nurse_user, c.nurse2_user,
    gs.ts
  FROM tmp_orders o
  JOIN tmp_care c ON c.visit_no = o.visit_no
  CROSS JOIN LATERAL generate_series(
    date_trunc('day', now()) - interval '3 days' + interval '8 hours',
    CASE WHEN o.status = 'stopped'
         THEN date_trunc('day', now()) - interval '1 day' + interval '9 hours'
         ELSE now() END,
    make_interval(hours => o.freq_hours)
  ) AS gs(ts)
  WHERE o.category = 'long_term' AND o.status IN ('active','stopped')
),
oneoff AS (
  SELECT o.order_no, o.content, o.requires_double_check, c.nurse_user, c.nurse2_user,
    (date_trunc('day', now()) - interval '2 days' + interval '9 hours') AS ts
  FROM tmp_orders o
  JOIN tmp_care c ON c.visit_no = o.visit_no
  WHERE o.status = 'executed'
),
alladmin AS (SELECT * FROM recurring UNION ALL SELECT * FROM oneoff),
ins AS (
  INSERT INTO clinical.order_administrations (
    id, order_id, visit_id, patient_id, admin_no, slot, idempotency_key, status,
    dose, administered_by, checked_by, administered_at, note, created_at
  )
  SELECT
    gen_random_uuid(), ord.id, v.id, p.id,
    'SEED-ADM-' || substring(md5(a.order_no || to_char(a.ts, 'YYYYMMDDHH24MI')) for 12),
    to_char(a.ts, 'YYYY-MM-DD"T"HH24:MI'),
    a.order_no || ':' || to_char(a.ts, 'YYYY-MM-DD"T"HH24:MI') || ':' || a.nurse_user,
    'administered', a.content,
    un.id,
    CASE WHEN a.requires_double_check THEN uq.id ELSE NULL END,
    a.ts, NULL, now()
  FROM alladmin a
  JOIN clinical.orders ord ON ord.order_no = a.order_no
  JOIN clinical.visits v ON v.id = ord.visit_id
  JOIN clinical.patients p ON p.id = v.patient_id
  JOIN iam.users un ON un.username = a.nurse_user
  LEFT JOIN iam.users uq ON uq.username = a.nurse2_user
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT count(*) AS administrations_inserted FROM ins;
