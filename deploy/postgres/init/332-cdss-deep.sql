-- ============================================================================
-- 健澜科技 jlmedaios - M165-A CDSS 临床决策支持系统深化（CDSS与运营精细化）
--
-- 【CDSS与运营精细化】
--   CDSS 最大的敌人不是「漏提醒」，而是「告警疲劳」：红橙黄蓝一股脑弹给医生，
--   三个月后医生会对所有弹窗一键忽略，真正的红色致命用药错误也被一起划走。
--   本 schema 把 CDSS 从「规则引擎」升级为「可运营的提醒系统」：
--     1. cdss_rule        规则字典：四类规则（药物审核/检查检验/诊断提示/治疗方案）
--                         × 优先级（红>橙>黄>蓝），每条规则带 condition_json 声明条件；
--     2. cdss_alert_log   告警流水：每一次触发的告警落库，记录被优先级压制(suppressed)
--                         还是真正弹给医生(promoted)——直接量化「告警噪声」；
--     3. cdss_adoption    采纳跟踪：医生对每条告警的处置（采纳/驳回/忽略/升级），
--                         按规则聚合命中率与采纳率，反向驱动规则阈值调优。
--
-- 运营闭环：命中率高但采纳率低的规则 → 调低优先级或下线；
--          红色规则被忽略率高 → 规则文案/触发条件复盘。
--
-- 生产红线：
--   - 规则 condition_json 只做声明式条件，执行引擎（BFF 纯函数）解释，禁止拼 SQL；
--   - cdss_alert_log 按 (rule_id, created_at) 建索引，冷热分离由后续归档任务处理；
--   - 仅 admin 角色可写规则字典（启停/优先级调整），告警流水只追加不更新。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- medmuse.cdss_rule：CDSS 规则字典（四类 × 三子类 × 四级优先级）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.cdss_rule (
  id                bigserial PRIMARY KEY,
  rule_code         text        NOT NULL,                 -- 规则编码，如 DRUG-DOSE-001
  rule_type         text        NOT NULL,                 -- drug_review 药物审核 / lab_imaging 检查检验建议
                                                          -- diagnosis 诊断提示 / treatment 治疗方案
  sub_type          text        NOT NULL,                 -- 剂量异常/相互作用/禁忌症/重复用药
                                                          -- 漏查/多查/时机/鉴别/红旗/罕见病
                                                          -- 指南推荐/路径偏离/并发症
  rule_name         text        NOT NULL,                 -- 规则中文名
  description       text        NOT NULL DEFAULT '',       -- 规则说明（给医生看的文案）
  default_priority  text        NOT NULL DEFAULT 'yellow',-- red 红(致命阻断) / orange 橙(强烈建议)
                                                          -- yellow 黄(提示) / blue 蓝(仅供参考)
  condition_json    jsonb       NOT NULL DEFAULT '{}',    -- 声明式触发条件（引擎解释，禁止拼 SQL）
  status            text        NOT NULL DEFAULT 'active',-- active / disabled（下线不删规则）
  -- 运营精细化指标（由告警流水/采纳表聚合回写，或定时任务刷新）
  hit_count         bigint      NOT NULL DEFAULT 0,        -- 累计触发次数
  suppressed_count  bigint      NOT NULL DEFAULT 0,        -- 因优先级去重被压制（未弹窗）次数
  adoption_count    bigint      NOT NULL DEFAULT 0,        -- 医生采纳次数
  created_by        text        NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cdss_rule_code_uniq UNIQUE (rule_code),
  CONSTRAINT cdss_rule_type_chk
    CHECK (rule_type IN ('drug_review', 'lab_imaging', 'diagnosis', 'treatment')),
  CONSTRAINT cdss_rule_priority_chk
    CHECK (default_priority IN ('red', 'orange', 'yellow', 'blue')),
  CONSTRAINT cdss_rule_status_chk
    CHECK (status IN ('active', 'disabled'))
);

-- 按类型+状态收敛：引擎加载时只取 active 规则并按类型分组
CREATE INDEX IF NOT EXISTS idx_cdss_rule_type_status
  ON medmuse.cdss_rule (rule_type, status, default_priority);

-- ---------------------------------------------------------------------------
-- medmuse.cdss_alert_log：告警流水（一次 evaluate 触发的每条告警一行）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.cdss_alert_log (
  id              bigserial PRIMARY KEY,
  alert_uid       text        NOT NULL,                 -- 告警唯一标识（引擎生成，采纳跟踪关联）
  patient_id      text        NOT NULL DEFAULT '',
  visit_id        text        NOT NULL DEFAULT '',
  rule_id         bigint       REFERENCES medmuse.cdss_rule(id) ON DELETE SET NULL,
  rule_code       text        NOT NULL DEFAULT '',
  priority        text        NOT NULL,                 -- red / orange / yellow / blue
  title           text        NOT NULL DEFAULT '',
  message         text        NOT NULL DEFAULT '',
  related_orders   text[]      NOT NULL DEFAULT '{}',    -- 关联医嘱
  -- 告警疲劳治理核心字段：本告警是否真正弹窗（同优先级去重合并后）
  promoted        boolean     NOT NULL DEFAULT true,    -- true=弹给医生；false=被合并压制
  merged_into      text        NOT NULL DEFAULT '',      -- 被合并进的 alert_uid
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cdss_alert_priority_chk
    CHECK (priority IN ('red', 'orange', 'yellow', 'blue')),
  CONSTRAINT cdss_alert_uid_uniq UNIQUE (alert_uid)
);

