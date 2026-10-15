-- ============================================================================
-- 健澜科技 jlmedaios - 跨科演示种子数据（内科/外科/妇科/儿科/急诊）
-- 221-seed-demo-data.sql
--
-- 为全院工作台提供可演示的跨科室主数据：
--   1. 5 个临床科室（clinical.departments）
--   2. 20 位在院住院患者（含 ICD-10 诊断、手术申请、医嘱、检验结果）
--   3. 30 条当日门诊挂号记录
--   4. 10 条待审批医嘱（clinical.orders.status = 'pending_review'）
--   5. 5 条危急值（clinical.lab_results.is_critical + 对应 critical_value_alerts）
--
-- 幂等：全部以稳定业务码（code / username / mrn / visit_no / order_no /
--   request_no）ON CONFLICT DO NOTHING，无唯一约束的表用 NOT EXISTS 守卫；
--   可重复执行，不删除、不修改现有数据。
--
-- 说明：均为虚构演示患者，姓名已脱敏；院方上线前应清空演示数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 临床科室主数据（仓库此前无 departments 表，科室散见 visits/wards 文本列）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.departments (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  category   text NOT NULL DEFAULT 'clinical',
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_clinical_departments_updated ON clinical.departments;
CREATE TRIGGER trg_clinical_departments_updated BEFORE UPDATE ON clinical.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO clinical.departments (code, name, category) VALUES
  ('DEP-IM', '内科', 'clinical'),
  ('DEP-SU', '外科', 'clinical'),
  ('DEP-GY', '妇科', 'clinical'),
  ('DEP-PA', '儿科', 'clinical'),
  ('DEP-ER', '急诊', 'clinical')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. 五个科室的经治医生（真实 iam 账户，可作为医嘱/诊断外键）
-- ---------------------------------------------------------------------------
INSERT INTO iam.users (username, name, employee_no, department, title, role, status)
VALUES
  ('doctor_neike',   '王医生', 'DOC2201', '内科', '主任医师',   'doctor', 'active'),
  ('doctor_waike',   '李医生', 'DOC2202', '外科', '副主任医师', 'doctor', 'active'),
  ('doctor_fuke',   '赵医生', 'DOC2203', '妇科', '副主任医师', 'doctor', 'active'),
  ('doctor_erke',    '陈医生', 'DOC2204', '儿科', '主治医师',   'doctor', 'active'),
  ('doctor_jizhen',  '刘医生', 'DOC2205', '急诊', '主治医师',   'doctor', 'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO iam.user_roles (user_id, role_code, data_scope, scope_value)
SELECT u.id, 'doctor', 'department', u.department
FROM iam.users u
WHERE u.username IN ('doctor_neike','doctor_waike','doctor_fuke',
                     'doctor_erke','doctor_jizhen')
ON CONFLICT (user_id, role_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. 住院患者主索引（20 人，mrn 唯一；已存在则不动）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.patients
  (mrn, name_masked, gender, birth_date, blood_type, allergies, past_history, tags, data_level)
VALUES
  ('PAT-S221-001','王*国','男',DATE '1958-04-12','A','[]'::jsonb,
    '[{"disease":"原发性高血压","since":"2019"}]'::jsonb,'["肺炎"]'::jsonb,3),
  ('PAT-S221-002','李*兰','女',DATE '1962-09-25','O','[]'::jsonb,
    '[{"disease":"2型糖尿病","since":"2018"}]'::jsonb,'["糖尿病"]'::jsonb,3),
  ('PAT-S221-003','张*强','男',DATE '1955-12-03','B',
    '[{"substance":"磺胺类","reaction":"瘙痒","severity":"low"}]'::jsonb,
    '[{"disease":"原发性高血压3级","since":"2010"}]'::jsonb,'["高血压"]'::jsonb,3),
  ('PAT-S221-004','赵*芳','女',DATE '1966-03-18','AB','[]'::jsonb,
    '[{"disease":"心房颤动","since":"2021"}]'::jsonb,'["脑梗"]'::jsonb,3),
  ('PAT-S221-005','刘*生','男',DATE '1970-07-08','A','[]'::jsonb,'[]'::jsonb,'["消化性溃疡"]'::jsonb,3),
  ('PAT-S221-006','陈*伟','男',DATE '1985-02-14','O','[]'::jsonb,'[]'::jsonb,'["阑尾炎","术后"]'::jsonb,3),
  ('PAT-S221-007','杨*花','女',DATE '1959-11-30','B',
    '[{"substance":"青霉素","reaction":"皮疹","severity":"medium"}]'::jsonb,
    '[]'::jsonb,'["胆囊结石","术后"]'::jsonb,3),
  ('PAT-S221-008','黄*国','男',DATE '1978-06-22','A','[]'::jsonb,'[]'::jsonb,'["腹股沟疝"]'::jsonb,3),
  ('PAT-S221-009','周*敏','女',DATE '1990-08-05','O','[]'::jsonb,'[]'::jsonb,'["骨折","术后"]'::jsonb,3),
  ('PAT-S221-010','吴*峰','男',DATE '1982-01-19','AB','[]'::jsonb,'[]'::jsonb,'["甲状腺肿物"]'::jsonb,3),
  ('PAT-S221-011','徐*丽','女',DATE '1988-05-27','A','[]'::jsonb,'[]'::jsonb,'["子宫肌瘤","术后"]'::jsonb,3),
  ('PAT-S221-012','孙*燕','女',DATE '1992-10-09','O',
    '[{"substance":"头孢类","reaction":"轻度恶心","severity":"low"}]'::jsonb,
    '[]'::jsonb,'["异位妊娠","术后"]'::jsonb,3),
  ('PAT-S221-013','马*红','女',DATE '1985-04-02','B','[]'::jsonb,'[]'::jsonb,'["卵巢囊肿"]'::jsonb,3),
  ('PAT-S221-014','朱*凤','女',DATE '1979-12-16','A','[]'::jsonb,'[]'::jsonb,'["宫颈炎"]'::jsonb,3),
  ('PAT-S221-015','杨*宝','男',DATE '2019-06-11','O','[]'::jsonb,'[]'::jsonb,'["小儿疝气"]'::jsonb,3),
  ('PAT-S221-016','黄*甜','女',DATE '2020-03-21','A','[]'::jsonb,'[]'::jsonb,'["扁桃体炎"]'::jsonb,3),
  ('PAT-S221-017','吴*乐','男',DATE '2021-09-08','B','[]'::jsonb,'[]'::jsonb,'["腹泻"]'::jsonb,3),
  ('PAT-S221-018','郑*勇','男',DATE '1975-05-30','O','[]'::jsonb,
    '[{"disease":"2型糖尿病","since":"2022"}]'::jsonb,'["泌尿系感染"]'::jsonb,3),
  ('PAT-S221-019','冯*洁','女',DATE '1980-07-17','AB','[]'::jsonb,'[]'::jsonb,'["腰扭伤"]'::jsonb,3),
  ('PAT-S221-020','何*军','男',DATE '1968-02-25','A','[]'::jsonb,'[]'::jsonb,'["急性胃炎"]'::jsonb,3)
ON CONFLICT (mrn) DO NOTHING;

-- 住院计划临时表（事务内有效）
CREATE TEMP TABLE tmp_s221_inp (
  seq text, mrn text, dept text, doctor_user text,
  diagnosis text, icd text, complaint text, days int
) ON COMMIT DROP;

INSERT INTO tmp_s221_inp VALUES
  ('001','PAT-S221-001','内科','doctor_neike',
    '社区获得性肺炎','J18.9','发热、咳嗽咳痰5天',4),
  ('002','PAT-S221-002','内科','doctor_neike',
    '2型糖尿病伴血糖控制不佳','E11.9','口干多饮1月，加重伴乏力3天',5),
  ('003','PAT-S221-003','内科','doctor_neike',
    '原发性高血压3级（很高危）','I10','反复头晕头痛1周',6),
  ('004','PAT-S221-004','内科','doctor_neike',
    '急性脑梗死','I63.9','右侧肢体乏力伴言语不清2天',7),
  ('005','PAT-S221-005','内科','doctor_neike',
    '十二指肠溃疡','K27.9','反复上腹痛3周，黑便2天',5),
  ('006','PAT-S221-006','外科','doctor_waike',
    '急性阑尾炎','K35.9','转移性右下腹痛12小时',3),
  ('007','PAT-S221-007','外科','doctor_waike',
    '胆囊结石伴慢性胆囊炎急性发作','K80.1','右上腹痛伴发热2天',5),
  ('008','PAT-S221-008','外科','doctor_waike',
    '右侧腹股沟斜疝','K40.9','右侧腹股沟可复性包块2年',2),
  ('009','PAT-S221-009','外科','doctor_waike',
    '左侧桡骨远端骨折','S52.5','跌倒致左腕肿痛畸形1天',4),
  ('010','PAT-S221-010','外科','doctor_waike',
    '甲状腺腺瘤','E04.1','发现颈前肿物3月',2),
  ('011','PAT-S221-011','妇科','doctor_fuke',
    '子宫多发肌瘤','D25.9','经量增多伴下腹胀痛半年',5),
  ('012','PAT-S221-012','妇科','doctor_fuke',
    '右侧输卵管妊娠（异位妊娠）','O00.9','停经45天，右下腹痛伴阴道少量出血',3),
  ('013','PAT-S221-013','妇科','doctor_fuke',
    '右侧卵巢囊肿','N83.0','体检发现盆腔包块1月',4),
  ('014','PAT-S221-014','妇科','doctor_fuke',
    '慢性宫颈炎','N72','接触性出血2周',3),
  ('015','PAT-S221-015','儿科','doctor_erke',
    '急性支气管炎','J20.9','发热伴咳嗽3天',3),
  ('016','PAT-S221-016','儿科','doctor_erke',
    '急性扁桃体炎','J03.9','发热咽痛2天',2),
  ('017','PAT-S221-017','儿科','doctor_erke',
    '小儿腹泻病','A09.9','腹泻伴呕吐2天',3),
  ('018','PAT-S221-018','急诊','doctor_jizhen',
    '急性泌尿系感染','N39.0','尿频尿急尿痛伴发热1天',2),
  ('019','PAT-S221-019','急诊','doctor_jizhen',
    '急性腰扭伤','S33.5','搬重物后腰痛活动受限6小时',1),
  ('020','PAT-S221-020','急诊','doctor_jizhen',
    '急性胃炎','K29.7','饮酒后上腹痛伴恶心呕吐4小时',1);

-- 住院就诊（visit_no 稳定幂等）
INSERT INTO clinical.visits
  (patient_id, visit_no, visit_type, department, attending_doctor_id,
   chief_complaint, status, admit_at)
SELECT p.id, 'IP221-' || t.seq, 'inpatient', t.dept, u.id,
       t.complaint, 'ongoing', now() - make_interval(days => t.days)
FROM tmp_s221_inp t
JOIN clinical.patients p ON p.mrn = t.mrn
JOIN iam.users u ON u.username = t.doctor_user
ON CONFLICT (visit_no) DO NOTHING;

-- ICD-10 诊断（每就诊一条主诊断；visit+code 已存在则跳过）
INSERT INTO clinical.diagnoses
  (visit_id, patient_id, code, name, kind, confirmed, doctor_id)
SELECT v.id, p.id, t.icd, t.diagnosis, 'primary', true, u.id
FROM tmp_s221_inp t
JOIN clinical.patients p ON p.mrn = t.mrn
JOIN iam.users u ON u.username = t.doctor_user
JOIN clinical.visits v ON v.visit_no = 'IP221-' || t.seq
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.diagnoses d
  WHERE d.visit_id = v.id AND d.code = t.icd
);

-- ---------------------------------------------------------------------------
-- 4. 住院医嘱（20 条：ORD221-001~010 为待审批，011~020 为已生效/已执行）
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_s221_ord (
  order_no text, seq text, order_type text, content text,
  priority text, status text, doctor_user text, dbl boolean
) ON COMMIT DROP;

INSERT INTO tmp_s221_ord VALUES
  -- 待审批医嘱（pending_review）
  ('ORD221-001','001','drug','注射用头孢呋辛钠 1.5g 静脉滴注 q8h','routine','pending_review','doctor_neike',false),
  ('ORD221-002','002','drug','门冬胰岛素注射液 早12U 晚8U 皮下注射','routine','pending_review','doctor_neike',true),
  ('ORD221-003','003','drug','苯磺酸氨氯地平片 5mg 口服 qd','routine','pending_review','doctor_neike',false),
  ('ORD221-004','004','lab','头颅磁共振（MRI）平扫','routine','pending_review','doctor_neike',false),
  ('ORD221-005','005','drug','注射用泮托拉唑钠 40mg 静脉滴注 qd','routine','pending_review','doctor_neike',false),
  ('ORD221-006','006','drug','注射用头孢哌酮钠舒巴坦钠 2g 静脉滴注 q12h','routine','pending_review','doctor_waike',false),
  ('ORD221-007','007','drug','甲硝唑氯化钠注射液 100ml 静脉滴注 q12h','routine','pending_review','doctor_waike',false),
  ('ORD221-008','008','treatment','切口换药 q2d','routine','pending_review','doctor_waike',false),
  ('ORD221-009','011','drug','注射用头孢西丁钠 2g 静脉滴注 q12h','routine','pending_review','doctor_fuke',false),
  ('ORD221-010','018','drug','左氧氟沙星注射液 0.5g 静脉滴注 qd','urgent','pending_review','doctor_jizhen',false),
  -- 已生效/已执行医嘱
  ('ORD221-011','001','lab','血常规+C反应蛋白 复查','routine','active','doctor_neike',false),
  ('ORD221-012','002','lab','糖化血红蛋白+空腹血糖 复查','routine','active','doctor_neike',false),
  ('ORD221-013','003','diet','低盐低脂饮食','routine','active','doctor_neike',false),
  ('ORD221-014','006','treatment','禁食水、胃肠减压','urgent','executed','doctor_waike',false),
  ('ORD221-015','009','nursing','患肢抬高、观察末梢血运','routine','active','doctor_waike',false),
  ('ORD221-016','011','lab','血常规+凝血功能 术前检查','routine','executed','doctor_fuke',false),
  ('ORD221-017','015','drug','布洛芬混悬液 5ml 口服 prn 退热','routine','active','doctor_erke',false),
  ('ORD221-018','016','drug','复方氯己定含漱液 10ml 含漱 tid','routine','active','doctor_erke',false),
  ('ORD221-019','017','diet','口服补液盐Ⅲ 50ml/kg 分次服用','routine','active','doctor_erke',false),
  ('ORD221-020','020','drug','注射用艾司奥美拉唑钠 40mg 静脉滴注 qd','urgent','executed','doctor_jizhen',false);

INSERT INTO clinical.orders
  (visit_id, order_no, order_type, content, detail, priority, status,
   doctor_id, category, reviewer_id, reviewed_at, requires_double_check, start_at)
SELECT v.id, o.order_no, o.order_type, o.content,
       jsonb_build_object('source','seed-221'),
       o.priority, o.status, ud.id, 'short_term',
       CASE WHEN o.status = 'pending_review' THEN NULL ELSE ud.id END,
       CASE WHEN o.status = 'pending_review' THEN NULL
            ELSE now() - interval '1 day' END,
       o.dbl,
       now() - CASE WHEN o.status = 'pending_review' THEN interval '2 hours'
                    ELSE interval '2 days' END
FROM tmp_s221_ord o
JOIN clinical.visits v ON v.visit_no = 'IP221-' || o.seq
JOIN iam.users ud ON ud.username = o.doctor_user
ON CONFLICT (order_no) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. 手术申请（10 台：外科5、妇科4、儿科1；含已完成与待排程）
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_s221_surg (
  request_no text, seq text, procedure text, diagnosis text,
  planned_date date, surgeon_user text, status text, emerg boolean
) ON COMMIT DROP;

INSERT INTO tmp_s221_surg VALUES
  ('SR221-001','006','腹腔镜阑尾切除术','急性阑尾炎',CURRENT_DATE - interval '2 day','doctor_waike','discharged',true),
  ('SR221-002','007','腹腔镜胆囊切除术','胆囊结石伴慢性胆囊炎急性发作',CURRENT_DATE - interval '3 day','doctor_waike','discharged',false),
  ('SR221-003','008','右侧腹股沟疝无张力修补术','右侧腹股沟斜疝',CURRENT_DATE - interval '1 day','doctor_waike','discharged',false),
  ('SR221-004','009','左侧桡骨远端骨折切开复位钢板内固定术','左侧桡骨远端骨折',CURRENT_DATE - interval '2 day','doctor_waike','discharged',false),
  ('SR221-005','010','甲状腺腺瘤切除术','甲状腺腺瘤',CURRENT_DATE + interval '1 day','doctor_waike','scheduled',false),
  ('SR221-006','011','腹腔镜子宫肌瘤剔除术','子宫多发肌瘤',CURRENT_DATE - interval '2 day','doctor_fuke','discharged',false),
  ('SR221-007','012','腹腔镜右侧输卵管切除术','右侧输卵管妊娠',CURRENT_DATE - interval '1 day','doctor_fuke','discharged',true),
  ('SR221-008','013','腹腔镜右侧卵巢囊肿剥除术','右侧卵巢囊肿',CURRENT_DATE + interval '2 day','doctor_fuke','scheduled',false),
  ('SR221-009','014','宫颈锥形切除术','慢性宫颈炎',CURRENT_DATE - interval '1 day','doctor_fuke','discharged',false),
  ('SR221-010','015','左侧鞘状突高位结扎术','小儿腹股沟疝',DATE '2026-10-20','doctor_erke','scheduled',false);

INSERT INTO clinical.surgery_requests
  (request_no, visit_id, patient_id, surgery_type, planned_procedure, diagnosis,
   planned_date, department, surgeon_id, status, started_at, ended_at,
   surgeon_signed_at, created_by)
SELECT s.request_no, v.id, p.id,
       CASE WHEN s.emerg THEN 'emergency' ELSE 'elective' END,
       s.procedure, s.diagnosis, s.planned_date, t.dept, u.id, s.status,
       CASE WHEN s.status = 'discharged' THEN (s.planned_date::timestamptz + interval '9 hours') END,
       CASE WHEN s.status = 'discharged' THEN (s.planned_date::timestamptz + interval '11 hours 30 minutes') END,
       CASE WHEN s.status = 'discharged' THEN (s.planned_date::timestamptz + interval '12 hours') END,
       u.id
FROM tmp_s221_surg s
JOIN tmp_s221_inp t ON t.seq = s.seq
JOIN clinical.patients p ON p.mrn = t.mrn
JOIN clinical.visits v ON v.visit_no = 'IP221-' || s.seq
JOIN iam.users u ON u.username = s.surgeon_user
ON CONFLICT (request_no) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. 检验结果（每在院患者 2 条；其中 5 条为危急值）
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_s221_lab (
  seq text, panel text, item text, code text, specimen text,
  value text, num numeric, unit text, lo numeric, hi numeric,
  flag text, crit boolean
) ON COMMIT DROP;

INSERT INTO tmp_s221_lab VALUES
  -- 内科
  ('001','血常规','白细胞计数','6690-2','静脉血','0.8',0.8,'10^9/L',3.5,9.5,'LL',true),
  ('001','血常规','C反应蛋白','1988-5','静脉血','86.4',86.4,'mg/L',0,10,'H',false),
  ('002','生化','空腹血糖','2345-7','静脉血','1.8',1.8,'mmol/L',3.9,6.1,'LL',true),
  ('002','血常规','糖化血红蛋白','4548-4','静脉血','9.6',9.6,'%',4,6.5,'H',false),
  ('003','生化','血钾','2823-3','静脉血','3.6',3.6,'mmol/L',3.5,5.3,'N',false),
  ('003','生化','血钠','2951-2','静脉血','138',138,'mmol/L',137,147,'N',false),
  ('004','血常规','血红蛋白','718-7','静脉血','112',112,'g/L',115,150,'L',false),
  ('004','生化','肌酐','2160-0','静脉血','78',78,'umol/L',41,81,'N',false),
  ('005','粪便常规','粪隐血','2335-8','粪便','阳性',NULL,'',NULL,NULL,'H',false),
  ('005','血常规','血红蛋白','718-7','静脉血','96',96,'g/L',115,150,'L',false),
  -- 外科
  ('006','血常规','白细胞计数','6690-2','静脉血','14.2',14.2,'10^9/L',3.5,9.5,'H',false),
  ('006','生化','C反应蛋白','1988-5','静脉血','42.1',42.1,'mg/L',0,10,'H',false),
  ('007','生化','血钾','2823-3','静脉血','2.7',2.7,'mmol/L',3.5,5.3,'LL',true),
  ('007','血常规','白细胞计数','6690-2','静脉血','11.5',11.5,'10^9/L',3.5,9.5,'H',false),
  ('008','血常规','白细胞计数','6690-2','静脉血','6.8',6.8,'10^9/L',3.5,9.5,'N',false),
  ('008','凝血功能','凝血酶原时间','5902-2','静脉血','12.4',12.4,'秒',11,14.5,'N',false),
  ('009','血常规','血红蛋白','718-7','静脉血','128',128,'g/L',115,150,'N',false),
  ('009','放射科','X线复查','36643-5','','左桡骨远端骨折术后改变',NULL,'',NULL,NULL,'N',false),
  ('010','生化','促甲状腺激素','3016-3','静脉血','2.1',2.1,'mIU/L',0.27,4.2,'N',false),
  ('010','血常规','白细胞计数','6690-2','静脉血','5.9',5.9,'10^9/L',3.5,9.5,'N',false),
  -- 妇科
  ('011','血常规','血红蛋白','718-7','静脉血','52',52,'g/L',115,150,'LL',true),
  ('011','生化','人绒毛膜促性腺激素','21198-7','静脉血','阴性',NULL,'',NULL,NULL,'N',false),
  ('012','生化','人绒毛膜促性腺激素','21198-7','静脉血','2860',2860,'IU/L',NULL,5,'H',false),
  ('012','血常规','血红蛋白','718-7','静脉血','102',102,'g/L',115,150,'L',false),
  ('013','超声科','盆腔超声','36643-5','','右侧卵巢囊肿约5cm',NULL,'',NULL,NULL,'N',false),
  ('013','血常规','白细胞计数','6690-2','静脉血','6.2',6.2,'10^9/L',3.5,9.5,'N',false),
  ('014','妇科检查','白带常规','57133-7','阴道分泌物','清洁度Ⅲ度',NULL,'',NULL,NULL,'H',false),
  ('014','血常规','白细胞计数','6690-2','静脉血','7.1',7.1,'10^9/L',3.5,9.5,'N',false),
  -- 儿科
  ('015','血常规','白细胞计数','6690-2','静脉血','11.8',11.8,'10^9/L',5,12,'H',false),
  ('015','生化','C反应蛋白','1988-5','静脉血','18.5',18.5,'mg/L',0,8,'H',false),
  ('016','血常规','白细胞计数','6690-2','静脉血','13.6',13.6,'10^9/L',5,12,'H',false),
  ('016','生化','C反应蛋白','1988-5','静脉血','35.2',35.2,'mg/L',0,8,'H',false),
  ('017','粪便常规','轮状病毒抗原','47312-0','粪便','阳性',NULL,'',NULL,NULL,'H',false),
  ('017','生化','血钾','2823-3','静脉血','3.3',3.3,'mmol/L',3.5,5.3,'L',false),
  -- 急诊
  ('018','尿常规','尿白细胞酯酶','5821-4','尿液','阳性',NULL,'',NULL,NULL,'H',false),
  ('018','生化','血钾','2823-3','静脉血','6.9',6.9,'mmol/L',3.5,5.3,'HH',true),
  ('019','放射科','腰椎X线','36643-5','','未见明显骨折',NULL,'',NULL,NULL,'N',false),
  ('019','生化','C反应蛋白','1988-5','静脉血','6.5',6.5,'mg/L',0,10,'N',false),
  ('020','血常规','白细胞计数','6690-2','静脉血','9.8',9.8,'10^9/L',3.5,9.5,'H',false),
  ('020','生化','谷丙转氨酶','1742-6','静脉血','22',22,'U/L',7,40,'N',false);

INSERT INTO clinical.lab_results
  (visit_id, patient_id, report_no, panel_name, item_name, item_code, specimen,
   value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time)
SELECT v.id, p.id,
       'RPT221-' || t.seq || '-' || row_number() OVER (PARTITION BY t.seq ORDER BY t.item),
       t.panel, t.item, t.code, t.specimen,
       t.value, t.num, t.unit, t.lo, t.hi, t.flag, t.crit,
       now() - interval '12 hours'
FROM tmp_s221_lab t
JOIN clinical.patients p ON p.mrn = 'PAT-S221-' || t.seq
JOIN clinical.visits v ON v.visit_no = 'IP221-' || t.seq
WHERE NOT EXISTS (
  SELECT 1 FROM clinical.lab_results l
  WHERE l.visit_id = v.id AND l.item_name = t.item
);

-- ---------------------------------------------------------------------------
-- 7. 危急值告警（5 条，状态 raised 待签收；按 lab_result_id 唯一幂等）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.critical_value_alerts
  (lab_result_id, visit_id, patient_id, department,
   item_name, item_code, value, unit, ref_low, ref_high, flag,
   status, raised_at)
SELECT l.id, l.visit_id, l.patient_id, v.department,
       l.item_name, l.item_code, l.value, l.unit, l.ref_low, l.ref_high,
       l.abnormal_flag, 'raised', l.result_time
FROM clinical.lab_results l
JOIN clinical.visits v ON v.id = l.visit_id
WHERE l.is_critical = true
  AND l.visit_id IN (SELECT id FROM clinical.visits WHERE visit_no LIKE 'IP221-%')
  AND NOT EXISTS (
    SELECT 1 FROM clinical.critical_value_alerts c WHERE c.lab_result_id = l.id
  );

-- ---------------------------------------------------------------------------
-- 8. 当日门诊挂号（30 条：5 科室 × 6 人；visit_no 含日期，天然幂等）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.patients
  (mrn, name_masked, gender, birth_date, blood_type, allergies, past_history, tags, data_level)
VALUES
  ('PAT-S221-OP01','钱*','男',DATE '1960-05-10','A','[]'::jsonb,'[]'::jsonb,'["随访"]'::jsonb,3),
  ('PAT-S221-OP02','孙*','女',DATE '1965-08-22','O','[]'::jsonb,'[]'::jsonb,'["高血压"]'::jsonb,3),
  ('PAT-S221-OP03','周*','男',DATE '1972-01-15','B','[]'::jsonb,'[]'::jsonb,'["胃病"]'::jsonb,3),
  ('PAT-S221-OP04','吴*','女',DATE '1980-11-30','AB','[]'::jsonb,'[]'::jsonb,'["乏力待查"]'::jsonb,3),
  ('PAT-S221-OP05','郑*','男',DATE '1958-03-08','O','[]'::jsonb,'[]'::jsonb,'["糖尿病"]'::jsonb,3),
  ('PAT-S221-OP06','王*','女',DATE '1975-09-19','A','[]'::jsonb,'[]'::jsonb,'["头晕"]'::jsonb,3),
  ('PAT-S221-OP07','冯*','男',DATE '1983-06-25','B','[]'::jsonb,'[]'::jsonb,'["体表肿物"]'::jsonb,3),
  ('PAT-S221-OP08','褚*','女',DATE '1990-12-02','O','[]'::jsonb,'[]'::jsonb,'["乳腺结节"]'::jsonb,3),
  ('PAT-S221-OP09','卫*','男',DATE '1976-04-14','A','[]'::jsonb,'[]'::jsonb,'["疝复查"]'::jsonb,3),
  ('PAT-S221-OP10','蒋*','女',DATE '1988-07-20','AB','[]'::jsonb,'[]'::jsonb,'["甲状腺复查"]'::jsonb,3),
  ('PAT-S221-OP11','沈*','男',DATE '1969-10-11','O','[]'::jsonb,'[]'::jsonb,'["痔疮"]'::jsonb,3),
  ('PAT-S221-OP12','韩*','女',DATE '1995-02-28','B','[]'::jsonb,'[]'::jsonb,'["外伤换药"]'::jsonb,3),
  ('PAT-S221-OP13','杨*','女',DATE '1986-05-16','A','[]'::jsonb,'[]'::jsonb,'["月经不调"]'::jsonb,3),
  ('PAT-S221-OP14','朱*','女',DATE '1991-08-09','O','[]'::jsonb,'[]'::jsonb,'["孕前检查"]'::jsonb,3),
  ('PAT-S221-OP15','秦*','女',DATE '1979-11-25','B','[]'::jsonb,'[]'::jsonb,'["卵巢囊肿复查"]'::jsonb,3),
  ('PAT-S221-OP16','尤*','女',DATE '1993-03-30','AB','[]'::jsonb,'[]'::jsonb,'["阴道炎"]'::jsonb,3),
  ('PAT-S221-OP17','许*','女',DATE '1984-06-18','A','[]'::jsonb,'[]'::jsonb,'["痛经"]'::jsonb,3),
  ('PAT-S221-OP18','何*','女',DATE '1996-09-05','O','[]'::jsonb,'[]'::jsonb,'["多囊卵巢"]'::jsonb,3),
  ('PAT-S221-OP19','吕*','男',DATE '2019-04-12','A','[]'::jsonb,'[]'::jsonb,'["发热"]'::jsonb,3),
  ('PAT-S221-OP20','施*','女',DATE '2020-07-23','O','[]'::jsonb,'[]'::jsonb,'["咳嗽"]'::jsonb,3),
  ('PAT-S221-OP21','张*','男',DATE '2021-10-30','B','[]'::jsonb,'[]'::jsonb,'["腹泻"]'::jsonb,3),
  ('PAT-S221-OP22','孔*','女',DATE '2018-12-08','AB','[]'::jsonb,'[]'::jsonb,'["皮疹"]'::jsonb,3),
  ('PAT-S221-OP23','曹*','男',DATE '2022-02-17','A','[]'::jsonb,'[]'::jsonb,'["呕吐"]'::jsonb,3),
  ('PAT-S221-OP24','严*','女',DATE '2019-09-25','O','[]'::jsonb,'[]'::jsonb,'["咽痛"]'::jsonb,3),
  ('PAT-S221-OP25','华*','男',DATE '1974-01-19','B','[]'::jsonb,'[]'::jsonb,'["胸痛待查"]'::jsonb,3),
  ('PAT-S221-OP26','金*','女',DATE '1982-05-07','A','[]'::jsonb,'[]'::jsonb,'["腹痛1天"]'::jsonb,3),
  ('PAT-S221-OP27','魏*','男',DATE '1966-08-14','O','[]'::jsonb,'[]'::jsonb,'["外伤出血"]'::jsonb,3),
  ('PAT-S221-OP28','陶*','女',DATE '1990-11-03','AB','[]'::jsonb,'[]'::jsonb,'["头晕摔倒"]'::jsonb,3),
  ('PAT-S221-OP29','姜*','男',DATE '1985-04-26','A','[]'::jsonb,'[]'::jsonb,'["高热39度"]'::jsonb,3),
  ('PAT-S221-OP30','戚*','女',DATE '1977-12-12','O','[]'::jsonb,'[]'::jsonb,'["哮喘发作"]'::jsonb,3)
ON CONFLICT (mrn) DO NOTHING;

CREATE TEMP TABLE tmp_s221_op (
  seq text, mrn text, dept text, doctor_user text, complaint text, urgent boolean
) ON COMMIT DROP;

INSERT INTO tmp_s221_op VALUES
  ('01','PAT-S221-OP01','内科','doctor_neike','胸闷心悸1周',false),
  ('02','PAT-S221-OP02','内科','doctor_neike','血压控制不佳随访',false),
  ('03','PAT-S221-OP03','内科','doctor_neike','反酸嗳气2周',false),
  ('04','PAT-S221-OP04','内科','doctor_neike','乏力纳差1月',false),
  ('05','PAT-S221-OP05','内科','doctor_neike','糖尿病随访调药',false),
  ('06','PAT-S221-OP06','内科','doctor_neike','反复头晕3天',false),
  ('07','PAT-S221-OP07','外科','doctor_waike','发现体表肿物1月',false),
  ('08','PAT-S221-OP08','外科','doctor_waike','乳腺结节复查',false),
  ('09','PAT-S221-OP09','外科','doctor_waike','腹股沟疝术后随访',false),
  ('10','PAT-S221-OP10','外科','doctor_waike','甲状腺结节复查',false),
  ('11','PAT-S221-OP11','外科','doctor_waike','便血伴肛门脱出',false),
  ('12','PAT-S221-OP12','外科','doctor_waike','外伤后伤口换药',false),
  ('13','PAT-S221-OP13','妇科','doctor_fuke','月经周期紊乱3月',false),
  ('14','PAT-S221-OP14','妇科','doctor_fuke','孕前评估',false),
  ('15','PAT-S221-OP15','妇科','doctor_fuke','卵巢囊肿术后复查',false),
  ('16','PAT-S221-OP16','妇科','doctor_fuke','外阴瘙痒分泌物异常1周',false),
  ('17','PAT-S221-OP17','妇科','doctor_fuke','经期下腹痛加重',false),
  ('18','PAT-S221-OP18','妇科','doctor_fuke','备孕期间月经稀发',false),
  ('19','PAT-S221-OP19','儿科','doctor_erke','发热2天',false),
  ('20','PAT-S221-OP20','儿科','doctor_erke','咳嗽伴喘息3天',false),
  ('21','PAT-S221-OP21','儿科','doctor_erke','稀水样便1天',false),
  ('22','PAT-S221-OP22','儿科','doctor_erke','全身皮疹伴瘙痒',false),
  ('23','PAT-S221-OP23','儿科','doctor_erke','进食后反复呕吐',false),
  ('24','PAT-S221-OP24','儿科','doctor_erke','咽痛拒食1天',false),
  ('25','PAT-S221-OP25','急诊','doctor_jizhen','活动后胸痛2小时',true),
  ('26','PAT-S221-OP26','急诊','doctor_jizhen','持续性下腹痛6小时',true),
  ('27','PAT-S221-OP27','急诊','doctor_jizhen','刀切伤出血不止30分钟',true),
  ('28','PAT-S221-OP28','急诊','doctor_jizhen','跌倒后头部着地',true),
  ('29','PAT-S221-OP29','急诊','doctor_jizhen','突发高热伴寒战',true),
  ('30','PAT-S221-OP30','急诊','doctor_jizhen','接触过敏原后气促半小时',true);

-- 当日门诊就诊：号次 01~30 对应 08:00 起每 9 分钟一个号
INSERT INTO clinical.visits
  (patient_id, visit_no, visit_type, department, attending_doctor_id,
   chief_complaint, triage_level, status, admit_at)
SELECT p.id,
       'OP221' || to_char(CURRENT_DATE,'YYYYMMDD') || '-' || t.seq,
       'outpatient', t.dept, u.id, t.complaint,
       CASE WHEN t.urgent THEN '加急' ELSE '普通' END,
       'ongoing',
       CURRENT_DATE::timestamptz
         + interval '8 hours'
         + (SUBSTRING(t.seq FROM '[0-9]+')::int * interval '9 minutes')
FROM tmp_s221_op t
JOIN clinical.patients p ON p.mrn = t.mrn
JOIN iam.users u ON u.username = t.doctor_user
ON CONFLICT (visit_no) DO NOTHING;
