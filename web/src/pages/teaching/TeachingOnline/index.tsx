/**
 * 健澜科技 jlmedaios - M171-B 在线学习与考核平台页（科研教学后勤）
 *
 * 【在线学习要好用，不能只是视频列表】：
 *   - 视频课程（录播 / 直播 / 回放）分类导航 + 课程卡片（老师/时长/学分/平均分）；
 *   - 学员学习概览（在修 / 已完成 / 累计时长 / 已获学分 / 平均成绩）；
 *   - 在线测验演示提交（单选/多选/判断/案例分析，服务端自动阅卷）；
 *   - 按角色×层级的学习路径推荐（筑基 → 精进 → 专科 → 继教）。
 * 深海蓝 VI：深色底 + 深海蓝面板 + 青色强调，与 teaching/Deep 同色系。
 * 数据为演示模式，页面显式标注「演示数据」；不使用 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, post } from '@/api/client';

type CourseMode = 'recorded' | 'live' | 'replay';
type CourseCategory =
  | 'basic_med' | 'clinical' | 'nursing'
  | 'med_tech' | 'hospital_admin' | 'ethics';

interface OnlineCourse {
  courseId: string;
  courseCode: string;
  title: string;
  category: CourseCategory;
  categoryName: string;
  mode: CourseMode;
  modeName: string;
  teacherName: string;
  durationSec: number;
  credit: number;
  passScore: number;
  description: string;
  enrolled: number;
  avgScore: number;
}

interface CategoryMeta {
  key: CourseCategory;
  name: string;
  count: number;
}

interface PlatformResponse {
  categories: CategoryMeta[];
  courses: OnlineCourse[];
  activeCategory: CourseCategory | 'all';
  overview: {
    studentId: string;
    enrolledCourses: number;
    completedCourses: number;
    totalHours: number;
    creditEarned: number;
    avgQuizScore: number;
  };
  creditRule: string;
  demo: boolean;
}

interface Evaluation {
  qid: string;
  type: string;
  correct: boolean;
  scoreMax: number;
  scoreEarned: number;
  feedback: string;
  analysis: string;
}

interface QuizResult {
  courseId: string;
  courseTitle: string;
  studentId: string;
  evaluations: Evaluation[];
  scoreMax: number;
  scoreEarned: number;
  scorePct: number;
  passScore: number;
  passed: boolean;
  credit: number;
  creditAwarded: boolean;
}

/** 深海蓝主题色板 */
const C = {
  bg: '#06142e',
  panel: '#0d2550',
  panelBorder: '#1e3a8a',
  accent: '#38bdf8',
  accentDeep: '#1e40af',
  text: '#e2e8f0',
  dim: '#94a3b8',
  high: '#f87171',
  mid: '#fbbf24',
  low: '#34d399',
};

const MODE_COLOR: Record<CourseMode, string> = {
  recorded: '#a5b4fc',
  live: '#38bdf8',
  replay: '#c4b5fd',
};
const MODE_ICON: Record<CourseMode, string> = {
  recorded: '🎬',
  live: '🔴',
  replay: '⏪',
};

function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  return `${m} 分钟`;
}

