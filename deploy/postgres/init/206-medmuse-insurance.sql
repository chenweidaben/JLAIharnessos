-- ============================================================================
-- 健澜科技 jlmedaios · M89-F MEDMUSE 医保办智能助手（DRG/DIP 超支病例）
--
-- 医疗安全红线：
--   - 医保办 agent 仅做只读分析，不直接修改病例/费用；
--   - 超支病例仅作汇总提示，最终结算与申诉仍由医保办人工决策。
--
-- 幂等：权限/工具种子均 ON CONFLICT DO NOTHING；agent 提示词用
-- ON CONFLICT DO UPDATE 对齐 M89-F 岗位边界。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 权限码：medmuse:insurance
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medmuse:insurance', '医保办智能助手', 'medmuse',
   '医保办岗位智能体：DRG/DIP 超支病例汇总、成本异常预警、医保政策解答')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('admin', 'medmuse:insurance')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 医保办专属工具种子（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tools (name, description, schema, risk_level) VALUES
  (
    'listOverbudgetCases',
    '列出 DRG/DIP 超支病例（成本 > 权重*支付标准），并聚合 DIP 点值信息',
    '{"type":"function","function":{"name":"listOverbudgetCases","description":"列出已结算 DRG 超支病例并聚合 DIP 月度点值","parameters":{"type":"object","properties":{"deptName":{"type":"string","description":"科室名过滤，可空"},"limit":{"type":"integer","description":"返回上限，默认 30","default":30}}}}}',
    'info'
  )
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- insurance_officer agent 种子（M89-F 新增岗位）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_agents (role_code, user_id, name, system_prompt) VALUES
  (
    'insurance_officer', NULL, '医保办智能体',
    '你是健澜数智医院操作系统的医保办智能助手，负责 DRG/DIP 超支病例汇总、成本异常预警、医保政策解答。只读分析，不直接修改病例。'
  )
ON CONFLICT (role_code) DO UPDATE
  SET name = EXCLUDED.name,
      system_prompt = EXCLUDED.system_prompt,
      updated_at = now();
