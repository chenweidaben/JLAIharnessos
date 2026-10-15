-- ============================================================================
-- 健澜科技 jlmedaios · M143-B 远程会诊系统（互联网医院与远程医疗）
--
-- 【互联网医院与远程医疗】打破院内围墙，三类会诊统一台账：
--   mdt            院内多学科会诊（Multi-Disciplinary Team）：
--                    一次申请邀请多个学科专家联合阅片 / 查房，专家可多人串行接受；
--   inter_hospital 院间远程会诊：向上级医院 / 协作院发起远程会诊；
--   international  国际远程会诊：对接海外 / 境外机构的跨境专家会诊。
--
-- 时效性红线：急会诊 urgent=true，自申请起 2 小时内必须有专家接受；
--   超过 2h 仍处于 requested 未接受状态，自动置 escalated=true 并生成升级提醒，
--   由会诊调度台 / 短信 / 公众号渠道加急催办（「急会诊 2 小时内响应」）。
--
-- 状态机：requested（已申请待接受）→ accepted（专家已接受）→ reported（已提交会诊报告）。
--   MDT：被邀专家逐位接受，全部接受后才整体进入 accepted；
--   院间 / 国际：单一受邀专家，接受即进入 accepted。
--
-- 医疗合规：
--   - 会诊报告由接受会诊的专家本人提交并留痕（reported_at / accepted_by）；
--   - AI 不自动出报告，只做台账流转、时效计算与超期升级提醒；
--   - 跨境国际会诊数据不出院，仅传输脱敏影像与摘要。
--
-- 权限码：remote_consult:view     只读（医生 / admin 查会诊单与时效）；
--         remote_consult:request  发起会诊（医生 / admin）；
--         remote_consult:accept   专家接受会诊（受邀专家 / admin）；
--         remote_consult:report   提交会诊报告（受邀专家 / admin）。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / WHERE NOT EXISTS，可重入。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 远程会诊单台账（一张会诊单一条；MDT 专家列表以 jsonb 落库）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.remote_consultation (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 会诊类型：mdt 院内多学科 / inter_hospital 院间远程 / international 国际远程
  consult_type        text NOT NULL CHECK (consult_type IN ('mdt','inter_hospital','international')),
  -- 申请侧
  req_dept            text NOT NULL,
  req_doctor          text NOT NULL,
  patient_id          text NOT NULL,
  reason              text NOT NULL,
  -- 受邀侧（院间 / 国际为外院机构；院内 MDT 留空）
  expert_hospital     text NOT NULL DEFAULT '',
  -- 受邀专家名单：['张主任','李主任']（MDT 多人）；accepted_experts 记录已接受者
  experts             jsonb NOT NULL DEFAULT '[]'::jsonb,
  accepted_experts    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 时效性：急会诊 2 小时内响应；超 2h 未接受自动升级
  urgent              boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'requested'
                      CHECK (status IN ('requested','accepted','reported')),
  requested_at        timestamptz NOT NULL DEFAULT now(),
  accept_deadline_at  timestamptz NOT NULL,
  accepted_at         timestamptz,
  accepted_by         text,
  report              text,
  reported_at         timestamptz,
  escalated           boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_consultation_patient
  ON clinical.remote_consultation(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remote_consultation_status
  ON clinical.remote_consultation(status, urgent, requested_at);
CREATE INDEX IF NOT EXISTS idx_remote_consultation_type
  ON clinical.remote_consultation(consult_type);

DROP TRIGGER IF EXISTS trg_remote_consultation_updated ON clinical.remote_consultation;
CREATE TRIGGER trg_remote_consultation_updated BEFORE UPDATE ON clinical.remote_consultation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('remote_consult:view',   '远程会诊只读', 'remote_consult', '查看会诊单、专家接受进度与急会诊时效升级（医生/admin）'),
  ('remote_consult:request', '远程会诊申请', 'remote_consult', '发起院内MDT/院间/国际远程会诊（医生/admin）'),
  ('remote_consult:accept',  '远程会诊接受', 'remote_consult', '受邀专家接受会诊，急会诊需 2 小时内响应（专家/admin）'),
  ('remote_consult:report',  '远程会诊报告', 'remote_consult', '受邀专家提交会诊报告并签名留痕（专家/admin）')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 角色授权（幂等）：view/request 授 doctor/admin；accept/report 授 admin（受邀专家经调度授权）
-- ---------------------------------------------------------------------------
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'admin', p.code
FROM (VALUES ('remote_consult:view'),('remote_consult:request'),('remote_consult:accept'),('remote_consult:report')) AS p(code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code='admin' AND rp.permission_code=p.code
);

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT 'doctor', p.code
FROM (VALUES ('remote_consult:view'),('remote_consult:request')) AS p(code)
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role_permissions rp WHERE rp.role_code='doctor' AND rp.permission_code=p.code
);
