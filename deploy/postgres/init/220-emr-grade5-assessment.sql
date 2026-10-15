-- M99-A: 电子病历五级评审八维度闭环自评分表
-- 八维度：医疗质量/护理管理/医技管理/患者服务/运营管理/数据质量/信息安全/互联互通
-- 每次自评写入 8 行（每维度一行），以 assessed_at 同一批次聚合解读。
-- 权限码 emr_level5:view 为既有权限（见 201-ai-native-emr-permissions.sql），此处不再重复授予。
-- Copyright (c) 2026 杭州健澜科技有限公司

CREATE TABLE IF NOT EXISTS clinical.emr_grade5_assessment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension   text NOT NULL,
  score       numeric NOT NULL,
  max_score   numeric NOT NULL,
  evidence    text NOT NULL DEFAULT '',
  suggestions text NOT NULL DEFAULT '',
  assessed_at timestamptz NOT NULL DEFAULT now()
);

-- 按维度 + 时间倒序取最新一批，加速 listView 查询
CREATE INDEX IF NOT EXISTS idx_emr_grade5_assessment_dim_time
  ON clinical.emr_grade5_assessment (dimension, assessed_at DESC);
