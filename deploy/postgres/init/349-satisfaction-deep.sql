-- ============================================================================
-- 健澜科技 jlmedaios — 【患者体验深化】满意度闭环 M174-D
-- 349-satisfaction-deep.sql
--
-- 设计原则：满意度闭环要真改进，不能只是登记。
--   M165-C 已建 medmuse.service_improvement 四阶段闭环（收集→分析→改进→验证）；
--   本脚本在 clinical.satisfaction_surveys 之上扩展「深化字段」，把问卷从
--   「一次评分 + 一句评论」升级为可驱动 PDCA 闭环的结构化信号：
--
--   * 多渠道收集 channel：门诊 / 住院 / 手术 / 检查 / 药房 / 后勤，
--     覆盖患者全旅程触点，不再只靠门诊窗后一张问卷；
--   * 情感分析 emotion_label + emotion_score：
--     正面 positive / 中性 neutral / 负面 negative 自动分类，
--     情感分 -1.0 ~ +1.0，与 overall_score 交叉验证；
--   * 5Why 根因 five_why_chain（JSONB）：
--     [{ q, a }] 最多 5 层追问，把「排队久」追到「号源窗口配置」而不是停在「人多」；
--   * PDCA 闭环 pdca_phase：
--     plan → do → check → act，每个改进事项显式落阶段，不允许 plan 完就归档；
--   * 患者 NPS nps_score（0-10）+ nps_category：
--     推荐者 promoter(9-10) / 被动者 passive(7-8) / 贬损者 detractor(0-6)，
--     NPS = %promoter - %detractor，跟踪净推荐值随改进的变化。
--
-- 本脚本只 ALTER 加列 + 新增索引 + 新增枚举，不动历史行；
-- 老行新列允许 NULL，聚合器对 NULL 做防御性兜底，不破坏存量数据。
-- 纯函数聚合器见 src/bff/aggregators/satisfactionDeepAggregator.ts：
--   buildDeepSatisfactionLoop / analyzeSatisfactionTrend /
--   benchmarkSatisfaction / generatePatientVoiceReport。
--
-- 医疗安全红线：
--   * 本模块为患者体验运营工具，不写医嘱、不触发临床路径；
--   * five_why_chain 仅存脱敏后的问题描述，不存患者姓名/手机号等 PII；
--   * emotion_label 由纯函数词典分类产出，仅作运营参考，不自动扣分/处罚；
--   * NPS 仅统计提交了 nps_score 的问卷，样本量过小聚合器标记 underpowered。
--
-- 幂等：ALTER TABLE ... ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- 持续优化与新场景：未来新增触点（互联网医院/家庭病床/随访）只需扩 channel 枚举。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- 多渠道触点枚举：覆盖患者全旅程
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'satisfaction_channel') THEN
    CREATE TYPE clinical.satisfaction_channel AS ENUM (
      'outpatient',   -- 门诊
      'inpatient',    -- 住院
      'surgery',      -- 手术
      'exam',         -- 检查（检验/放射/超声）
      'pharmacy',     -- 药房
      'logistics',    -- 后勤（食堂/停车/保洁/陪检）
      'online'        -- 互联网医院（持续优化与新场景）
    );
  END IF;
END$$;

-- 情感三分类
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emotion_label') THEN
    CREATE TYPE clinical.emotion_label AS ENUM (
      'positive',   -- 正面
      'neutral',    -- 中性
      'negative'    -- 负面
    );
  END IF;
END$$;

-- PDCA 四阶段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pdca_phase') THEN
    CREATE TYPE clinical.pdca_phase AS ENUM (
      'plan',   -- Plan：定位根因 + 制定措施
      'do',     -- Do：执行改进
      'check',  -- Check：复查满意度/NPS 对比
      'act'     -- Act：标准化沉淀或回炉再 plan
    );
  END IF;
END$$;

