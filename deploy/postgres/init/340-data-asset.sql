-- ============================================================================
-- 健澜科技 jlmedaios · M170-D 医院数据资产深化（数据资产台账与治理底座）
-- 340-data-asset.sql
--
-- 【自学习与数字孪生】数据资产要可治理，不能只是清单：
--   把全院数据资产按四大域登记入账，每条资产带「责任科室 / 敏感级别 / 质量分 /
--   覆盖率 / 新鲜度 / 保留年限 / 是否纳入治理」元数据，支撑自学习闭环持续
--   喂养 AI 健康大脑，并为数字孪生提供可信数据底座。
--
-- 四大资产域（与 BFF 纯函数 buildDataAssetInventory 口径一致）：
--   patient   患者数据：基本信息 / 就诊记录 / 检查检验 / 用药记录
--   medical   医疗数据：病历 / 处方 / 手术记录 / 护理记录
--   operation 运营数据：收入 / 成本 / 绩效 / 资源利用
--   ai        AI 数据  ：模型训练数据 / 反馈数据 / 经验数据
--
-- 可治理要点：
--   - 敏感级别 sensitivity_level 1~4（L1 公开 / L2 内部 / L3 敏感 / L4 核心机密），
--     buildDataGovernancePolicy 据此产出脱敏、授权、保留、备份策略；
--   - value_score 资产价值分（0~100），由 calculateDataAssetValue 计算；
--   - gap_flag / gap_reason 数据缺口标记，由 identifyDataGap 识别；
--   - owner_dept 责任科室落到人头管理，杜绝「数据没人管」；
--   - retention_years 依法定最低保留年限落库（门诊病历≥15 年、住院病历≥30 年）。
--
-- 医疗安全红线：
--   - 台账只存元数据，绝不存患者个体 PII；
--   - 敏感级别为 L4 的资产必须加密存储 + 双人授权访问；
--   - 本脚本幂等：CREATE TABLE IF NOT EXISTS + 增量索引兜底。
--
-- 兼容：依赖 77-lakehouse-layers.sql 已建 meta schema。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 数据资产台账主表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.data_asset (
  asset_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id           VARCHAR(64)  NOT NULL DEFAULT 'default',
  category            VARCHAR(16)  NOT NULL
                        CHECK (category IN ('patient','medical','operation','ai')),
  asset_key           VARCHAR(64)  NOT NULL,
  asset_name          VARCHAR(128) NOT NULL,
  description         VARCHAR(512) NOT NULL DEFAULT '',
  owner_dept          VARCHAR(128) NOT NULL DEFAULT '信息科',

  -- 规模与质量（自学习与数字孪生的数据新鲜度口径）
  volume_rows         BIGINT       NOT NULL DEFAULT 0,
  quality_score       NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (quality_score BETWEEN 0 AND 100),
  coverage_rate       NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (coverage_rate BETWEEN 0 AND 100),
  freshness_days      INTEGER      NOT NULL DEFAULT 999
                        CHECK (freshness_days >= 0),

  -- 治理属性
  sensitivity_level  SMALLINT     NOT NULL DEFAULT 2
                        CHECK (sensitivity_level IN (1,2,3,4)),
  retention_years     INTEGER      NOT NULL DEFAULT 10 CHECK (retention_years > 0),
  is_governed        BOOLEAN      NOT NULL DEFAULT FALSE,
  masking_required    BOOLEAN      NOT NULL DEFAULT FALSE,

  -- 价值与缺口（由 BFF 纯函数回写）
  value_score         NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (value_score BETWEEN 0 AND 100),
  value_grade         VARCHAR(16)  NOT NULL DEFAULT 'general',
  gap_flag            BOOLEAN      NOT NULL DEFAULT FALSE,
  gap_reason          VARCHAR(256) NOT NULL DEFAULT '',

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, asset_key)
);

COMMENT ON TABLE meta.data_asset IS
  '医院数据资产台账（M170-D）：四大域 15 类资产元数据，支撑自学习与数字孪生的可治理数据底座。';
COMMENT ON COLUMN meta.data_asset.category IS
  '资产域：patient 患者数据 / medical 医疗数据 / operation 运营数据 / ai AI 数据';
COMMENT ON COLUMN meta.data_asset.sensitivity_level IS
  '敏感级别：1=L1 公开 / 2=L2 内部 / 3=L3 敏感 / 4=L4 核心机密';
COMMENT ON COLUMN meta.data_asset.value_score IS
  '资产价值分 0~100，由 BFF calculateDataAssetValue 计算（质量/覆盖/新鲜度加权）';
COMMENT ON COLUMN meta.data_asset.gap_flag IS
  '是否存在数据缺口，由 BFF identifyDataGap 识别（质量<60 / 覆盖<60 / 超180天未更新 / 未纳入治理）';

-- ----------------------------------------------------------------------------
-- 2. 索引：按域/责任科室/缺口标记快速检索
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_data_asset_tenant_cat
  ON meta.data_asset (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_data_asset_owner
  ON meta.data_asset (owner_dept);
CREATE INDEX IF NOT EXISTS idx_data_asset_gap
  ON meta.data_asset (gap_flag) WHERE gap_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_data_asset_value
  ON meta.data_asset (value_score DESC);

-- ----------------------------------------------------------------------------
-- 3. updated_at 自动刷新触发器
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION meta.data_asset_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_data_asset_touch ON meta.data_asset;
CREATE TRIGGER trg_data_asset_touch
  BEFORE UPDATE ON meta.data_asset
  FOR EACH ROW EXECUTE FUNCTION meta.data_asset_touch_updated_at();
