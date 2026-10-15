-- ============================================================================
-- 健澜科技 jlmedaios - M146-A 医院智慧资产看板快照表（越用越聪明深化）
--
-- 让院长看到「医院越来越聪明」：把全院沉淀的经验资产、知识覆盖病种、
-- AI 助手使用量、医生成长曲线与六维智慧度评分，按日固化为一行快照，
-- 形成可回溯、可对比、可汇报的智慧资产时间轴。
--
-- 【越用越聪明深化】本表只增不改（append-only snapshot）：
--   - 每天一次落库，累计经验/病种覆盖随使用时长自然增长；
--   - 六维雷达得分以 jsonb 固化，趋势图直接读历史快照，无需重算；
--   - 快照驱动「智慧资产增长率」报告（MoM 环比、段位跃迁）。
--
-- 表结构：medmuse.wisdom_asset_snapshot
--   id                    bigserial    主键（快照流水号）
--   hospital_id           text         医院租户 ID（多租户隔离标签）
--   snapshot_date         date         快照归属日（与唯一约束配合）
--   experience_total      bigint       经验沉淀总量（累计，非周期增量）
--   covered_disease_count integer      知识覆盖病种数（累计去重 ICD 病种）
--   ai_assistant_calls    bigint       当日 AI 助手调用量（周期增量）
--   active_doctor_count   integer      当日活跃沉淀医生数
--   avg_doctor_growth     numeric(5,2) 医生成长均分（0~100）
--   wisdom_score          numeric(5,2) 六维智慧度总分（0~100）
--   radar                 jsonb        六维得分明细（维度键/名/分/权重）
--   tags                  jsonb        维度标签（如 demo 标记，不含患者 PII）
--   created_at            timestamptz  落库时间（默认 now()）
--
-- 医疗安全红线（生产安全加固）：
--   - 仅落聚合统计量，严禁落患者标识 / 病历正文 / 医生个人明细可识别信息；
--   - 仅 admin 角色可读；普通员工 / 患者侧一律不下发；
--   - 唯一约束 (hospital_id, snapshot_date) 保证每日一行、可重跑幂等覆盖。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 智慧资产日快照（append-only；唯一约束保证每日一行，重跑 upsert 覆盖）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.wisdom_asset_snapshot (
  id                    bigserial PRIMARY KEY,
  hospital_id           text         NOT NULL DEFAULT 'default',
  snapshot_date         date         NOT NULL DEFAULT CURRENT_DATE,
  experience_total      bigint       NOT NULL DEFAULT 0,
  covered_disease_count integer      NOT NULL DEFAULT 0,
  ai_assistant_calls    bigint       NOT NULL DEFAULT 0,
  active_doctor_count   integer      NOT NULL DEFAULT 0,
  avg_doctor_growth     numeric(5,2) NOT NULL DEFAULT 0,
  wisdom_score          numeric(5,2) NOT NULL DEFAULT 0,
  radar                 jsonb        NOT NULL DEFAULT '[]'::jsonb,
  tags                  jsonb        NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_wisdom_asset_snapshot_hospital_date
    UNIQUE (hospital_id, snapshot_date)
);

-- 趋势查询主力路径：按医院 + 快照日倒序
CREATE INDEX IF NOT EXISTS idx_wisdom_asset_snapshot_hospital_date
  ON medmuse.wisdom_asset_snapshot (hospital_id, snapshot_date DESC);

-- 权限：仅 admin 可读智慧资产看板
INSERT INTO iam.permissions(code, name, module) VALUES
  ('wisdom:dashboard:view', '智慧资产看板-查看', 'wisdom')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('admin', 'wisdom:dashboard:view')
ON CONFLICT DO NOTHING;
