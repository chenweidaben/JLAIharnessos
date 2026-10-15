-- ============================================================================
-- 健澜科技 jlmedaios - M146-C 跨科室知识联邦深化（越用越聪明深化）
--
-- 【越用越聪明深化】
--   在 M133-C 跨院知识联邦、M145-B 跨科室知识推荐之上，把「科室间临床知识关联」
--   结构化为带证据强度（confidence 0~1）的知识关系表 medmuse.knowledge_relation：
--     心内科   → 急诊科：胸痛中心绿色通道 / 急性心衰抢救 / 恶性心律失常复苏衔接；
--     内分泌科 → 营养科：糖尿病医学营养治疗 / 体重管理 / 肾病低蛋白饮食；
--     外科     → 麻醉科：围术期评估 / 合并心血管病手术麻醉风险 / 术后镇痛。
--   每条关系锚定权威指南（evidence 字段可溯源），跨科知识关联要准确、不能乱推荐：
--   应用层一律不下发 confidence < 0.5 的关系（宁少勿滥红线）。
--
-- 表结构：medmuse.knowledge_relation
--   id            bigserial      主键（关系流水号）
--   relation_code text           稳定业务编码（REL-*，唯一）
--   dept_a        text           发起科室编码（clinical.departments.code）
--   dept_b        text           协同科室编码
--   relation_type text           emergency_link / nutrition_care / perioperative / consult
--   condition     text           关联临床场景 / 疾病
--   description   text           跨科协同要点
--   confidence    double         证据强度 0..1（<0.5 不推荐）
--   evidence      text           指南 / 共识出处（可溯源）
--   disease_ids   jsonb          关联疾病 id 数组（DIS-*）
--   symptoms      jsonb          关联症状关键词数组
--   created_at    timestamptz    落库时间（默认 now()）
--   updated_at    timestamptz    最近更新时间（默认 now()）
--
-- 医疗安全红线（生产加固）：
--   - 本表只登记「知识关系」，不携带任何患者标识 / 病历数据；
--   - 仅 doctor / admin 角色可读；patient / nurse / pharmacist 不下发；
--   - 幂等：CREATE TABLE / INSERT ... ON CONFLICT DO NOTHING，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 跨科室知识关系表（科室对 + 场景 + 证据强度；confidence 约束在 0..1）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.knowledge_relation (
  id            bigserial PRIMARY KEY,
  relation_code text           NOT NULL UNIQUE,
  dept_a        text           NOT NULL,
  dept_b        text           NOT NULL,
  relation_type text           NOT NULL,
  condition     text           NOT NULL,
  description   text           NOT NULL DEFAULT '',
  confidence    double precision NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence      text           NOT NULL DEFAULT '',
  disease_ids   jsonb          NOT NULL DEFAULT '[]'::jsonb,
  symptoms      jsonb          NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz    NOT NULL DEFAULT now(),
  updated_at    timestamptz    NOT NULL DEFAULT now()
);

-- 查询主路径：按科室对检索；按证据强度排序推荐
CREATE INDEX IF NOT EXISTS idx_knowledge_relation_pair
  ON medmuse.knowledge_relation (dept_a, dept_b);

CREATE INDEX IF NOT EXISTS idx_knowledge_relation_confidence
  ON medmuse.knowledge_relation (confidence DESC);

-- ---------------------------------------------------------------------------
-- 权限：跨科室知识联邦仅供医生 / 管理员查看（admin 全量放行在 BFF 侧已实现）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions(code, name, module) VALUES
  ('knowledge:federation:view', '跨科室知识联邦-查看', 'knowledge')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor', 'knowledge:federation:view'),
  ('admin',  'knowledge:federation:view')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 种子数据：三组指南背书的跨科映射（与 BFF knowledgeFederationAggregator 对齐）
