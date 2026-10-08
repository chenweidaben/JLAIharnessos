-- ============================================================================
-- 健澜科技 jlmedaios · M15-A 临床路径管理闭环
--
--  依据国家《临床路径管理指导原则》、电子病历五级评审与三甲医院评审要求，
--  补齐临床路径全流程数据底座：
--   - clinical.pathway_definitions  结构化路径定义（病种/ICD/科室/标准住院日
--     + 入径/排除/出院标准，结构化 JSON 数组）；
--   - clinical.pathway_form_items   按天/阶段标准医嘱表单（必选/可选，可一键下达）；
--   - clinical.pathway_enrollments  入径记录（状态机 in_path -> completed/withdrawn）；
--   - clinical.pathway_executions  表单项目执行记录（与真实医嘱 orders 关联）；
--   - clinical.pathway_variations  变异记录（正性/负性 + 原因分类）。
--  质控指标（入径率/完成率/变异率/退出率/平均住院日与费用/变异原因分布）
--  由应用层实时聚合，不在此冗余建表。
--
--  权限码：pathway:read 查看，pathway:manage 入径/退出/出径管理（医师），
--  pathway:execute 路径项目执行（医师/护士），pathway:audit 质控指标（admin/质控）。
--
-- 医疗安全：AI 不自主开医嘱/诊断；标准医嘱仅为待确认清单，须执行人本人电子签名；
-- 入径/退出/完成出径均须有资质医师签名；排除项命中不得入径，出院标准未逐项满足不得出径。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / DROP TRIGGER IF EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 结构化路径定义
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pathway_definitions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_code           text NOT NULL UNIQUE,
  name                   text NOT NULL,
  icd_code               text,
  applicable_departments jsonb NOT NULL DEFAULT '[]'::jsonb,
  standard_los           int,
  inclusion_criteria     jsonb NOT NULL DEFAULT '[]'::jsonb,
  exclusion_criteria     jsonb NOT NULL DEFAULT '[]'::jsonb,
  discharge_criteria     jsonb NOT NULL DEFAULT '[]'::jsonb,
  version                text NOT NULL DEFAULT '1.0',
  status                 text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','retired')),
  source_knowledge_id    uuid,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (standard_los IS NULL OR standard_los > 0)
);
CREATE INDEX IF NOT EXISTS idx_pwdef_icd ON clinical.pathway_definitions(icd_code);
CREATE INDEX IF NOT EXISTS idx_pwdef_status ON clinical.pathway_definitions(status);
DROP TRIGGER IF EXISTS trg_clinical_pwdef_updated ON clinical.pathway_definitions;
CREATE TRIGGER trg_clinical_pwdef_updated BEFORE UPDATE ON clinical.pathway_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 按天/阶段标准医嘱表单
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pathway_form_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id  uuid NOT NULL REFERENCES clinical.pathway_definitions(id) ON DELETE CASCADE,
  stage_day   int NOT NULL CHECK (stage_day >= 1),
  stage_name  text NOT NULL,
  item_code   text NOT NULL,
  item_type   text NOT NULL CHECK (item_type IN
                ('drug','lab','imaging','treatment','nursing','diet','other')),
  content     text NOT NULL,
  required    boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pathway_id, stage_day, item_code)
);
CREATE INDEX IF NOT EXISTS idx_pwform_pathway ON clinical.pathway_form_items(pathway_id, stage_day);

