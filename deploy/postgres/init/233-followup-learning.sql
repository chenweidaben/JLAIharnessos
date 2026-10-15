-- =============================================================
-- 健澜科技 jlmedaios - 患者随访学习引擎表（M33）
-- 依据宪法第四章：公民的基本权利和义务，患者健康与随访数据
-- 属于个人信息，遵循最小必要、授权访问原则。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- =============================================================

CREATE TABLE IF NOT EXISTS medmuse.followup_learning (
    patient_id               text,
    disease_type             text,
    followup_success_rate    numeric DEFAULT 0,
    recommended_interval_days int,
    last_followup            timestamptz,
    response_rate            numeric DEFAULT 0,
    updated_at               timestamptz DEFAULT now(),
    PRIMARY KEY (patient_id, disease_type)
);

COMMENT ON TABLE medmuse.followup_learning IS '患者随访学习引擎：按患者+疾病维度沉淀应答率并推荐随访间隔';
