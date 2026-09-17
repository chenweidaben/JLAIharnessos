-- ============================================================================
-- 健澜科技杠OS - 智能体编排平台表
-- 30-agent.sql
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 已注册智能体（逻辑实体，版本在 agent_versions）
CREATE TABLE agent.agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text NOT NULL UNIQUE,          -- 如 medical-record-writer
  name            text NOT NULL,
  name_en         text,
  category        text,
  risk_level      text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  description     text,
  tags            jsonb NOT NULL DEFAULT '[]',
  allowed_roles   jsonb NOT NULL DEFAULT '[]',
  tools           jsonb NOT NULL DEFAULT '[]',
  knowledge_bases jsonb NOT NULL DEFAULT '[]',
  builtin         boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled','draft')),
  current_version text NOT NULL DEFAULT '1.0.0',
  owner_id        uuid REFERENCES iam.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agents_category ON agent.agents(category);
CREATE INDEX idx_agents_status ON agent.agents(status);
CREATE TRIGGER trg_agent_agents_updated BEFORE UPDATE ON agent.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 智能体版本（完整 DSL 定义 + 校验和，支持回滚与市场分发）
CREATE TABLE agent.agent_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL REFERENCES agent.agents(agent_id) ON DELETE CASCADE,
  version       text NOT NULL,
  definition    jsonb NOT NULL,                  -- 完整 AgentDefinition
  prompts       jsonb NOT NULL DEFAULT '{}',
  checksum      text NOT NULL,
  changelog     text,
  published     boolean NOT NULL DEFAULT false,
  published_by  uuid REFERENCES iam.users(id),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, version)
);
CREATE INDEX idx_agent_versions_published ON agent.agent_versions(agent_id, published);

-- 工作流实例
CREATE TABLE agent.workflow_instances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_no     text NOT NULL UNIQUE,
  agent_id        text NOT NULL,
  agent_version   text,
  workflow_id     text NOT NULL,
  state           text NOT NULL CHECK (state IN
                    ('pending','running','paused','waiting_human','completed','failed','cancelled','timed_out')),
  trigger_type    text CHECK (trigger_type IN ('manual','api','event','schedule')),
  trace_id        text,
  input           jsonb NOT NULL DEFAULT '{}',
  output          jsonb,
  context_vars    jsonb NOT NULL DEFAULT '{}',
  error_code      text,
  error_message   text,
  actor_id        uuid REFERENCES iam.users(id),
  patient_ref     text,                          -- 脱敏患者引用
  tokens_in       integer NOT NULL DEFAULT 0,
  tokens_out      integer NOT NULL DEFAULT 0,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  duration_ms     integer
);
CREATE INDEX idx_wf_instances_agent ON agent.workflow_instances(agent_id, started_at DESC);
CREATE INDEX idx_wf_instances_state ON agent.workflow_instances(state);
CREATE INDEX idx_wf_instances_trace ON agent.workflow_instances(trace_id);
CREATE INDEX idx_wf_instances_patient ON agent.workflow_instances(patient_ref);

-- 节点执行记录（实例内每个节点的状态、输入输出、重试、耗时）
CREATE TABLE agent.workflow_node_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   uuid NOT NULL REFERENCES agent.workflow_instances(id) ON DELETE CASCADE,
  node_id       text NOT NULL,
  node_type     text NOT NULL,
  state         text NOT NULL CHECK (state IN ('pending','running','waiting','completed','failed','skipped','cancelled')),
  attempts      integer NOT NULL DEFAULT 0,
  input         jsonb,
  output        jsonb,
  error_code    text,
  error_message text,
  started_at    timestamptz,
  finished_at   timestamptz,
  duration_ms   integer
);
CREATE INDEX idx_node_records_instance ON agent.workflow_node_records(instance_id);
CREATE UNIQUE INDEX idx_node_records_instance_node ON agent.workflow_node_records(instance_id, node_id);

-- 人工任务（审核/确认/双复核工单）
CREATE TABLE agent.human_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_no         text NOT NULL UNIQUE,
  instance_id     uuid NOT NULL REFERENCES agent.workflow_instances(id) ON DELETE CASCADE,
  node_id         text NOT NULL,
  title           text NOT NULL,
  instructions    text,
  assignee_roles  jsonb NOT NULL DEFAULT '[]',
  assignee_users  jsonb NOT NULL DEFAULT '[]',
  form_schema     jsonb NOT NULL DEFAULT '{}',
  review_data     jsonb,                          -- 已脱敏的审核上下文
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','resolved','timeout','cancelled')),
  resolution      jsonb,                          -- {approved,formData,reviewerId,comment}
  claimed_by      uuid REFERENCES iam.users(id),
  resolved_by     uuid REFERENCES iam.users(id),
  due_at          timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);
CREATE INDEX idx_human_tasks_status ON agent.human_tasks(status, due_at);
CREATE INDEX idx_human_tasks_instance ON agent.human_tasks(instance_id);
CREATE INDEX idx_human_tasks_assignee ON agent.human_tasks USING gin (assignee_roles);

-- 智能体调用日志（用量、成本、性能、可观测）
CREATE TABLE agent.agent_invocations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id      text,
  agent_id      text NOT NULL,
  agent_version text,
  actor_id      uuid REFERENCES iam.users(id),
  trigger_type  text,
  status        text NOT NULL CHECK (status IN ('success','failed','cancelled','error')),
  tokens_in     integer NOT NULL DEFAULT 0,
  tokens_out    integer NOT NULL DEFAULT 0,
  latency_ms    integer,
  error_code    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invocations_agent_time ON agent.agent_invocations(agent_id, created_at DESC);
CREATE INDEX idx_invocations_trace ON agent.agent_invocations(trace_id);
CREATE INDEX idx_invocations_status ON agent.agent_invocations(status);