-- ---------------------------------------------------------------------------
-- 入径记录（状态机：in_path -> completed / withdrawn）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pathway_enrollments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_no            text NOT NULL UNIQUE,
  pathway_id               uuid NOT NULL REFERENCES clinical.pathway_definitions(id),
  visit_id                 uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id               uuid NOT NULL REFERENCES clinical.patients(id),
  enrollment_diagnosis     text NOT NULL,
  diagnosis_code            text,
  status                   text NOT NULL DEFAULT 'in_path'
                           CHECK (status IN ('in_path','completed','withdrawn')),
  enrolled_by              uuid NOT NULL REFERENCES iam.users(id),
  enrolled_at              timestamptz NOT NULL DEFAULT now(),
  completed_by             uuid REFERENCES iam.users(id),
  completed_at             timestamptz,
  discharge_criteria_met    jsonb,
  withdrawn_by             uuid REFERENCES iam.users(id),
  withdrawn_at             timestamptz,
  withdraw_reason          text,
  actual_los               int,
  actual_fee                numeric(12,2),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_id, pathway_id)
);
CREATE INDEX IF NOT EXISTS idx_pwenr_status ON clinical.pathway_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_pwenr_pathway ON clinical.pathway_enrollments(pathway_id);
CREATE INDEX IF NOT EXISTS idx_pwenr_visit ON clinical.pathway_enrollments(visit_id);
DROP TRIGGER IF EXISTS trg_clinical_pwenr_updated ON clinical.pathway_enrollments;
CREATE TRIGGER trg_clinical_pwenr_updated BEFORE UPDATE ON clinical.pathway_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 表单项目执行记录（与真实医嘱 orders 关联）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pathway_executions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES clinical.pathway_enrollments(id) ON DELETE CASCADE,
  form_item_id  uuid NOT NULL REFERENCES clinical.pathway_form_items(id),
  stage_day     int NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','executed','skipped','replaced')),
  order_id      uuid REFERENCES clinical.orders(id),
  note          text,
  executed_by   uuid REFERENCES iam.users(id),
  executed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, form_item_id)
);
CREATE INDEX IF NOT EXISTS idx_pwexe_enr ON clinical.pathway_executions(enrollment_id);
DROP TRIGGER IF EXISTS trg_clinical_pwexe_updated ON clinical.pathway_executions;
CREATE TRIGGER trg_clinical_pwexe_updated BEFORE UPDATE ON clinical.pathway_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 变异记录
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pathway_variations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_no  text NOT NULL UNIQUE,
  enrollment_id uuid NOT NULL REFERENCES clinical.pathway_enrollments(id) ON DELETE CASCADE,
  stage_day     int,
  variation_type text NOT NULL CHECK (variation_type IN ('positive','negative')),
  category      text NOT NULL CHECK (category IN
                  ('early_discharge','complication','resistance','abnormal_exam',
                   'patient_reason','diagnosis_change','other')),
  description   text NOT NULL,
  recorded_by   uuid NOT NULL REFERENCES iam.users(id),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  handled       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pwvar_enr ON clinical.pathway_variations(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_pwvar_type ON clinical.pathway_variations(variation_type);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('pathway:read',    '临床路径查看',   'clinical', '查看路径定义、表单、入径与执行情况'),
  ('pathway:manage',  '临床路径管理',   'clinical', '入径/变异登记/退出/完成出径管理与电子签名'),
  ('pathway:execute', '临床路径执行',   'clinical', '按路径表单一键下达标准医嘱与项目执行'),
  ('pathway:audit',   '临床路径质控',   'clinical', '入径率/完成率/变异率等质控指标')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'pathway:read'    WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='pathway:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'pathway:manage'  WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='pathway:manage');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'pathway:execute' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='pathway:execute');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', 'pathway:audit'   WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='admin' AND permission_code='pathway:audit');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'pathway:read'    WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='pathway:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'pathway:manage'  WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='pathway:manage');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', 'pathway:execute' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='doctor' AND permission_code='pathway:execute');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'pathway:read'    WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='pathway:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'nurse', 'pathway:execute' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='nurse' AND permission_code='pathway:execute');

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'technician', 'pathway:read' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='technician' AND permission_code='pathway:read');
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'pharmacist', 'pathway:read' WHERE NOT EXISTS (SELECT 1 FROM iam.role_permissions WHERE role_code='pharmacist' AND permission_code='pathway:read');

