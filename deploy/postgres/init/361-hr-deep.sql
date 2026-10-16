-- ============================================================================
-- 健澜科技 jlmedaios · M178-B 医院人力资源深化——公平公开，不搞暗箱操作
-- 361-hr-deep.sql
--
-- 业务定位（财务人力行政党建）：
--   在「人」这条主线上，把医院 HR 从「发工资、走流程」升级为
--   「编制公开、招聘透明、培训计学分、绩效算公式」的阳光人力驾驶舱：
--
--     人员编制：编制数 + 实有人数 + 缺编率，缺多少、缺在哪，全院一张表；
--     招聘管理：岗位需求 → 简历筛选 → 面试评分 → 录用，全程留痕、多人评分取均值，
--               不允许单个领导拍脑袋定人（fairness_audit 字段记录评分人个数）；
--     培训管理：培训计划 + 培训记录 + 学分管理，职称晋升所需学分公开可查；
--     绩效管理：KPI 权重公开 → 考核得分 → 绩效工资 = 基本工资 × 绩效系数，
--               公式写在表里、算在明处，杜绝「个别发放」「暗箱补贴」。
--
-- 核心红线（公平）：
--   - 招聘面试至少 3 名评委独立打分，去掉一个最高分、一个最低分后取均值；
--   - 绩效工资公式列化（kpi_weighted_score / perf_coefficient / perf_pay），
--     BFF 纯函数 calculatePerformancePay 可复算，任何人对工资都能问出依据；
--   - 学分达标与否由规则判定（required_credits vs earned_credits），不搞领导送学分。
--
-- 设计边界：
--   - 本脚本创建 hr.staff 主表（若已存在则 ADD COLUMN IF NOT EXISTS，可重入）；
--   - 新增 hr.recruitment_pipeline（招聘漏斗留痕）、hr.training_record（培训学分流水）、
--     hr.performance_review（KPI 与绩效工资结果）三张从表；
--   - 纯演示种子，不碰 WebSocket、不新增依赖；
--   - 幂等：CREATE SCHEMA IF NOT EXISTS / CREATE TABLE IF NOT EXISTS /
--           ALTER TABLE ... ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS hr;

