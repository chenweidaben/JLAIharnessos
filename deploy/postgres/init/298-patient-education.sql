-- ============================================================================
-- 健澜科技 jlmedaios - M147-B 患者健康教育（知识图谱与患者教育）
--
-- 依据宪法第四十五条（国家发展医疗卫生事业，保护人民健康）：
-- 医疗机构有义务向患者用听得懂的话讲清楚——这个病是怎么回事、
-- 回家该怎么吃怎么动、药怎么吃、什么时候再来复查、出现哪些信号必须马上急诊。
--
-- 表结构：medmuse.patient_education_material
--   id          bigserial    主键（推送流水号）
--   patient_id  text         脱敏患者号（不存姓名 / 身份证号）
--   disease     text         疾病编码（hypertension / diabetes / chd / asthma / general）
--   category    text         科普栏目：basics/diet/exercise/medication/followup/redflags
--   title       text         栏目小标题（通俗，不带医学术语）
--   content     text         科普正文（大白话，例如"血压高了就少吃咸的"）
--   is_read     boolean      患者是否已读（默认 false，推送后由患者端翻牌）
--   pushed_at   timestamptz  推送时间
--   read_at     timestamptz  首次标记已读时间（可空）
--   created_at  timestamptz  落库时间
--
-- 医疗安全红线：
--   - 本表只存脱敏患者号，严禁落姓名 / 身份证号 / 病案号明文；
--   - 科普内容为健康教育，不构成诊断与处方，红旗症状一律引导急诊 / 120；
--   - 同一患者 + 同一疾病 + 同一栏目只推一次（唯一约束兜底），重复推送不覆盖已读状态；
--   - 正文由 BFF 纯函数按疾病知识库生成，BFF 不做反推身份、不做敏感二次加工。
--
-- 幂等：CREATE SCHEMA / TABLE / INDEX IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 患者健康教育材料表（知识图谱与患者教育：按疾病知识库生成、按患者推送）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.patient_education_material (
  id          bigserial PRIMARY KEY,
  patient_id  text         NOT NULL,
  disease     text         NOT NULL,
  category    text         NOT NULL,
  title       text         NOT NULL,
  content     text         NOT NULL,
  is_read     boolean      NOT NULL DEFAULT false,
  pushed_at   timestamptz  NOT NULL DEFAULT now(),
  read_at     timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  -- 栏目白名单：六大科普栏目缺一不可
  CONSTRAINT chk_patient_education_category CHECK (
    category IN ('basics', 'diet', 'exercise', 'medication', 'followup', 'redflags')
  )
);

-- 患者本人拉取科普列表：按推送时间倒序（健康科普页主力查询路径）
CREATE INDEX IF NOT EXISTS idx_patient_education_patient_pushed
  ON medmuse.patient_education_material (patient_id, pushed_at DESC);

-- 按疾病过滤已推送材料（个性化推送去重时先按患者 + 疾病查）
CREATE INDEX IF NOT EXISTS idx_patient_education_patient_disease
  ON medmuse.patient_education_material (patient_id, disease);

-- 已读统计：按患者 + 已读状态聚合（健康科普页头部进度条）
CREATE INDEX IF NOT EXISTS idx_patient_education_patient_read
  ON medmuse.patient_education_material (patient_id, is_read);

-- 同一患者 + 同一疾病 + 同一栏目只推一次；重复推送 ON CONFLICT DO NOTHING，
-- 不覆盖患者已经读过的状态。
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_education_patient_disease_category
  ON medmuse.patient_education_material (patient_id, disease, category);