-- NPS 三档分类
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nps_category') THEN
    CREATE TYPE clinical.nps_category AS ENUM (
      'promoter',   -- 推荐者 9-10
      'passive',    -- 被动者 7-8
      'detractor'    -- 贬损者 0-6
    );
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 在 clinical.satisfaction_surveys 上扩展深化字段（老行允许 NULL）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.satisfaction_surveys
  ADD COLUMN IF NOT EXISTS channel          clinical.satisfaction_channel NOT NULL DEFAULT 'outpatient',
  ADD COLUMN IF NOT EXISTS emotion_label   clinical.emotion_label,
  ADD COLUMN IF NOT EXISTS emotion_score    numeric(4,3) CHECK (emotion_score BETWEEN -1 AND 1),
  ADD COLUMN IF NOT EXISTS five_why_chain   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS root_cause_code  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pdca_phase     clinical.pdca_phase NOT NULL DEFAULT 'plan',
  ADD COLUMN IF NOT EXISTS nps_score       integer CHECK (nps_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS nps_category    clinical.nps_category,
  ADD COLUMN IF NOT EXISTS benchmark_dept  text NOT NULL DEFAULT '';

COMMENT ON COLUMN clinical.satisfaction_surveys.channel        IS 'M174-D 多渠道触点：门诊/住院/手术/检查/药房/后勤/互联网';
COMMENT ON COLUMN clinical.satisfaction_surveys.emotion_label IS 'M174-D 情感三分类：positive/neutral/negative（纯函数词典产出，运营参考）';
COMMENT ON COLUMN clinical.satisfaction_surveys.emotion_score IS 'M174-D 情感分 -1.0~+1.0，与 overall_score 交叉验证';
COMMENT ON COLUMN clinical.satisfaction_surveys.five_why_chain IS 'M174-D 5Why 根因链 [{q,a}] 最多 5 层，脱敏文本';
COMMENT ON COLUMN clinical.satisfaction_surveys.root_cause_code IS 'M174-D 根因编码（与 medmuse.service_improvement.root_cause 对齐）';
COMMENT ON COLUMN clinical.satisfaction_surveys.pdca_phase     IS 'M174-D PDCA 闭环阶段：plan/do/check/act，不允许 plan 完即归档';
COMMENT ON COLUMN clinical.satisfaction_surveys.nps_score      IS 'M174-D 患者净推荐值 0-10（是否愿把本院推荐给亲友）';
COMMENT ON COLUMN clinical.satisfaction_surveys.nps_category  IS 'M174-D NPS 三档：promoter(9-10)/passive(7-8)/detractor(0-6)';
COMMENT ON COLUMN clinical.satisfaction_surveys.benchmark_dept IS 'M174-D 对标科室/区域标杆，空串表示不参与对标';

-- 多渠道索引：按渠道 + 时间聚合趋势
CREATE INDEX IF NOT EXISTS idx_satisfaction_channel_time
  ON clinical.satisfaction_surveys(channel, submitted_at DESC);

-- 情感分布索引：运营例会下钻负面评论
CREATE INDEX IF NOT EXISTS idx_satisfaction_emotion
  ON clinical.satisfaction_surveys(emotion_label, submitted_at DESC);

-- NPS 索引：跟踪净推荐值变化
CREATE INDEX IF NOT EXISTS idx_satisfaction_nps
  ON clinical.satisfaction_surveys(nps_category, submitted_at DESC)
  WHERE nps_score IS NOT NULL;

-- PDCA 阶段索引：客服看板按阶段派单
CREATE INDEX IF NOT EXISTS idx_satisfaction_pdca
  ON clinical.satisfaction_surveys(pdca_phase, root_cause_code)
  WHERE pdca_phase IN ('plan', 'do', 'check');

-- 表注释升级
COMMENT ON TABLE clinical.satisfaction_surveys IS
  '【患者体验深化 M174-D】满意度问卷：多渠道 + 情感分析 + 5Why 根因 + PDCA + NPS，闭环真改进不只登记';

-- ----------------------------------------------------------------------------
-- 权限点（在 M3-O 已有 satisfaction:view/submit 之上新增深化看板权限）
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('satisfaction:deep:view',   '满意度深化看板查看', 'service', '查看多渠道/情感/5Why/PDCA/NPS 深化闭环'),
  ('satisfaction:deep:manage', '满意度深化闭环管理', 'service', '派单 PDCA 阶段流转与 5Why 根因修正')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code IN ('admin', 'doctor', 'nurse')
   AND p.code IN ('satisfaction:deep:view', 'satisfaction:deep:manage')
ON CONFLICT (role_code, permission_code) DO NOTHING;