-- 按规则收敛命中与抑制统计（运营看板热路径）
CREATE INDEX IF NOT EXISTS idx_cdss_alert_rule_time
  ON medmuse.cdss_alert_log (rule_id, created_at DESC);

-- 按优先级收敛：红橙黄蓝各弹了多少条（告警疲劳大盘）
CREATE INDEX IF NOT EXISTS idx_cdss_alert_priority_time
  ON medmuse.cdss_alert_log (priority, promoted, created_at DESC);

-- ---------------------------------------------------------------------------
-- medmuse.cdss_adoption：采纳跟踪（医生对告警的处置闭环）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.cdss_adoption (
  id            bigserial PRIMARY KEY,
  alert_uid     text        NOT NULL,                   -- 关联 cdss_alert_log.alert_uid
  rule_code     text        NOT NULL DEFAULT '',
  patient_id    text        NOT NULL DEFAULT '',
  -- 医生处置：accepted 采纳 / overridden 驳回并坚持原医嘱 / dismissed 忽略 / escalated 升级会诊
  action        text        NOT NULL,
  comment       text        NOT NULL DEFAULT '',        -- 驳回理由（运营复盘素材）
  actor_id      text        NOT NULL DEFAULT '',        -- 处置医生工号（登录态注入，不可伪造）
  acted_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cdss_adoption_action_chk
    CHECK (action IN ('accepted', 'overridden', 'dismissed', 'escalated')),
  CONSTRAINT cdss_adoption_alert_uniq UNIQUE (alert_uid)  -- 一条告警只处置一次
);

-- 按规则聚合采纳率（运营精细化核心口径）
CREATE INDEX IF NOT EXISTS idx_cdss_adoption_rule
  ON medmuse.cdss_adoption (rule_code, action, acted_at DESC);

-- ---------------------------------------------------------------------------
-- 种子规则：与 BFF 内建规则目录（cdssDeepAggregator.ts CDSS_RULE_CATALOG）对齐
-- ---------------------------------------------------------------------------
INSERT INTO medmuse.cdss_rule (rule_code, rule_type, sub_type, rule_name, description, default_priority, condition_json)
VALUES
  ('DRUG-DOSE-001', 'drug_review', '剂量异常', '单次剂量超安全上限',
   '开嘱剂量超过该药品说明书规定的单次最大剂量，需医生二次确认或驳回。', 'red',
   '{"drug":"*","metric":"single_dose_mg","op":"gt","param":2000}'),
  ('DRUG-DOSE-002', 'drug_review', '剂量异常', '每日剂量超安全上限',
   '按频次折算后每日总量超安全上限，常见于老年患者未按体重折算。', 'orange',
   '{"drug":"*","metric":"daily_dose_mg","op":"gt","param":4000}'),
  ('DRUG-INT-001', 'drug_review', '相互作用', '高危药物相互作用',
   '当前用药清单中存在已知高危相互作用组合（如华法林+阿司匹林叠加出血风险）。', 'red',
   '{"pairs":[["warfarin","aspirin"],["simvastatin","clarithromycin"]]}'),
  ('DRUG-CONTRA-001', 'drug_review', '禁忌症', '过敏史/禁忌症冲突',
   '拟用药品与患者登记的过敏史或已有诊断禁忌症冲突。', 'red',
   '{"match_allergies":true}'),
  ('DRUG-DUP-001', 'drug_review', '重复用药', '同通用名重复开嘱',
   '同一通用名药品在本次医嘱中出现两条以上，属重复用药。', 'orange',
   '{"metric":"same_generic_count","op":"gte","param":2}'),
  ('LAB-MISS-001', 'lab_imaging', '漏查', '诊断必需检验漏开',
   '对应诊断路径上的关键检验（如肺炎血常规/CRP）尚未开具。', 'yellow',
   '{"diagnoses":["肺炎","pneumonia"],"required_labs":["血常规","CRP"]}'),
  ('LAB-RED-001', 'diagnosis', '红旗', '红旗症状需紧急处置',
   '患者症状组合提示高危红旗（如胸痛伴大汗），需立即升级处置。', 'red',
   '{"symptoms_all":["chest_pain"],"any":["diaphoresis","dyspnea"]}'),
  ('TX-GUIDE-001', 'treatment', '指南推荐', '指南推荐治疗未落地',
   '按最新临床路径，该诊断应首选的指南推荐方案未出现在医嘱中。', 'blue',
   '{"diagnoses":["高血压"],"expected_drug_class":"ACEI/ARB"}')
ON CONFLICT (rule_code) DO NOTHING;
