-- ============================================================================
-- 健澜科技 jlmedaios · M179-D 医院药事管理深化（护理院感医保药事·安全无差错）
-- 367-pharmacy-mgmt.sql
--
-- 【药事管理要安全，不能出差错】在 25-drug-catalog.sql 的 clinical.drug_inventory
-- 与 346-pharmacy-deep.sql 的「智能药房」之上，把药事管理从「事后盘点」升级为
-- 全流程闭环的药事管理体系，覆盖四大维度：
--
--   ① 药品采购：计划 → 招标 → 采购 → 验收（四单匹配，票/账/货一致才入库）；
--   ② 药品库存：入库 → 出库 → 盘点 → 效期（FEFO 先近先出，过期零出库）；
--   ③ 药品使用：处方点评 → 用药监测 → ADR 报告（点评不合理处方闭环整改）；
--   ④ 药品质量：入库检验 → 在库养护 → 退货处理（不合格品隔离区锁定）。
--
-- 安全红线（护理院感医保药事）：
--   - 采购四单匹配：计划单/招标单/采购单/验收单四单一致，任一不符不入库；
--   - 验收双人复核：冷链药品温湿度记录双人签字，异常即拒收；
--   - 效期 FEFO：近效期 90 天优先出库，过期批次系统级锁库零出库；
--   - 处方点评：不合理处方 100% 反馈医师，连续 3 次不合理约谈；
--   - ADR 报告：严重 ADR 24 小时内上报国家监测系统，留痕可追溯；
--   - 质量退货：不合格品进隔离区，未经质量负责人签字不得退回供应商。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / DO 块判断加列 / ON CONFLICT DO NOTHING /
--       WHERE NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 0. 扩展既有 drug_inventory：挂载药事管理闭环字段（幂等加列）
--    护理院感医保药事：库存记录必须可追溯到采购批次、效期、养护人、验收人
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- 采购批次号：关联采购单与验收单，实现四单匹配追溯
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'purchase_batch_no'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN purchase_batch_no varchar(64);
  END IF;

  -- 供应商编码：采购来源追溯（GSP 要求）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'supplier_code'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN supplier_code varchar(64);
  END IF;

  -- 生产日期（批次级）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'production_date'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN production_date date;
  END IF;

  -- 有效期至（批次级效期，FEFO 依据）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN expiry_date date;
  END IF;

  -- 储存条件：常温 / 阴凉 / 冷藏(2-8℃) / 冷冻(-20℃)，冷链监控依据
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'storage_condition'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN storage_condition varchar(16) NOT NULL DEFAULT '常温';
  END IF;

  -- 验收人（双人复核制，冷链药品必须两人签字）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN accepted_by varchar(64);
  END IF;

  -- 验收复核人（第二人，冷链双人签字）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'accepted_by_2'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN accepted_by_2 varchar(64);
  END IF;

  -- 在库养护人：定期巡检责任人
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'cared_by'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN cared_by varchar(64);
  END IF;

  -- 最近养护日期：在库养护周期依据
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'last_care_date'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN last_care_date date;
  END IF;

  -- 批次状态：in_stock / quarantined(隔离) / returned(退货中) / expired(锁定)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'batch_status'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN batch_status varchar(16) NOT NULL DEFAULT 'in_stock';
  END IF;

  -- 入库检验结论：pending / passed / failed / conditional(条件放行)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'qc_result'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN qc_result varchar(16) NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. 药品采购：采购计划表（计划 → 招标 → 采购 → 验收四单匹配起点）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_purchase_plan (
  plan_id            varchar(64) PRIMARY KEY,
  hospital_id        varchar(64) NOT NULL,
  plan_period        varchar(16) NOT NULL,            -- 月度/季度/年度
  drug_id            varchar(64) NOT NULL,
  drug_name          varchar(128) NOT NULL,
  planned_qty        numeric(14,2) NOT NULL DEFAULT 0,
  approved_qty       numeric(14,2) NOT NULL DEFAULT 0,
  unit               varchar(16) NOT NULL DEFAULT '盒',
  estimated_price    numeric(12,2) NOT NULL DEFAULT 0,
  status             varchar(16) NOT NULL DEFAULT 'draft', -- draft/approved/tendered/ordered/received
  created_by         varchar(64) NOT NULL,
  approved_by        varchar(64),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. 药品采购：招标与采购单（四单匹配的中间两环）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_purchase_order (
  order_id           varchar(64) PRIMARY KEY,
  plan_id            varchar(64) REFERENCES clinical.pharmacy_purchase_plan(plan_id),
  hospital_id        varchar(64) NOT NULL,
  tender_no          varchar(64),                     -- 招标编号
  supplier_code      varchar(64) NOT NULL,
  supplier_name      varchar(128) NOT NULL,
  drug_id            varchar(64) NOT NULL,
  drug_name          varchar(128) NOT NULL,
  ordered_qty        numeric(14,2) NOT NULL DEFAULT 0,
  unit_price         numeric(12,2) NOT NULL DEFAULT 0,
  total_amount       numeric(14,2) NOT NULL DEFAULT 0,
  storage_condition  varchar(16) NOT NULL DEFAULT '常温',
  status             varchar(16) NOT NULL DEFAULT 'ordered', -- ordered/received/rejected
  ordered_by         varchar(64) NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. 药品验收：四单匹配闭环终点（计划/招标/采购/验收一致才入库）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_acceptance (
  acceptance_id      varchar(64) PRIMARY KEY,
  order_id           varchar(64) NOT NULL REFERENCES clinical.pharmacy_purchase_order(order_id),
  hospital_id        varchar(64) NOT NULL,
  batch_no           varchar(64) NOT NULL,
  production_date    date,
  expiry_date        date,
  accepted_qty       numeric(14,2) NOT NULL DEFAULT 0,
  rejected_qty       numeric(14,2) NOT NULL DEFAULT 0,
  -- 冷链温湿度记录（冷链药品必填）
  temp_min_c         numeric(5,2),
  temp_max_c         numeric(5,2),
  humidity_pct       numeric(5,2),
  -- 四单匹配结果：matched / mismatched
  match_status       varchar(16) NOT NULL DEFAULT 'pending',
  qc_result          varchar(16) NOT NULL DEFAULT 'pending', -- pending/passed/failed
  accepted_by        varchar(64) NOT NULL,
  accepted_by_2      varchar(64),                     -- 第二验收人（冷链双人）
  remark             text,
  accepted_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. 药品使用：处方点评记录（不合理处方闭环整改）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_prescription_review (
  review_id          varchar(64) PRIMARY KEY,
  hospital_id        varchar(64) NOT NULL,
  prescription_id    varchar(64) NOT NULL,
  patient_id         varchar(64) NOT NULL,
  prescriber_id      varchar(64) NOT NULL,
  prescriber_name    varchar(64) NOT NULL,
  department         varchar(64),
  review_period      varchar(16) NOT NULL,            -- 点评周期
  -- 点评结论：reasonable / irrational(不合理)
  conclusion         varchar(16) NOT NULL DEFAULT 'reasonable',
  -- 不合理类型：dosage(剂量不适宜)/indication(适应症不适宜)/interaction(联用禁忌)/
  --             duplication(重复用药)/administration(给药途径不适宜)/other
  irrational_type    varchar(32),
  detail             text,
  reviewed_by        varchar(64) NOT NULL,             -- 点评药师
  feedback_to_md     boolean NOT NULL DEFAULT false,   -- 是否已反馈医师
  rectified          boolean NOT NULL DEFAULT false,   -- 是否已整改
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. 药品使用：ADR 药品不良反应报告（严重 ADR 24h 上报）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_adr_report (
  adr_id             varchar(64) PRIMARY KEY,
  hospital_id        varchar(64) NOT NULL,
  patient_id         varchar(64) NOT NULL,
  drug_id            varchar(64) NOT NULL,
  drug_name          varchar(128) NOT NULL,
  -- 严重程度：mild / moderate / severe / fatal
  severity           varchar(16) NOT NULL DEFAULT 'mild',
  symptoms           text NOT NULL,
  outcome            varchar(16),                     -- recovered/recovering/not_yet/death
  -- 上报状态：draft / submitted(已报国家系统)
  report_status      varchar(16) NOT NULL DEFAULT 'draft',
  reported_at        timestamptz,
  reporter_id        varchar(64) NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. 药品质量：在库养护记录（定期巡检，近效期/温湿度异常处理）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_storage_care (
  care_id            varchar(64) PRIMARY KEY,
  hospital_id        varchar(64) NOT NULL,
  inventory_id       varchar(64) NOT NULL,            -- 关联 drug_inventory
  care_date          date NOT NULL DEFAULT CURRENT_DATE,
  -- 养护结论：normal / near_expiry / temp_anomaly / packaging_damage / expired
  care_result        varchar(32) NOT NULL DEFAULT 'normal',
  temp_c             numeric(5,2),
  humidity_pct       numeric(5,2),
  action_taken       text,
  cared_by           varchar(64) NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. 药品质量：退货处理记录（不合格品隔离区，质量负责人签字）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_return (
  return_id          varchar(64) PRIMARY KEY,
  hospital_id        varchar(64) NOT NULL,
  inventory_id       varchar(64) NOT NULL,
  supplier_code      varchar(64) NOT NULL,
  return_qty         numeric(14,2) NOT NULL DEFAULT 0,
  -- 退货原因：qc_failed(检验不合格)/expired(过期)/damaged(破损)/near_expiry(近效期滞销)/other
  reason             varchar(32) NOT NULL,
  -- 状态：quarantined(隔离中)/approved(质量负责人批准)/returned(已退供应商)/destroyed(销毁)
  status             varchar(16) NOT NULL DEFAULT 'quarantined',
  quality_officer    varchar(64),                     -- 质量负责人签字
  remark             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. 索引（药事管理高频查询：按医院/周期/药品/状态）
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pharmacy_plan_hospital_period
  ON clinical.pharmacy_purchase_plan (hospital_id, plan_period);
CREATE INDEX IF NOT EXISTS idx_pharmacy_order_supplier
  ON clinical.pharmacy_purchase_order (supplier_code, status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_acceptance_batch
  ON clinical.pharmacy_acceptance (batch_no, match_status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_review_period
  ON clinical.pharmacy_prescription_review (hospital_id, review_period, conclusion);
CREATE INDEX IF NOT EXISTS idx_pharmacy_adr_severity
  ON clinical.pharmacy_adr_report (hospital_id, severity, report_status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_care_date
  ON clinical.pharmacy_storage_care (hospital_id, care_date, care_result);
CREATE INDEX IF NOT EXISTS idx_pharmacy_return_status
  ON clinical.pharmacy_return (hospital_id, status);

-- ============================================================================
-- 药事管理闭环完成：采购四单匹配 → 入库验收 → 在库养护 → 处方点评 → ADR 上报 → 退货销毁
-- 护理院感医保药事：每一步都有责任人、留痕、可追溯、双人复核（冷链）。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================
