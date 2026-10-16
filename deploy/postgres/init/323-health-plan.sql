-- ============================================================================
-- 健澜科技 jlmedaios · M160-D 患者健康管理深化——个性化健康计划
--
-- 【个性化，不一刀切】patient_health_plan 表：
--   按患者慢病组合 + 个人目标，生成因人而异的运动 / 饮食 / 用药提醒 /
--   复查计划 / 红旗症状预警五件套，而不是给所有患者同一份模板。
--   计划由 BFF 聚合层 buildPersonalizedHealthPlan 纯函数依据慢病标签与目标
--   实时推导生成，本表为其持久化快照（含版本号，便于 adjustHealthPlan 动态
--   调整后留痕、可追溯）。
--
-- 计划内容五要素：
--   1) 运动建议：每周运动量（分钟）+ 类型（有氧 / 抗阻 / 柔韧，按慢病调整）
--   2) 饮食建议：每日热量（kcal）+ 三大营养素配比
--   3) 用药提醒：按时服药 + 漏药预警（连续漏服 N 次升级提醒）
--   4) 复查计划：下次复查时间 + 复查项目清单
--   5) 红旗症状预警：出现即立即就医（胸痛 / 低血糖 / 血压骤升等）
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- 权限：patient_portal:view（患者本人查看）；远期路线图：医生端可编辑与审批。
--
-- 远期路线图：接入可穿戴设备数据后，trackHealthProgress 将由「手动上报」
--   升级为「自动采集 + 趋势预测」，并与 AI 健康大脑联动自动调参。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.patient_health_plan (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NOT NULL REFERENCES clinical.patients(id),
  -- 计划版本：每次 adjustHealthPlan 动态调整后 +1，保留调整轨迹
  version             int  NOT NULL DEFAULT 1,
  -- 适用的慢病组合标签（如 ['hypertension','diabetes']），空数组表示健康人群基础计划
  chronic_conditions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 患者个人目标（如 weight_loss / glucose_control / blood_pressure_control / fitness）
  goals               jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 1) 运动建议：每周目标分钟数 + 推荐类型清单
  exercise            jsonb NOT NULL,
  -- 2) 饮食建议：每日热量 kcal + 碳水/蛋白/脂肪供能比（%）
  diet                jsonb NOT NULL,
  -- 3) 用药提醒：药品清单 + 服药时点 + 漏药预警阈值（连续漏服次数）
  medication          jsonb NOT NULL,
  -- 4) 复查计划：下次复查日期 + 复查项目
  followup            jsonb NOT NULL,
  -- 5) 红旗症状预警：出现即立即就医的症状清单（含触发条件说明）
  red_flags           jsonb NOT NULL,

  -- 近一周进度追踪快照（运动完成分钟数 / 饮食依从率 / 用药依从率 0~1）
  progress            jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 最近一次动态调整原因（患者反馈：太难 / 太轻松 / 不适），可空
  last_adjust_reason  text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 患者维度：一个患者保留最新版本，历史版本按 patient_id + version 追溯
CREATE INDEX IF NOT EXISTS idx_health_plan_patient
  ON clinical.patient_health_plan(patient_id, updated_at DESC);

-- 复查计划到期提醒：按下次复查日期扫描
CREATE INDEX IF NOT EXISTS idx_health_plan_followup_at
  ON clinical.patient_health_plan((followup->>'nextAt'));

COMMENT ON TABLE clinical.patient_health_plan IS
  'M160-D 个性化健康计划：按慢病组合与个人目标生成五件套，纯函数推导、版本化留痕';
