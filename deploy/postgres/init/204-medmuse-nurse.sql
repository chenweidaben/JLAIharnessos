-- ============================================================================
-- 健澜科技 jlmedaios · M89-D MEDMUSE 护士岗位智能助手
--
-- 医疗安全红线：
--   - 护士 agent 不持有 createNoteDraft/suggestDiagnosis 等医师级工具；
--   - createNursingNote 为 warning，函数体顶部强制 confirmed 校验；
--   - 护士不得自行下达医嘱，写操作必须经责任护士本人确认。
--
-- 幂等：权限/工具/角色种子均 ON CONFLICT DO NOTHING；nurse agent 提示词用
-- ON CONFLICT DO UPDATE 对齐 M89-D 岗位边界。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 权限码：medmuse:nurse
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medmuse:nurse', '护士智能助手', 'medmuse',
   '护士岗位智能体：医嘱执行提醒、护理记录草稿、异常体征报警')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('nurse', 'medmuse:nurse'),
  ('admin', 'medmuse:nurse')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 护士专属工具种子（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tools (name, description, schema, risk_level) VALUES
  (
    'listPendingOrders',
    '列出护士所在科室病区待执行的医嘱',
    '{"type":"function","function":{"name":"listPendingOrders","description":"列出当前护士待执行的医嘱","parameters":{"type":"object","properties":{"wardId":{"type":"string","description":"病区ID，可空，默认当前护士科室"}}}}}',
    'info'
  ),
  (
    'createNursingNote',
    '为指定就诊生成护理记录草稿（需责任护士确认后写入）',
    '{"type":"function","function":{"name":"createNursingNote","description":"为指定就诊生成护理记录草稿（需责任护士确认后写入）","parameters":{"type":"object","properties":{"visitId":{"type":"string","description":"就诊ID"},"content":{"type":"string","description":"护理记录草稿正文"}},"required":["visitId","content"]}}}',
    'warning'
  )
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- nurse 角色 agent 提示词对齐 M89-D（200 已种 nurse，这里更新岗位边界）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_agents (role_code, user_id, name, system_prompt) VALUES
  (
    'nurse', NULL, '责任护士智能体',
    '你是健澜数智医院操作系统的护士智能助手，负责提醒医嘱执行、护理记录草稿、异常体征报警。所有写操作必须经责任护士本人确认，不得自行下达医嘱。'
  )
ON CONFLICT (role_code) DO UPDATE
  SET name = EXCLUDED.name,
      system_prompt = EXCLUDED.system_prompt,
      updated_at = now();
