-- ============================================================================
-- 健澜科技 jlmedaios · M89-B MEDMUSE 工具版本化记录
--
-- 医疗安全：每一次工具实现路径变更都留痕（impl_path + changelog），
-- 审计可追溯"哪个版本的实现写入了哪条病历/护理记录"。
--
-- 幂等：CREATE TABLE IF NOT EXISTS + INSERT ... ON CONFLICT DO NOTHING。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 工具实现版本表：记录每个工具当前真实实现路径与风险等级
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medmuse_tool_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name   text NOT NULL,
  version     int  NOT NULL DEFAULT 1,
  impl_path   text NOT NULL,  -- 例如 'src/bff/agents/toolRegistry.ts#listMyPatients'
  risk_level  text NOT NULL CHECK (risk_level IN ('info', 'warning', 'critical')),
  changelog   text,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tool_name, version)
);

CREATE INDEX IF NOT EXISTS idx_medmuse_tool_versions_name
  ON clinical.medmuse_tool_versions(tool_name, version DESC);

-- ---------------------------------------------------------------------------
-- M89-B 种子：5 个核心工具 v1 真实实现路径
-- ---------------------------------------------------------------------------
INSERT INTO clinical.medmuse_tool_versions (tool_name, version, impl_path, risk_level, changelog) VALUES
  (
    'listMyPatients', 1,
    'src/bff/agents/toolRegistry.ts#listMyPatients',
    'info',
    'M89-B: 由占位改为真实查询 clinical.visits（attending_doctor_id 在岗住院患者）并关联 clinical.patients 取脱敏姓名。'
  ),
  (
    'getVisitDetail', 1,
    'src/bff/agents/toolRegistry.ts#getVisitDetail',
    'info',
    'M89-B: 聚合 visitRepo.getVisitById + orderRepo.listByVisit + aiNoteDraftRepo.listByVisit（取最新草稿）。'
  ),
  (
    'createNoteDraft', 1,
    'src/bff/agents/toolRegistry.ts#createNoteDraft',
    'warning',
    'M89-B: 经 Sentinel confirmed 后调用 aiNoteDraftRepo.create 落库；未确认抛 CONFIRMATION_REQUIRED。'
  ),
  (
    'suggestDiagnosis', 1,
    'src/bff/agents/toolRegistry.ts#suggestDiagnosis',
    'warning',
    'M89-B: 读取 diagnosisSuggestionRepo.listByVisit；无历史建议时写入空占位记录。'
  ),
  (
    'listPendingTasks', 1,
    'src/bff/agents/toolRegistry.ts#listPendingTasks',
    'info',
    'M89-B: 聚合 timelinessRepo.listPending + improvementTaskRepo.listByAssignee + consultRequestRepo.listPending。'
  )
ON CONFLICT (tool_name, version) DO NOTHING;