-- ---------------------------------------------------------------------------
-- 种子：三个结构化路径（社区获得性肺炎 / 慢阻肺急性加重 / 2型糖尿病）
--  source_knowledge_id 反查 knowledge.clinical_pathways，无对应行则为 null。
-- ---------------------------------------------------------------------------
INSERT INTO clinical.pathway_definitions
  (pathway_code, name, icd_code, applicable_departments, standard_los,
   inclusion_criteria, exclusion_criteria, discharge_criteria, source_knowledge_id)
SELECT v.pathway_code, v.name, v.icd_code, v.deps::jsonb, v.standard_los,
       v.inclusion::jsonb, v.exclusion::jsonb, v.discharge::jsonb,
       (SELECT k.id FROM knowledge.clinical_pathways k
         WHERE k.icd_code = v.icd_code ORDER BY k.disease LIMIT 1)
FROM (VALUES
  ('PW-CAP', '社区获得性肺炎', 'J18.9', '[]', 8,
   '["社区环境发病或入院后潜伏期外发病","胸部影像学证实新发肺部浸润影","排除其他明确病因"]'::jsonb,
   '["医院获得性肺炎","合并活动性肺结核","需机械通气的急危重症","合并其他需特殊路径的疾病"]'::jsonb,
   '["体温正常超过24小时","咳嗽咳痰等呼吸道症状明显改善","外周血白细胞恢复正常","胸部影像炎症较前吸收","病情稳定可出院随诊"]'::jsonb),
  ('PW-COPD', '慢性阻塞性肺疾病急性加重', 'J44.0', '[]', 10,
   '["明确慢阻肺病史","呼吸困难/咳嗽/咳痰较平时急性加重","除外其他病因"]'::jsonb,
   '["合并气胸需有创处理","合并急性心肌梗死","呼吸衰竭需有创机械通气","需转ICU者"]'::jsonb,
   '["症状缓解恢复至稳定基线","血气分析稳定","可耐受家庭氧疗/吸入治疗","掌握吸入装置使用","明确出院后随访计划"]'::jsonb),
  ('PW-T2DM', '2型糖尿病', 'E11.9', '[]', 10,
   '["确诊2型糖尿病","本次住院以血糖管理为主要目的","除外1型糖尿病与特殊类型糖尿病"]'::jsonb,
   '["糖尿病酮症酸中毒高渗状态需抢救","合并严重急性并发症","妊娠","合并其他危重基础病"]'::jsonb,
   '["空腹及餐后血糖控制达标且平稳","无急性并发症","掌握低血糖识别与处理","糖尿病饮食与运动指导完成","明确出院用药与随访计划"]'::jsonb)
) AS v(pathway_code, name, icd_code, deps, standard_los, inclusion, exclusion, discharge)
ON CONFLICT (pathway_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 种子：各路径按天表单项目（必选/可选），按 pathway_code 关联定义，幂等。
-- ---------------------------------------------------------------------------
INSERT INTO clinical.pathway_form_items
  (pathway_id, stage_day, stage_name, item_code, item_type, content, required, sort_order)
SELECT d.id, v.stage_day, v.stage_name, v.item_code, v.item_type, v.content, v.required, v.sort_order
FROM (VALUES
  -- 社区获得性肺炎（PW-CAP）
  ('PW-CAP', 1, '入院评估', 'CAP-D1-01', 'lab', '血常规+CRP+PCT炎症指标', true, 1),
  ('PW-CAP', 1, '入院评估', 'CAP-D1-02', 'imaging', '胸部CT或胸片明确浸润影', true, 2),
  ('PW-CAP', 1, '入院评估', 'CAP-D1-03', 'lab', '痰培养+血培养病原学检查', true, 3),
  ('PW-CAP', 1, '入院评估', 'CAP-D1-04', 'nursing', '入院护理评估+生命体征监测', true, 4),
  ('PW-CAP', 2, '经验性抗感染', 'CAP-D2-01', 'drug', '经验性抗感染治疗（按指南选择抗菌方案）', true, 1),
  ('PW-CAP', 2, '经验性抗感染', 'CAP-D2-02', 'nursing', '监测体温/呼吸频率/血氧饱和度', true, 2),
  ('PW-CAP', 2, '经验性抗感染', 'CAP-D2-03', 'treatment', '氧疗（按需维持SpO2目标）', false, 3),
  ('PW-CAP', 4, '目标治疗与评估', 'CAP-D4-01', 'drug', '根据病原学与药敏调整抗感染方案', true, 1),
  ('PW-CAP', 5, '目标治疗与评估', 'CAP-D5-01', 'nursing', '每日评估症状体征并记录', true, 1),
  ('PW-CAP', 8, '出院评估', 'CAP-D8-01', 'lab', '复查血常规+CRP评估疗效', true, 1),
  ('PW-CAP', 8, '出院评估', 'CAP-D8-02', 'other', '出院用药与复诊指导', true, 2),
  -- 慢阻肺急性加重（PW-COPD）
  ('PW-COPD', 1, '入院评估', 'COPD-D1-01', 'lab', '动脉血气分析', true, 1),
  ('PW-COPD', 1, '入院评估', 'COPD-D1-02', 'imaging', '胸部影像学评估', true, 2),
  ('PW-COPD', 1, '入院评估', 'COPD-D1-03', 'nursing', '入院护理评估+SpO2监测', true, 3),
  ('PW-COPD', 2, '支气管舒张治疗', 'COPD-D2-01', 'drug', '短效支气管扩张剂雾化+糖皮质激素', true, 1),
  ('PW-COPD', 2, '支气管舒张治疗', 'COPD-D2-02', 'treatment', '低流量控制性氧疗', true, 2),
  ('PW-COPD', 3, '抗感染与化痰', 'COPD-D3-01', 'drug', '有感染证据时抗感染治疗', false, 1),
  ('PW-COPD', 3, '抗感染与化痰', 'COPD-D3-02', 'treatment', '祛痰+体位引流排痰', true, 2),
  ('PW-COPD', 5, '康复评估', 'COPD-D5-01', 'nursing', '呼吸功能锻炼指导', true, 1),
  ('PW-COPD', 10, '出院评估', 'COPD-D10-01', 'other', '吸入装置使用指导+出院随访计划', true, 1),
  -- 2型糖尿病（PW-T2DM）
  ('PW-T2DM', 1, '入院评估', 'T2DM-D1-01', 'lab', '空腹血糖+糖化血红蛋白', true, 1),
  ('PW-T2DM', 1, '入院评估', 'T2DM-D1-02', 'lab', '尿常规+肝肾功能+电解质', true, 2),
  ('PW-T2DM', 1, '入院评估', 'T2DM-D1-03', 'nursing', '入院护理评估+糖尿病史采集', true, 3),
  ('PW-T2DM', 2, '血糖管理', 'T2DM-D2-01', 'diet', '糖尿病饮食医嘱', true, 1),
  ('PW-T2DM', 2, '血糖管理', 'T2DM-D2-02', 'nursing', '指尖血糖q6h监测', true, 2),
  ('PW-T2DM', 2, '血糖管理', 'T2DM-D2-03', 'drug', '制定降糖方案（口服药/胰岛素）', true, 3),
  ('PW-T2DM', 5, '教育与调整', 'T2DM-D5-01', 'treatment', '根据血糖谱调整降糖方案', true, 1),
  ('PW-T2DM', 5, '教育与调整', 'T2DM-D5-02', 'other', '糖尿病健康教育+低血糖识别', true, 2),
  ('PW-T2DM', 10, '出院评估', 'T2DM-D10-01', 'other', '出院用药指导+血糖自我监测随访计划', true, 1)
) AS v(pathway_code, stage_day, stage_name, item_code, item_type, content, required, sort_order)
JOIN clinical.pathway_definitions d ON d.pathway_code = v.pathway_code
ON CONFLICT (pathway_id, stage_day, item_code) DO NOTHING;
