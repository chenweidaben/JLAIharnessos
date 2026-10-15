-- ============================================================================
-- 健澜科技 jlmedaios — 【患者服务深化】一站式患者服务中心（M156-D）
--
-- 集团与科研：面向老年患者的「简单、老人也能用」一站式服务深化，
-- 把预约挂号 / 在线缴费 / 报告查询 / 智能导诊 / 院内导航 / 健康档案
-- 六大入口沉淀为可审计、可统计的患者侧留痕表，服务于患者体验科研与
-- 集团级患者服务质量对标。
--
-- 设计原则（老人友好）：
--   · 服务入口仅六张卡片，一屏可达，不藏二级菜单；
--   · 所有 patient_id 落库即脱敏（P0****23），出参不接触明文 PII；
--   · 导诊推荐为「就医路径建议」，不构成诊断，红旗症状强制急诊提示。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS patient;

-- ----------------------------------------------------------------------------
-- 1) 患者服务动作留痕：一行 = 患者在服务中心发起的一次服务动作
--    （预约挂号 / 在线缴费 / 报告查询 / 智能导诊 / 院内导航 / 健康档案浏览）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient.service_action_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 脱敏患者标识（P0****23），全程不存明文
  patient_id      text NOT NULL,
  -- 服务大类：appointment 预约挂号 / payment 在线缴费 / report 报告查询 /
  --           triage 智能导诊 / navigation 院内导航 / archive 健康档案
  service_type    text NOT NULL,
  -- 服务子类：expert 专家号 / normal 普通号 / exam 检查号 /
  --           outpatient 门诊 / inpatient 住院 / check 检查 /
  --           lab 检验 / imaging 检查 / pathology 病理
  sub_type        text NOT NULL DEFAULT '',
  -- 动作关联对象（科室编码 / 医生 id / 报告编号 / 导航目标）
  target_ref      text NOT NULL DEFAULT '',
  -- 动作摘要（纯函数组包结果），供患者服务体验科研回读
  summary         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 动作发生时间
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 按患者 + 服务大类回读（患者「我的服务」时间线）
CREATE INDEX IF NOT EXISTS idx_patient_action_patient
  ON patient.service_action_log(patient_id, created_at DESC);

-- 按服务大类聚合（集团患者服务量 / 老年患者使用偏好科研统计）
CREATE INDEX IF NOT EXISTS idx_patient_action_type
  ON patient.service_action_log(service_type, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2) 智能导诊推荐留痕：一行 = 一次「症状 → 科室 → 医生」推荐结果
--    （供导诊准确率科研复盘，红旗症状强制急诊口径留痕）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient.triage_recommend_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      text NOT NULL,
  -- 患者原始症状描述
  symptoms        text NOT NULL,
  -- 推荐科室编码
  dept_code       text NOT NULL,
  dept_name       text NOT NULL,
  -- 推荐医生 id 列表（jsonb 数组）
  doctor_ids      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 紧急度：routine 普通 / urgent 尽快 / emergency 急诊
  urgency         text NOT NULL DEFAULT 'routine',
  -- 是否触发红旗症状（强制 120 / 急诊提示）
  red_flag        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triage_patient
  ON patient.triage_recommend_log(patient_id, created_at DESC);

-- 红旗症状命中率科研统计
CREATE INDEX IF NOT EXISTS idx_triage_redflag
  ON patient.triage_recommend_log(red_flag, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3) 院内导航点位字典：科室位置 / 停车 / 餐饮（老人大字导航一屏可达）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient.waypoint_dict (
  code            text PRIMARY KEY,
  -- 点位名称（大字直显）
  name            text NOT NULL,
  -- 点位类别：dept 科室 / parking 停车 / dining 餐饮
  category        text NOT NULL,
  -- 所在院区 / 楼栋 / 楼层
  location        text NOT NULL,
  -- 步行路线（大字文字描述，老人易读）
  route_text      text NOT NULL DEFAULT '',
  -- 是否无障碍直达（老年 / 行动不便患者优先）
  accessible      boolean NOT NULL DEFAULT false
);

-- 类别回读（「我要找科室 / 停车 / 吃饭」三张大卡片）
CREATE INDEX IF NOT EXISTS idx_waypoint_category
  ON patient.waypoint_dict(category);
