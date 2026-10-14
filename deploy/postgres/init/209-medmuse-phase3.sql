-- ============================================================================
-- 健澜科技 jlmedaios · M89-E MEDMUSE Phase 3：药师 / 医保办 / 患者端岗位智能助手
--
-- 三个新岗位 agent 与六个新工具：
--   pharmacist  临床药师：处方前置审核（listPendingPrescriptions / reviewPrescription）
--   finance     医保办：DRG/DIP 超支只读汇总（summarizeOverspend / listOverspendCases）
--   patient     患者端：随访提醒（listFollowups / getFollowupGuidance）
--
-- 医疗安全红线：
--   - 药师 agent 仅记录审方意见与通过/退回决定，绝不自行修改处方药品内容；
--   - 医保办 agent 全部为只读聚合，不写费用、不调整结算；
--   - 患者端 agent 只读提醒，不回写病历、不做诊断、不开药；
--   - reviewPrescription 为 warning 级，执行前必须经药师本人二次确认（Sentinel）。
--
-- 幂等：权限/工具/角色种子 ON CONFLICT DO NOTHING；agent 提示词用
-- ON CONFLICT DO UPDATE 对齐 Phase 3 岗位边界；role_code CHECK 幂等扩展 finance。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 权限码：medmuse:pharmacist / medmuse:insurance / medmuse:patient
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medmuse:pharmacist', '药师智能助手', 'medmuse',
   '临床药师岗位智能体：处方前置审核、审方意见与通过/退回（不修改处方内容）'),
  ('medmuse:insurance', '医保办智能助手', 'medmuse',
   '医保办岗位智能体：DRG/DIP 当月超支只读汇总与病组钻取'),
  ('medmuse:patient', '患者端智能助手', 'medmuse',
   '患者端岗位智能体：随访提醒与随访话术引导（不回写病历）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('pharmacist', 'medmuse:pharmacist'),
  ('admin',      'medmuse:pharmacist'),
  ('finance',    'medmuse:insurance'),
  ('admin',      'medmuse:insurance'),
  ('patient',    'medmuse:patient'),
  ('admin',      'medmuse:patient')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- role_code CHECK 幂等扩展：允许 finance（200 原约束未含医保办岗位）
-- ---------------------------------------------------------------------------
ALTER TABLE clinical.medmuse_agents DROP CONSTRAINT IF EXISTS medmuse_agents_role_code_check;
ALTER TABLE clinical.medmuse_agents ADD CONSTRAINT medmuse_agents_role_code_check
  CHECK (role_code IN (
    'attending', 'resident', 'nurse', 'pharmacist',
    'medical_director', 'patient', 'finance'
  ));

-- ---------------------------------------------------------------------------
-- 六个新工具种子（幂等；schema 为 OpenAI function calling 完整 JSON Schema）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tools (name, description, schema, risk_level) VALUES
  (
    'listPendingPrescriptions',
    '列出当前待前置审核的处方（按风险等级与时间排序）',
    '{"type":"function","function":{"name":"listPendingPrescriptions","description":"列出当前待前置审核的处方","parameters":{"type":"object","properties":{"onlyHighRisk":{"type":"boolean","description":"仅返回高风险处方"}}}}}',
    'info'
  ),
  (
    'reviewPrescription',
    '对指定处方给出审方意见并通过/退回（warning，需药师本人确认；不修改处方内容）',
    '{"type":"function","function":{"name":"reviewPrescription","description":"对指定处方给出审方意见并通过或退回（不修改处方药品内容）","parameters":{"type":"object","properties":{"prescriptionId":{"type":"string","description":"处方ID"},"decision":{"type":"string","enum":["approve","reject"],"description":"审核结论：通过或退回"},"opinion":{"type":"string","description":"审方意见；退回时必填"}},"required":["prescriptionId","decision"]}}}',
    'warning'
  ),
  (
    'summarizeOverspend',
    '按病组汇总当月 DRG/DIP 超支金额与例数（只读聚合）',
    '{"type":"function","function":{"name":"summarizeOverspend","description":"按病组汇总当月 DRG/DIP 超支金额与例数（只读）","parameters":{"type":"object","properties":{"period":{"type":"string","enum":["month"],"description":"汇总周期，默认当月","default":"month"}}}}}',
    'info'
  ),
  (
    'listOverspendCases',
    '钻取指定病组当月超支的病例明细（只读）',
    '{"type":"function","function":{"name":"listOverspendCases","description":"钻取指定病组当月超支病例明细（只读）","parameters":{"type":"object","properties":{"groupCode":{"type":"string","description":"病组编码，可空，默认全部超支病组"}}}}}',
    'info'
  ),
  (
    'listFollowups',
    '列出待随访患者与随访日期（逾期优先、按日期升序）',
    '{"type":"function","function":{"name":"listFollowups","description":"列出待随访患者与随访日期","parameters":{"type":"object","properties":{}}}}}',
    'info'
  ),
  (
    'getFollowupGuidance',
    '生成随访沟通话术模板（只读，不回写病历、不做诊断）',
    '{"type":"function","function":{"name":"getFollowupGuidance","description":"生成指定随访的沟通话术模板（只读）","parameters":{"type":"object","properties":{"visitId":{"type":"string","description":"就诊ID"},"timepoint":{"type":"string","description":"随访节点，可空"}},"required":["visitId"]}}}',
    'info'
  )
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 三个岗位 agent 种子（幂等；system_prompt 含医疗安全红线）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_agents (role_code, user_id, name, system_prompt) VALUES
  (
    'pharmacist', NULL, '临床药师智能体',
    '你是健澜数智医院操作系统中的临床药师岗位智能体，协助药师完成处方前置审核、药物相互作用提示与用药教育。你必须：1）所有输出标注"AI 辅助建议"；2）安全红线：你不得自行修改处方的任何药品、剂量、频次或用法，仅能给出审方意见并作出通过/退回的建议，最终处方调整由开方医师完成；3）reviewPrescription 为 warning 级，执行前必须请求药师本人二次确认；4）抗菌药物、高危药品提示须引用说明书与药典依据；5）数据缺失时明确告知。语气专业、审慎。'
  ),
  (
    'finance', NULL, '医保办智能体',
    '你是健澜数智医院操作系统中的医保办岗位智能体，协助医保办完成 DRG/DIP 当月超支监测与病组钻取。你必须：1）所有输出标注"AI 辅助建议"；2）安全红线：你全部为只读聚合，不得写入费用、不得调整结算或病种分值，超支结论仅供医保办人工分析；3）金额与例数必须引用聚合数据，不臆造；4）数据缺失或聚合源不可用时明确返回结构化占位说明，不编造数字；5）涉及病组盈亏归因仅作提示，最终结算决策由医保办人工做出。语气客观、克制。'
  ),
  (
    'patient', NULL, '患者服务智能体',
    '你是健澜数智医院操作系统中的患者服务智能体，面向患者提供温和的随访提醒、健康科普与报告查询引导。你必须：1）语气亲切、通俗，避免医学术语堆砌；2）安全红线：你不回写、不修改任何病历或诊疗记录，只做提醒与话术引导；3）不做诊断、不开药、不把随访数值解读为诊断结论；4）涉及用药、病情变化的问题一律建议"请联系您的主管医生"；5）随访日期与患者信息以系统数据为准，不编造。语气温暖、有同理心。'
  )
ON CONFLICT (role_code) DO UPDATE
  SET name = EXCLUDED.name,
      system_prompt = EXCLUDED.system_prompt,
      updated_at = now();
