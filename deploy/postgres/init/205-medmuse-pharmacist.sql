-- ============================================================================
-- 健澜科技 jlmedaios · M89-E MEDMUSE 药师岗位智能助手（处方前置审核）
--
-- 医疗安全红线：
--   - reviewPrescription 为 warning，函数体顶部强制 confirmed 校验；
--   - 所有审核决定必须由执业药师本人确认，AI 不得自行通过或拒绝处方；
--   - 配伍禁忌表仅作提示，不阻断处方，最终判定权在药师。
--
-- 幂等：权限/工具/规则种子均 ON CONFLICT DO NOTHING；agent 提示词用
-- ON CONFLICT DO UPDATE 对齐 M89-E 岗位边界。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 权限码：medmuse:pharmacist
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medmuse:pharmacist', '药师智能助手', 'medmuse',
   '药师岗位智能体：处方前置审核、配伍禁忌提醒、用药指导')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('pharmacist', 'medmuse:pharmacist'),
  ('admin', 'medmuse:pharmacist')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 配伍禁忌规则表（幂等）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_drug_interactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a         text NOT NULL,
  drug_b         text NOT NULL,
  severity       text NOT NULL CHECK (severity IN ('minor','major','contraindicated')),
  description    text NOT NULL,
  recommendation text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drug_a, drug_b)
);

COMMENT ON TABLE clinical.medmuse_drug_interactions IS
  'MEDMUSE 常见药物配伍禁忌规则库（AI 提示用，不阻断处方）';

INSERT INTO clinical.medmuse_drug_interactions
  (drug_a, drug_b, severity, description, recommendation) VALUES
  ('华法林', '阿司匹林', 'major',
   '华法林与阿司匹林联用显著增加消化道及颅内出血风险',
   '评估出血风险，必要时加用 PPI 保护，密切监测 INR'),
  ('华法林', '磺胺甲恶唑', 'contraindicated',
   '磺胺类置换华法林蛋白结合位点并抑制代谢，可致 INR 急升、严重出血',
   '避免联用，改用其他抗菌药物'),
  ('胰岛素', '普萘洛尔', 'minor',
   'β 受体阻滞剂掩盖低血糖心悸症状，延迟低血糖识别',
   '加强血糖监测，告知患者以出汗/饥饿为预警信号'),
  ('二甲双胍', '碘造影剂', 'major',
   '造影剂相关急性肾损伤叠加乳酸酸中毒风险',
   '造影前后 48 小时暂停二甲双胍，复查肾功能后恢复'),
  ('ACEI', '保钾利尿剂', 'major',
   '两者联用升高血钾，肾功能不全者尤甚',
   '监测血钾与肌酐，必要时减量'),
  ('左氧氟沙星', '含钙抗酸剂', 'minor',
   '二价离子螯合喹诺酮，降低吸收与血药浓度',
   '间隔 2 小时以上服用'),
  ('他汀类', '克拉霉素', 'contraindicated',
   'CYP3A4 抑制显著升高他汀血药浓度，横纹肌溶解风险',
   '联用期间暂停他汀或换用阿奇霉素'),
  ('甲硝唑', '酒精', 'contraindicated',
   '双硫仑样反应：面部潮红、心悸、呕吐',
   '用药期间及停药后 7 天内严格禁酒')
ON CONFLICT (drug_a, drug_b) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 药师专属工具种子（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tools (name, description, schema, risk_level) VALUES
  (
    'getPendingPrescriptions',
    '列出待药师审核的处方（前置审核队列）',
    '{"type":"function","function":{"name":"getPendingPrescriptions","description":"列出待药师审核的处方","parameters":{"type":"object","properties":{"limit":{"type":"integer","description":"返回上限，默认 20","default":20}}}}}',
    'info'
  ),
  (
    'reviewPrescription',
    '药师审核处方（approve/reject），需执业药师本人二次确认',
    '{"type":"function","function":{"name":"reviewPrescription","description":"药师审核处方，需二次确认","parameters":{"type":"object","properties":{"prescriptionId":{"type":"string","description":"处方ID"},"decision":{"type":"string","enum":["approve","reject"],"description":"审核结论"},"comment":{"type":"string","description":"审核意见，可空"}},"required":["prescriptionId","decision"]}}}',
    'warning'
  )
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- pharmacist agent 提示词对齐 M89-E（200 已种 pharmacist，这里更新岗位边界）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_agents (role_code, user_id, name, system_prompt) VALUES
  (
    'pharmacist', NULL, '临床药师智能体',
    '你是健澜数智医院操作系统的药师智能助手，负责处方前置审核、配伍禁忌提醒、用药指导。所有审核决定必须由执业药师本人确认，不得自行通过或拒绝处方。'
  )
ON CONFLICT (role_code) DO UPDATE
  SET name = EXCLUDED.name,
      system_prompt = EXCLUDED.system_prompt,
      updated_at = now();