-- ---------------------------------------------------------------------------
INSERT INTO medmuse.knowledge_relation
  (relation_code, dept_a, dept_b, relation_type, condition, description, confidence, evidence, disease_ids, symptoms) VALUES
  ('REL-CARDIO-ED-01', 'DEP-CARDIO', 'DEP-ED', 'emergency_link',
   '急性冠脉综合征胸痛中心绿色通道',
   '急诊首诊胸痛按胸痛中心流程快速筛查，确诊 STEMI 后绕行病房直接送导管室行再灌注治疗，D-to-B 时间窗无缝衔接。',
   0.96, '《胸痛中心建设标准》中华医学会心血管病学分会；急性 ST 段抬高型心肌梗死诊断和治疗指南',
   '["DIS-ACS"]', '["压榨样胸痛","胸闷","大汗","濒死感","放射至左肩背"]'),
  ('REL-CARDIO-ED-02', 'DEP-CARDIO', 'DEP-ED', 'emergency_link',
   '急性左心衰抢救与 CCU 衔接',
   '急诊科先行体位/氧疗/利尿扩血管抢救，病情稳定后转入心内科 CCU 行病因治疗与血流动力学监测。',
   0.90, '中国心力衰竭诊断和治疗指南',
   '["DIS-HF-ACUTE"]', '["呼吸困难","端坐呼吸","粉红色泡沫痰","夜间阵发性呼吸困难"]'),
  ('REL-CARDIO-ED-03', 'DEP-CARDIO', 'DEP-ED', 'emergency_link',
   '恶性心律失常急诊复苏后电生理衔接',
   '急诊科心肺复苏/电除颤/临时起搏维持循环后，心内科电生理团队评估猝死风险并决定 ICD 与消融方案。',
   0.88, '室性心律失常中国专家共识；心脏性猝死防治指南',
   '["DIS-ARRHY"]', '["心悸","晕厥","意识丧失","黑矇"]'),
  ('REL-ENDO-NUT-01', 'DEP-ENDO', 'DEP-NUTRITION', 'nutrition_care',
   '2型糖尿病医学营养治疗（MNT）',
   '内分泌科制定降糖方案，营养科同步出具个体化膳食处方，联合治疗显著优于单纯药物降糖。',
   0.93, '中国2型糖尿病防治指南；中国糖尿病医学营养治疗指南',
   '["DIS-T2DM"]', '["多饮","多尿","体重下降","血糖升高"]'),
  ('REL-ENDO-NUT-02', 'DEP-ENDO', 'DEP-NUTRITION', 'nutrition_care',
   '肥胖症医学体重管理',
   '内分泌科评估肥胖合并症，营养科提供低能量平衡膳食处方与行为干预，作为药物/手术治疗基础。',
   0.86, '中国肥胖症诊疗指南；减重药物临床应用专家共识',
   '["DIS-OBESITY"]', '["超重","腹型肥胖","体重指数升高"]'),
  ('REL-ENDO-NUT-03', 'DEP-ENDO', 'DEP-NUTRITION', 'nutrition_care',
   '糖尿病肾病低蛋白饮食干预',
   '营养科制定优质低蛋白（0.6~0.8 g/kg/d）联合 α-酮酸处方，内分泌科同步优化降糖降压，延缓 eGFR 下降。',
   0.80, '糖尿病肾病防治专家共识；慢性肾脏病蛋白营养治疗专家共识',
   '["DIS-DN","DIS-T2DM"]', '["水肿","蛋白尿","血肌酐升高"]'),
  ('REL-ENDO-NUT-04', 'DEP-ENDO', 'DEP-NUTRITION', 'nutrition_care',
   '妊娠期糖尿病医学营养管理',
   'GDM 确诊即启动营养科 MNT（分餐/低 GI 膳食），内分泌科随访血糖谱，必要时加用胰岛素。',
   0.75, '妊娠期高血糖诊治指南',
   '["DIS-GDM"]', '["孕期血糖升高","妊娠期多饮"]'),
  ('REL-SURG-ANES-01', 'DEP-SURG', 'DEP-ANES', 'perioperative',
   '腹部外科手术围术期麻醉管理',
   '外科确定手术指征后，麻醉科完成术前访视与 ASA 分级、制定麻醉与液体策略，术后 PACU 复苏。',
   0.95, '中国麻醉学指南与专家共识；围术期患者安全管理规范',
   '["DIS-SURG-ABDO"]', '["术前评估","拟行手术","术前禁食禁饮"]'),
  ('REL-SURG-ANES-02', 'DEP-SURG', 'DEP-ANES', 'perioperative',
   '合并心血管基础病患者手术麻醉风险评估',
   '麻醉科联合心内科完成 RCRI 风险分层与围术期用药桥接，平衡出血与缺血风险。',
   0.88, '围术期心血管评估指南；ACC/AHA 非心脏手术围术期评估',
   '["DIS-CARDIAC-SURG-RISK","DIS-ACS"]', '["高血压","术前胸闷","活动后气促"]'),
  ('REL-SURG-ANES-03', 'DEP-SURG', 'DEP-ANES', 'perioperative',
   '术后多模式镇痛与 PACU 复苏',
   '麻醉科主导多模式镇痛，外科管理切口与引流，共同降低术后并发症并加速康复（ERAS）。',
   0.82, '术后疼痛管理指南；加速康复外科中国专家共识',
   '["DIS-POSTOP-PAIN"]', '["术后疼痛","切口痛","术后恶心呕吐"]')
ON CONFLICT (relation_code) DO NOTHING;
