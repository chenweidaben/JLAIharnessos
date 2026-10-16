-- ============================================================================
-- 健澜科技 jlmedaios · M171-B 医院教学智能化深化——在线学习与考核
-- 341-teaching-online.sql
--
-- 【科研教学后勤】在线学习要好用，不能只是视频列表：
--   把「视频课程（录播 + 直播 + 回放）/ 在线测验（单选 + 多选 + 判断 + 案例分析）/
--   学习进度跟踪（完成度 + 学习时长 + 测验成绩）/ 学分自动认定（完成课程 + 通过考试
--   = 自动获得学分）」四类在线学习业务统一落到 clinical.online_course 一张主表，
--   作为 BFF 聚合层四个纯函数的持久化快照：
--     buildOnlineLearningPlatform(category)        在线学习平台（课程目录 + 分类 + 学习概览）
--     generateQuizFromContent(content, difficulty) 从课程正文自动出题
--     evaluateStudentAnswer(question, answer, ...)  自动阅卷（单选/多选/判断/案例）
--     buildLearningPath(role, level)               按角色与层级推荐学习路径
--
-- 【在线学习要闭环，不能看完即走】
--   - course_mode 用 CHECK 锁死三类形态：recorded=录播 / live=直播 / replay=回放；
--   - quiz jsonb 固化题库（题型 + 选项 + 正确答案 + 解析 + 分值），由
--     generateQuizFromContent 自动派生，evaluateStudentAnswer 服务端阅卷，
--     不采信前端自报分数，防篡改；
--   - progress jsonb 记录「完成度 0~100 / 累计学习秒数 / 最近一次测验成绩」，
--     完成度 100 且测验 ≥ pass_score 才触发学分自动认定；
--   - credit_awarded=true 即代表继教学分已自动入账，免人工补录、杜绝「听没听、
--     考没考、学分给没给」三不知。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重入。
-- 不碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- online_course：一门在线课程（录播 / 直播 / 回放）+ 内嵌测验 + 进度 + 学分
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.online_course (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code     text NOT NULL,                          -- 课程编码（如 OL-2026-001）
  course_title    text NOT NULL,                          -- 课程标题
  category        text NOT NULL DEFAULT 'general'         -- 分类：基础医学/临床医学/护理/医技/医院管理/医德医风
                  CHECK (category IN
                    ('basic_med','clinical','nursing','med_tech','hospital_admin','ethics','general')),

  -- 课程形态：录播 / 直播 / 回放
  course_mode     text NOT NULL DEFAULT 'recorded'
                  CHECK (course_mode IN ('recorded','live','replay')),

  teacher_id      text NOT NULL DEFAULT '',               -- 主讲人 / 带教老师工号
  teacher_name    text NOT NULL DEFAULT '',               -- 主讲人姓名（脱敏展示）
  target_role     text NOT NULL DEFAULT 'all'             -- 目标学员：doctor/nurse/tech/admin/all
                  CHECK (target_role IN
                    ('doctor','nurse','med_tech','admin','all')),

  -- 内容与资源
  description     text NOT NULL DEFAULT '',               -- 课程简介
  duration_sec    integer NOT NULL DEFAULT 0              -- 课程总时长（秒）
                  CHECK (duration_sec >= 0),
  video_url       text NOT NULL DEFAULT '',               -- 视频地址（演示占位，不落真实 PII）
  cover_url       text NOT NULL DEFAULT '',               -- 封面图

  -- 学分与考核
  credit          numeric(6,1) NOT NULL DEFAULT 0
                  CHECK (credit >= 0),                     -- 完成课程 + 通过考试后自动认定的学分
  pass_score      numeric(5,2) NOT NULL DEFAULT 60
                  CHECK (pass_score BETWEEN 0 AND 100),    -- 测验合格线（百分制）

  -- 内嵌题库（由 BFF generateQuizFromContent 自动派生，evaluateStudentAnswer 阅卷）
  -- 结构：[{ qid, type:'single'|'multiple'|'judge'|'case', stem, options[],
  --         answer, score, analysis }]
  quiz            jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 学习进度（按学员快照；演示库内置代表性记录）
  -- 结构：[{ student_id, progress_pct, watched_sec, last_score,
  --         credit_awarded, updated_at }]
  progress        jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 学分是否自动认定：true=完成课程(100%) 且 测验≥pass_score 即自动入账
  credit_auto_record boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (course_code)
);

-- 科教科按「分类 + 形态」拉在线学习目录看板
CREATE INDEX IF NOT EXISTS idx_online_course_cat_mode
  ON clinical.online_course (category, course_mode);

-- 按目标学员角色推荐课程
CREATE INDEX IF NOT EXISTS idx_online_course_role
  ON clinical.online_course (target_role);

-- 按主讲人汇总工作量
CREATE INDEX IF NOT EXISTS idx_online_course_teacher
  ON clinical.online_course (teacher_id);

-- 已自动认定学分的课程（学分台账审计）
CREATE INDEX IF NOT EXISTS idx_online_course_credit
  ON clinical.online_course (credit) WHERE credit > 0;

COMMENT ON TABLE clinical.online_course IS
  'M171-B 在线学习与考核：视频课程(录播+直播+回放)/在线测验(单选+多选+判断+案例)/学习进度跟踪(完成度+时长+成绩)/学分自动认定；在线学习要好用，不能只是视频列表';
COMMENT ON COLUMN clinical.online_course.category IS
  '课程分类：basic_med 基础医学 / clinical 临床医学 / nursing 护理 / med_tech 医技 / hospital_admin 医院管理 / ethics 医德医风';
COMMENT ON COLUMN clinical.online_course.quiz IS
  '内嵌题库 jsonb：题型 single/multiple/judge/case，由 BFF generateQuizFromContent 派生，evaluateStudentAnswer 服务端阅卷';
COMMENT ON COLUMN clinical.online_course.progress IS
  '学员学习进度快照 jsonb：progress_pct 完成度 / watched_sec 时长 / last_score 成绩 / credit_awarded 是否自动入账';
COMMENT ON COLUMN clinical.online_course.credit_auto_record IS
  '完成课程(100%) 且 测验≥pass_score 时，是否自动登记继教学分';
