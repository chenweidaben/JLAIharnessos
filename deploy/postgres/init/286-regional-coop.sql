-- ============================================================================
-- 健澜科技 jlmedaios - 区域医疗协同资源（M143-D）【互联网医院与远程医疗】
--
-- 【业务目标】把区域内可协同的医院资源收敛成一张「区域医疗资源地图」：
--   检验结果互认 / 影像资料共享 / 专家号源共享 / 双向转诊通道 四项协同能力，
--   让基层医院遇到超出本院能力的患者时，能在区域内快速找到最合适的上级医院
--   完成转诊，而不是让患者自行奔波、重复检查。
--
-- 四项协同能力（与 regionalCoopAggregator.ts 的 RegionalService 枚举一致）：
--   lab_result_mutual_recognition  检验结果互认
--   imaging_sharing                影像资料共享
--   expert_slot_sharing            专家号源共享
--   bidirectional_referral         双向转诊通道
--
-- 【患者隐私】跨院共享的数据一律脱敏落库 / 出网：
--   patient_id 仅保留前两位与后两位，中间以 **** 掩盖（示例：P0****23），
--   原始患者主索引（EMPI）不出院，共享侧只拿到脱敏后的假名 ID。
--
-- 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket：本版仅做拉取式 REST，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ----------------------------------------------------------------------------
-- 区域医疗资源主表（regional_medical_resource）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.regional_medical_resource (
  id               uuid PRIMARY KEY,
  -- 医院全称，如：浙江大学医学院附属第一医院
  name             text NOT NULL,
  -- 医院等级：三级甲等 / 三级乙等 / 二级甲等 / 二级乙等 / 一级
  level            text NOT NULL
                   CHECK (level IN
                     ('三级甲等','三级乙等','二级甲等','二级乙等','一级')),
  -- 协同能力清单（数组）：检验结果互认 / 影像资料共享 / 专家号源共享 / 双向转诊通道
  services         text[] NOT NULL DEFAULT '{}',
  -- 重点专科清单（数组）：如 心血管内科 / 神经外科 / 肿瘤科 / 儿科 / 妇产科
  specialties      text[] NOT NULL DEFAULT '{}',
  -- 开放床位数（区域转诊承接能力的硬指标）
  capacity         integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  -- 对外联络：对接人 + 电话
  contact          text NOT NULL DEFAULT '',
  -- 所在区域（从院名提取，如 杭州 / 宁波 / 上海），用于就近转诊
  region           text NOT NULL DEFAULT '本地',
  -- 脱敏示例：跨院共享时 patient_id 的落网形态（P0****23），仅作审计留痕
  mask_demo_pid    text NOT NULL DEFAULT 'P0****23',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regional_medical_resource_name_uniq UNIQUE (name)
);

COMMENT ON TABLE clinical.regional_medical_resource IS
  '区域医疗资源地图（互联网医院与远程医疗）：检验互认/影像共享/号源共享/双向转诊，跨院共享 patient_id 一律脱敏';
COMMENT ON COLUMN clinical.regional_medical_resource.services IS
  '四项协同能力：lab_result_mutual_recognition/imaging_sharing/expert_slot_sharing/bidirectional_referral';
COMMENT ON COLUMN clinical.regional_medical_resource.mask_demo_pid IS
  '跨院共享 patient_id 脱敏规则：保留前 2 位 + **** + 后 2 位（如 P0****23），原始 EMPPI 不出院';

-- 转诊建议快查：按区域 + 等级筛选
CREATE INDEX IF NOT EXISTS idx_regional_resource_region_level
  ON clinical.regional_medical_resource (region, level);

-- 按重点专科反查可承接医院（GIN 数组索引）
CREATE INDEX IF NOT EXISTS idx_regional_resource_specialties
  ON clinical.regional_medical_resource USING GIN (specialties);

-- 按协同能力反查开通了某项共享的医院
CREATE INDEX IF NOT EXISTS idx_regional_resource_services
  ON clinical.regional_medical_resource USING GIN (services);