function Section(props: { title: string; extra?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`,
        border: `1px solid ${C.panelBorder}`,
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 600, borderLeft: `4px solid ${C.accent}`, paddingLeft: 10 }}>
          {props.title}
        </div>
        {props.extra && <div style={{ color: C.dim, fontSize: 12 }}>{props.extra}</div>}
      </div>
      {props.children}
    </div>
  );
}

export default function TeachingOnlinePage() {
  const [platform, setPlatform] = useState<PlatformResponse | null>(null);
  const [category, setCategory] = useState<CourseCategory | ''>('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizCourseId, setQuizCourseId] = useState('oc-3');
  const [studentId, setStudentId] = useState('S-1024');

  const fetchPlatform = useCallback(async (cat: CourseCategory | '') => {
    try {
      const query: Record<string, string> = {};
      if (cat) query.category = cat;
      const res = await get<PlatformResponse>('/api/v1/teaching/courses', { query });
      setPlatform(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '在线学习平台获取失败');
    }
  }, []);

  useEffect(() => {
    void fetchPlatform(category || '');
  }, [category, fetchPlatform]);

  const submitQuiz = useCallback(async () => {
    setSubmitting(true);
    try {
      // 演示作答：单选选首项、多选选首+第四项、判断选正确、案例给出要点关键词。
      // 真实环境由学员在前端答题界面逐题作答。
      const submissions = [
        { qid: 'q-single-1', answer: 0 },
        { qid: 'q-multiple-1', answer: [0, 3] },
        { qid: 'q-judge-1', answer: true },
        { qid: 'q-case-1', answer: '按课程规范尽快完成心电图检查，并查肌钙蛋白评估再灌注时机' },
      ];
      const res = await post<QuizResult>('/api/v1/teaching/quiz/submit', {
        courseId: quizCourseId,
        studentId,
        submissions,
      });
      setResult(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '测验提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [quizCourseId, studentId]);

  const pickCategory = (k: CourseCategory | '') => {
    setCategory(k);
  };

  const courseOptions = useMemo(
    () => platform?.courses ?? [],
    [platform],
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(1200px 600px at 50% -10%, #12336f 0%, ${C.bg} 60%)`,
        color: C.text,
        padding: 20,
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* 顶部标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '0 8px' }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>📚 在线学习与考核平台</div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            视频课程（录播 / 直播 / 回放）· 在线测验（单选 / 多选 / 判断 / 案例）· 学习进度跟踪 · 学分自动认定
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.dim, fontSize: 12 }}>在线学习要好用，不能只是视频列表</div>
          <div style={{ display: 'inline-block', marginTop: 4, padding: '2px 10px', borderRadius: 999, background: 'rgba(56,189,248,0.15)', color: C.accent, fontSize: 12 }}>
            演示数据
          </div>
        </div>
      </div>

      {error && <div style={{ color: C.high, marginBottom: 12, fontSize: 14 }}>⚠ {error}</div>}

      {/* 学员学习概览 KPI */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: '在修课程', v: platform?.overview.enrolledCourses ?? '--', tone: C.accent },
          { label: '已完成课程', v: platform?.overview.completedCourses ?? '--', tone: C.low },
          { label: '累计学习时长(h)', v: platform?.overview.totalHours ?? '--', tone: '#a5b4fc' },
          { label: '已获学分', v: platform?.overview.creditEarned ?? '--', tone: C.mid },
          { label: '平均测验成绩', v: platform?.overview.avgQuizScore ?? '--', tone: '#f0abfc' },
        ].map((it) => (
          <div key={it.label} style={{ background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`, border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: '14px 22px', flex: 1, minWidth: 150 }}>
            <div style={{ color: C.dim, fontSize: 13 }}>{it.label}</div>
            <div style={{ color: it.tone, fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>{it.v}</div>
          </div>
        ))}
      </div>

      {/* 分类导航 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => pickCategory('')}
          style={{
            padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
            background: category === '' ? C.accentDeep : 'rgba(30,58,138,0.3)',
            color: category === '' ? '#fff' : C.dim, border: `1px solid ${C.panelBorder}`,
          }}
        >
          全部（{platform?.categories.reduce((s, c) => s + c.count, 0) ?? 0}）
        </button>
        {platform?.categories.map((c) => (
          <button
            key={c.key}
            onClick={() => pickCategory(c.key)}
            style={{
              padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
              background: category === c.key ? C.accentDeep : 'rgba(30,58,138,0.3)',
              color: category === c.key ? '#fff' : C.dim, border: `1px solid ${C.panelBorder}`,
            }}
          >
            {c.name}（{c.count}）
          </button>
        ))}
      </div>

      {/* 课程卡片网格 */}
      <Section title={`课程目录（${platform?.courses.length ?? 0} 门）`} extra={platform?.creditRule}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {platform?.courses.map((course) => (
            <div
              key={course.courseId}
              style={{
                background: 'rgba(6,20,46,0.6)',
                border: `1px solid ${C.panelBorder}`,
                borderRadius: 10,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{MODE_ICON[course.mode]}</span>
                <span style={{
                  background: MODE_COLOR[course.mode], color: '#06142e',
                  fontSize: 11, padding: '1px 8px', borderRadius: 999, fontWeight: 700,
                }}>
                  {course.modeName}
                </span>
                <span style={{ color: C.dim, fontSize: 11, marginLeft: 'auto' }}>{course.categoryName}</span>
              </div>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{course.title}</div>
              <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.5 }}>{course.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: 12, marginTop: 'auto' }}>
                <span>👤 {course.teacherName}</span>
                <span>⏱ {fmtDuration(course.durationSec)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: C.dim, fontSize: 12 }}>
                <span>👥 {course.enrolled} 人在学</span>
                <span>
                  ⭐ {course.avgScore} 分 · <span style={{ color: C.mid }}>{course.credit} 学分</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 在线测验演示 */}
      <div style={{ marginTop: 16 }}>
        <Section title="在线测验（服务端自动阅卷）" extra="单选/多选/判断/案例分析 · 通过即自动认定学分">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ color: C.dim, fontSize: 13 }}>
              课程：
              <select
                value={quizCourseId}
                onChange={(e) => setQuizCourseId(e.target.value)}
                style={{ background: '#06142e', color: C.text, border: `1px solid ${C.panelBorder}`, borderRadius: 6, padding: '4px 8px', marginLeft: 6 }}
              >
                {courseOptions.map((c) => (
                  <option key={c.courseId} value={c.courseId}>{c.title}</option>
                ))}
              </select>
            </label>
            <label style={{ color: C.dim, fontSize: 13 }}>
              学员：
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                style={{ background: '#06142e', color: C.text, border: `1px solid ${C.panelBorder}`, borderRadius: 6, padding: '4px 8px', marginLeft: 6, width: 100 }}
              />
            </label>
            <button
              onClick={submitQuiz}
              disabled={submitting}
              style={{
                background: C.accentDeep, color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 18px', cursor: 'pointer', fontSize: 13,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? '阅卷中…' : '提交测验（演示作答）'}
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 14, background: 'rgba(6,20,46,0.6)', border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ color: C.dim, fontSize: 13 }}>
                  课程：<span style={{ color: C.text }}>{result.courseTitle}</span>
                </span>
                <span style={{ color: C.dim, fontSize: 13 }}>
                  得分：<span style={{ color: result.passed ? C.low : C.high, fontSize: 18, fontWeight: 700 }}>{result.scorePct}</span> / 100
                </span>
                <span style={{ color: C.dim, fontSize: 13 }}>
                  结果：
                  <span style={{ color: result.passed ? C.low : C.high, fontWeight: 700 }}>
                    {result.passed ? '通过' : '未通过'}
                  </span>
                </span>
                <span style={{ color: C.dim, fontSize: 13 }}>
                  学分：
                  <span style={{ color: result.creditAwarded ? C.mid : C.dim, fontWeight: 700 }}>
                    {result.creditAwarded ? `已自动认定 ${result.credit} 学分` : '未认定'}
                  </span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.evaluations.map((e) => (
                  <div key={e.qid} style={{ borderTop: '1px solid rgba(30,58,138,0.4)', paddingTop: 8, fontSize: 13 }}>
                    <div style={{ color: C.dim }}>
                      [{e.type}] {e.feedback}
                    </div>
                    <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>📖 {e.analysis}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      <div style={{ marginTop: 16, color: C.dim, fontSize: 12, textAlign: 'center' }}>
        杭州健澜科技有限公司 · 科研教学后勤 · 在线学习要好用，不能只是视频列表
      </div>
    </div>
  );
}