-- ---------------------------------------------------------------------------
-- 一、hr.staff 主表（员工档案 + 编制 + 学分 + 绩效基线）
--   与 BFF 纯函数 buildDeepHRMgmt / calculateStaffingGap / trackTrainingRecord /
--   calculatePerformancePay 内置演示台账对齐，空库即可演示公平阳光人力。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.staff (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        text NOT NULL UNIQUE,                 -- 工号（如 S1001），业务主键
  name            text NOT NULL,                        -- 姓名（演示用脱敏化名）
  dept            text NOT NULL,                        -- 科室编码：IN 心内科 / SU 普外科 / NU 护理部 / RD 医技
  dept_name       text NOT NULL DEFAULT '',
  title           text NOT NULL DEFAULT '',             -- 职称：主任医师/副主任医师/主治医师/住院医师/护士
  position_level  integer NOT NULL DEFAULT 1,           -- 岗位等级 1..10（决定基本工资基数）

  -- 人员编制
  authorized_headcount integer NOT NULL DEFAULT 0 CHECK (authorized_headcount >= 0),  -- 科室编制数
  actual_headcount     integer NOT NULL DEFAULT 0 CHECK (actual_headcount >= 0),     -- 科室实有人数（冗余汇总）

  -- 薪酬与绩效基线
  base_salary       numeric(12,2) NOT NULL DEFAULT 0.00,  -- 基本工资（元/月）
  perf_pool         numeric(12,2) NOT NULL DEFAULT 0.00,  -- 科室可分配绩效奖金池（元/月，公开）

  -- 培训学分（年度）
  required_credits  numeric(6,1) NOT NULL DEFAULT 25.0,   -- 年度应修学分（职称分级公开标准）
  earned_credits    numeric(6,1) NOT NULL DEFAULT 0.0,    -- 年度已修学分（培训记录累加）

  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  hr.staff                IS '【财务人力行政党建】员工档案+编制+学分+绩效基线（阳光人力，公平公开）';
COMMENT ON COLUMN hr.staff.authorized_headcount IS '科室编制数（编制公开，全院一张表）';
COMMENT ON COLUMN hr.staff.actual_headcount     IS '科室实有人数';
COMMENT ON COLUMN hr.staff.required_credits     IS '年度应修学分（职称分级公开标准）';
COMMENT ON COLUMN hr.staff.earned_credits       IS '年度已修学分（培训记录累加，不送学分）';
COMMENT ON COLUMN hr.staff.base_salary          IS '基本工资（元/月）；绩效工资=基本工资×绩效系数，公式公开';
COMMENT ON COLUMN hr.staff.perf_pool            IS '科室可分配绩效奖金池（元/月，分配规则公开）';

-- 兼容已有 hr.staff 的场景：扩展列（幂等）
ALTER TABLE hr.staff
  ADD COLUMN IF NOT EXISTS perf_coefficient   numeric(4,2) NOT NULL DEFAULT 1.00,  -- 绩效系数（0.8~1.5，由 KPI 加权得分映射）
  ADD COLUMN IF NOT EXISTS last_kpi_score     numeric(5,2) NOT NULL DEFAULT 0.00,   -- 上期 KPI 加权得分（0~100）
  ADD COLUMN IF NOT EXISTS fairness_flag      boolean NOT NULL DEFAULT true,        -- 公平标识：true=全程留痕、公式可复算
  ADD COLUMN IF NOT EXISTS recruit_reviewers  integer NOT NULL DEFAULT 3 CHECK (recruit_reviewers >= 3); -- 招聘评委人数（≥3，杜绝一人拍板）

CREATE INDEX IF NOT EXISTS idx_hr_staff_dept      ON hr.staff(dept);
CREATE INDEX IF NOT EXISTS idx_hr_staff_active    ON hr.staff(is_active);

-- ---------------------------------------------------------------------------
-- 二、hr.recruitment_pipeline 招聘漏斗留痕（公平：多人评分取均值）
--   一个岗位需求 = 多条候选人记录；每个候选人由 recruit_reviewers 名评委独立打分，
--   BFF 端去掉一个最高分、一个最低分后取均值，全程留痕不暗箱。
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.recruitment_pipeline (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id  text NOT NULL,                        -- 岗位需求单号（如 REQ-2026-001）
  dept            text NOT NULL,
  position        text NOT NULL,                        -- 招聘岗位
  stage           text NOT NULL DEFAULT 'applied'       -- 漏斗阶段
                    CHECK (stage IN ('requisition','screened','interviewing','offered','hired','rejected')),
  candidate_no    text NOT NULL,                        -- 候选人编号（脱敏 C-xxxx）
  reviewer_count  integer NOT NULL DEFAULT 3 CHECK (reviewer_count >= 3),  -- 评委人数
  scores          numeric(5,2)[] NOT NULL DEFAULT '{}', -- 各评委独立打分（0~100），可复算均分
  final_score     numeric(5,2) NOT NULL DEFAULT 0.00,  -- 去掉最高最低后均值（BFF 计算落库留痕）
  hired           boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  hr.recruitment_pipeline IS '【财务人力行政党建】招聘漏斗留痕：≥3 评委独立打分，去最高最低取均值，不搞一人拍板';
CREATE INDEX IF NOT EXISTS idx_hr_recruit_req ON hr.recruitment_pipeline(requisition_id, stage);

-- ---------------------------------------------------------------------------
-- 三、hr.training_record 培训学分流水（公开学分，不送学分）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.training_record (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        text NOT NULL,
  course_name     text NOT NULL,
  category        text NOT NULL DEFAULT 'general'       -- 类别：general 公共 / clinical 临床 / management 管理 / safety 质控
                    CHECK (category IN ('general','clinical','management','safety')),
  credits         numeric(5,1) NOT NULL DEFAULT 0.0 CHECK (credits >= 0),
  period          text NOT NULL,                        -- 考核周期（如 2026H1 / 2026Q3 / 2026）
  completed_at    date NOT NULL DEFAULT CURRENT_DATE,
  status          text NOT NULL DEFAULT 'done'
                    CHECK (status IN ('planned','done','expired'))
);

COMMENT ON TABLE hr.training_record IS '【财务人力行政党建】培训记录+学分流水：学分按课程认定规则累加，达标与否公开可查';
CREATE INDEX IF NOT EXISTS idx_hr_training_staff ON hr.training_record(staff_id, period);

-- ---------------------------------------------------------------------------
-- 四、hr.performance_review KPI 与绩效工资结果（公式列化，可复算）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr.performance_review (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        text NOT NULL,
  period          text NOT NULL,                        -- 考核周期
  kpi_quality     numeric(5,2) NOT NULL DEFAULT 0.00,   -- 医疗质量维度得分（权重公开 40%）
  kpi_efficiency  numeric(5,2) NOT NULL DEFAULT 0.00,   -- 工作效率维度得分（权重公开 30%）
  kpi_service     numeric(5,2) NOT NULL DEFAULT 0.00,   -- 患者满意度维度得分（权重公开 20%）
  kpi_collab      numeric(5,2) NOT NULL DEFAULT 0.00,   -- 协作与教学维度得分（权重公开 10%）
  weighted_score  numeric(5,2) NOT NULL DEFAULT 0.00,  -- 加权总分（BFF 计算落库）
  perf_coefficient numeric(4,2) NOT NULL DEFAULT 1.00,  -- 绩效系数（由加权分映射，公开分段）
  perf_pay        numeric(12,2) NOT NULL DEFAULT 0.00,  -- 绩效工资 = 基本工资 × 系数
  bonus_share     numeric(12,2) NOT NULL DEFAULT 0.00,  -- 奖金分配（按得分占比从科室奖金池切分）
  reviewed_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hr.performance_review IS '【财务人力行政党建】KPI 考核+绩效工资：权重公开、公式列化、任何人可复算，杜绝暗箱补贴';
CREATE INDEX IF NOT EXISTS idx_hr_perf_staff ON hr.performance_review(staff_id, period);

-- ---------------------------------------------------------------------------
-- 五、演示种子（与 BFF 内置台账对齐；ON CONFLICT DO NOTHING 可重入）
-- ---------------------------------------------------------------------------
INSERT INTO hr.staff
  (staff_id, name, dept, dept_name, title, position_level,
   authorized_headcount, actual_headcount, base_salary, perf_pool,
   required_credits, earned_credits, perf_coefficient, last_kpi_score)
VALUES
  ('S1001', '陈医生', 'IN', '心内科', '主任医师', 9,  12, 10, 18000.00, 60000.00, 25.0, 22.0, 1.20, 88.0),
  ('S1002', '林医生', 'IN', '心内科', '副主任医师', 7, 12, 10, 14000.00, 60000.00, 25.0, 26.0, 1.10, 82.0),
  ('S1003', '王医生', 'IN', '心内科', '主治医师', 5,   12, 10, 10000.00, 60000.00, 25.0, 18.0, 0.95, 72.0),
  ('S2001', '赵医生', 'SU', '普外科', '主任医师', 9,  15, 12, 18000.00, 70000.00, 25.0, 30.0, 1.30, 92.0),
  ('S2002', '周医生', 'SU', '普外科', '主治医师', 5,  15, 12, 10000.00, 70000.00, 25.0, 12.0, 0.85, 65.0),
  ('S3001', '李护士长', 'NU', '护理部', '副主任护师', 6, 60, 55, 9000.00, 90000.00, 25.0, 28.0, 1.15, 85.0),
  ('S3002', '吴护士', 'NU', '护理部', '护师', 3,      60, 55, 6500.00, 90000.00, 25.0, 9.0, 0.90, 70.0),
  ('S4001', '钱技师', 'RD', '检验科', '主管技师', 5,    8,  8, 9500.00, 30000.00, 25.0, 25.0, 1.00, 78.0)
ON CONFLICT (staff_id) DO NOTHING;

INSERT INTO hr.recruitment_pipeline
  (requisition_id, dept, position, stage, candidate_no, reviewer_count, scores, final_score, hired)
VALUES
  ('REQ-2026-01','IN','心内科主治医师','interviewing','C-101',3,'{88,92,90}',90.00,false),
  ('REQ-2026-01','IN','心内科主治医师','interviewing','C-102',3,'{85,89,87}',87.00,false),
  ('REQ-2026-01','IN','心内科主治医师','interviewing','C-103',3,'{95,70,88}',88.00,false),
  ('REQ-2026-02','SU','普外科住院医师','offered','C-201',4,'{86,90,84,88}',87.33,true),
  ('REQ-2026-02','SU','普外科住院医师','rejected','C-202',4,'{70,72,68,71}',70.33,false)
ON CONFLICT DO NOTHING;

INSERT INTO hr.training_record
  (staff_id, course_name, category, credits, period, status)
VALUES
  ('S1001','心血管新进展','clinical',8.0,'2026','done'),
  ('S1001','医疗质量安全核心制度','safety',6.0,'2026','done'),
  ('S1001','科室管理与沟通','management',8.0,'2026','planned'),
  ('S1003','心电诊断进阶','clinical',10.0,'2026','done'),
  ('S1003','医患沟通实务','general',8.0,'2026','done'),
  ('S2002','外科围手术期管理','clinical',12.0,'2026','planned'),
  ('S3002','静脉治疗护理规范','clinical',9.0,'2026','done')
ON CONFLICT DO NOTHING;

INSERT INTO hr.performance_review
  (staff_id, period, kpi_quality, kpi_efficiency, kpi_service, kpi_collab, weighted_score, perf_coefficient, perf_pay, bonus_share)
VALUES
  ('S1001','2026H1',90,88,86,88,88.00,1.20,21600.00,6000.00),
  ('S1003','2026H1',70,72,75,70,72.10,0.95,9500.00,3200.00),
  ('S2002','2026H1',62,66,70,60,64.60,0.85,8500.00,2400.00)
ON CONFLICT DO NOTHING;
