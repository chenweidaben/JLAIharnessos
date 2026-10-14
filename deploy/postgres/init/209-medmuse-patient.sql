-- ============================================================================
-- 健澜科技 jlmedaios · M89-G MEDMUSE 患者端智能助手（出院随访提醒）
--
-- 医疗安全红线：
--   - 患者 agent 不得给出具体诊疗建议，所有诊断/用药问题引导联系主治医生；
--   - createFollowupReminder 为 warning，函数体顶部强制 confirmed 校验；
--   - 号源锁定依赖 clinical.appointment_slots 的事务内占用，不允许跳过。
--
-- 幂等：权限/工具种子均 ON CONFLICT DO NOTHING；patient agent 提示词用
-- ON CONFLICT DO UPDATE 对齐 M89-G 岗位边界。
--
-- 编号说明：本仓 207/208 已被 ai-note-qc / ai-nursing-plans 占用，故顺延到 209。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 权限码：medmuse:patient
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medmuse:patient', '患者端智能助手', 'medmuse',
   '患者岗位智能体：出院随访提醒、用药提醒、报告查询、就医指导')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
  ('patient', 'medmuse:patient')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 患者端工具种子（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tools (name, description, schema, risk_level) VALUES
  (
    'listFollowupTasks',
    '列出患者本人某次就诊关联的出院随访预约',
    '{"type":"function","function":{"name":"listFollowupTasks","description":"列出患者自己的随访任务","parameters":{"type":"object","properties":{"visitId":{"type":"string","description":"就诊ID"}},"required":["visitId"]}}}',
    'info'
  ),
  (
    'createFollowupReminder',
    '为患者预约出院随访号源（需医生/患者二次确认）',
    '{"type":"function","function":{"name":"createFollowupReminder","description":"为患者创建随访提醒，需二次确认","parameters":{"type":"object","properties":{"dischargePlanId":{"type":"string","description":"出院计划ID"},"scheduleId":{"type":"string","description":"随访排班ID"},"appointmentDate":{"type":"string","description":"预约日期 YYYY-MM-DD"},"department":{"type":"string","description":"随访科室"}},"required":["dischargePlanId","scheduleId","appointmentDate","department"]}}}',
    'warning'
  )
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- patient agent 提示词对齐 M89-G（200 已种 patient，这里更新岗位边界）
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_agents (role_code, user_id, name, system_prompt) VALUES
  (
    'patient', NULL, '患者服务智能体',
    '你是健澜数智医院操作系统的患者智能助手，语气温和，负责出院后随访提醒、用药提醒、报告查询、就医指导。不得给出具体诊疗建议，所有诊断/用药问题引导患者联系主治医生。'
  )
ON CONFLICT (role_code) DO UPDATE
  SET name = EXCLUDED.name,
      system_prompt = EXCLUDED.system_prompt,
      updated_at = now();
