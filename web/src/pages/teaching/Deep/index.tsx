/**
 * 健澜科技 jlmedaios - 教学与培训深化管理页（M162-B）
 *
 * 【医院全场景】在线课程（录播 + 直播）/ OSCE 客观结构化技能考核 /
 *   规培轮转 + 出科考核 / 继教学分自动记录。
 * 「教学考核要公平，不能走过场」：OSCE 五考站加权、单站 <60 不通过，
 *   页面显式展示公平性提示（疑似走过场 / 贴线抽查 / 短板考站）。
 * 深海蓝 VI：深色底 + 深海蓝面板 + 青色强调，与 brain/Deep 同色系。
 * 数据为演示模式，页面显式标注「演示数据」；不使用 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { get, post } from '@/api/client';

/** 与 BFF teachingDeepAggregator 对齐的类型 */
type CourseType = 'recorded' | 'live' | 'osce' | 'rotation' | 'exit_exam';

interface CourseItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  dept: string;
  courseType: CourseType;
  teacherId: string;
  targetGroup: string;
  credit: number;
  capacity: number;
  schedule: string;
}
interface RotationTrack {
  rotationId: string;
  months: string;
  mentor: string;
  exitExamRequired: boolean;
}
interface PlanResponse {
  dept: string;
  deptName: string;
  year: number;
  courses: CourseItem[];
  rotationTracks: RotationTrack[];
  creditSummary: { total: number; byType: Record<CourseType, number> };
  fairnessNote: string;
  demo: boolean;
  notice: string;
}
interface OsceStation {
  station: string;
  score: number;
  weight: number;
  passed: boolean;
}
interface ExamResult {
  studentId: string;
  courseId: string;
  courseName: string;
  stations: OsceStation[];
  weightedTotal: number;
  stationMin: number;
  overallPassed: boolean;
  creditEarned: number;
  creditAutoRecorded: boolean;
  fairnessFlags: string[];
  demo: boolean;
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

const TYPE_LABEL: Record<CourseType, string> = {
  recorded: '录播',
  live: '直播',
  osce: 'OSCE',
  rotation: '规培轮转',
  exit_exam: '出科考核',
};
const TYPE_COLOR: Record<CourseType, string> = {
  recorded: '#a5b4fc',
  live: '#38bdf8',
  osce: '#fbbf24',
  rotation: '#34d399',
  exit_exam: '#f87171',
};

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

export default function TeachingDeepPage() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [exam, setExam] = useState<ExamResult | null>(null);
  const [studentId, setStudentId] = useState('S-1024');
  const [courseId, setCourseId] = useState('OSCE-internal-2026-MID');
  const [error, setError] = useState('');
  const [loadingExam, setLoadingExam] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await get<PlanResponse>('/api/v1/teaching/courses?dept=internal');
      setPlan(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '教学计划获取失败');
    }
  }, []);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const runExam = useCallback(async () => {
    setLoadingExam(true);
    try {
      const res = await post<ExamResult>('/api/v1/teaching/exam', { studentId, courseId });
      setExam(res);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '考核评估失败');
    } finally {
      setLoadingExam(false);
    }
  }, [studentId, courseId]);

  const typeCount = (t: CourseType) => plan?.courses.filter((c) => c.courseType === t).length ?? 0;

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
          <div style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>🎓 教学与培训深化管理</div>
          <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>
            {plan?.deptName ?? '内科'} · {plan?.year ?? new Date().getFullYear()} 年度 · 录播/直播 · OSCE 客观结构化考核 · 规培轮转出科 · 继教学分
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.dim, fontSize: 12 }}>考核公平 · 不走过场</div>
          <div style={{ display: 'inline-block', marginTop: 4, padding: '2px 10px', borderRadius: 999, background: 'rgba(251,191,36,0.15)', color: C.mid, fontSize: 12 }}>
            演示数据
          </div>
        </div>
      </div>

      {error && <div style={{ color: C.high, marginBottom: 12, fontSize: 14 }}>⚠ {error}</div>}

      {/* KPI 角标 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: '在线课程（录播+直播）', v: typeCount('recorded') + typeCount('live'), tone: C.accent },
          { label: 'OSCE 考核场次', v: typeCount('osce'), tone: C.mid },
          { label: '规培轮转段数', v: plan?.rotationTracks?.length ?? '--', tone: C.low },
          { label: '年度计划学分', v: plan?.creditSummary?.total ?? '--', tone: '#a5b4fc' },
        ].map((it) => (
          <div key={it.label} style={{ background: `linear-gradient(160deg, ${C.panel} 0%, #0a1d42 100%)`, border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: '14px 22px', flex: 1, minWidth: 160 }}>
            <div style={{ color: C.dim, fontSize: 13 }}>{it.label}</div>
            <div style={{ color: it.tone, fontSize: 34, fontWeight: 700, lineHeight: 1.15 }}>{it.v}</div>
          </div>
        ))}
      </div>

      {/* 教学计划课程表 */}
      <div style={{ marginBottom: 14 }}>
        <Section title={`年度教学计划（${plan?.courses?.length ?? 0} 门）`} extra={plan?.fairnessNote}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.dim, textAlign: 'left' }}>
                  {['编码', '课程 / 考核', '形态', '对象', '学分', '容量', '排期'].map((h) => (
                    <th key={h} style={{ padding: '6px 10px', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(plan?.courses ?? []).map((c) => (
                  <tr key={c.courseId} style={{ borderTop: '1px solid rgba(30,58,138,0.4)' }}>
                    <td style={{ padding: '8px 10px', color: C.dim }}>{c.courseCode}</td>
                    <td style={{ padding: '8px 10px', color: C.text }}>{c.courseName}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: '#06142e', background: TYPE_COLOR[c.courseType], fontSize: 11, padding: '1px 8px', borderRadius: 999, fontWeight: 700 }}>
                        {TYPE_LABEL[c.courseType]}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: C.dim }}>{c.targetGroup}</td>
                    <td style={{ padding: '8px 10px', color: C.accent, fontWeight: 600 }}>{c.credit}</td>
                    <td style={{ padding: '8px 10px', color: C.text }}>{c.capacity}</td>
                    <td style={{ padding: '8px 10px', color: C.dim }}>{c.schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* OSCE 考核录入 */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 360px' }}>
          <Section title="OSCE 客观结构化考核（公平打分）" extra="五考站加权 · 单站<60 不通过">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="学生脱敏号 S-xxxx"
                style={inputStyle}
              />
              <input
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="考核ID，如 OSCE-internal-2026-MID"
                style={{ ...inputStyle, flex: 2 }}
              />
              <button onClick={() => void runExam()} disabled={loadingExam} style={btnStyle}>
                {loadingExam ? '评分中…' : '开始考核评分'}
              </button>
            </div>
            {exam && (
              <div style={{ border: `1px solid ${exam.overallPassed ? C.low : C.high}`, borderRadius: 10, padding: 14, background: 'rgba(6,20,46,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: exam.overallPassed ? C.low : C.high }}>
                    {exam.weightedTotal} 分
                  </span>
                  <span style={{ color: '#06142e', background: exam.overallPassed ? C.low : C.high, fontSize: 12, padding: '2px 10px', borderRadius: 999, fontWeight: 700 }}>
                    {exam.overallPassed ? '通过 · 学分已自动记录' : '不通过'}
                  </span>
                  <span style={{ color: C.dim, fontSize: 12 }}>{exam.courseName} · {exam.studentId}</span>
                </div>
                {(exam.stations ?? []).map((s) => (
                  <div key={s.station} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.dim, marginBottom: 3 }}>
                      <span>{s.station}（权重 {Math.round(s.weight * 100)}%）</span>
                      <span style={{ color: s.passed ? C.text : C.high }}>{s.score} 分 {s.passed ? '✓' : '✗'}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.2)', overflow: 'hidden' }}>
                      <div style={{ width: `${s.score}%`, height: '100%', background: s.passed ? `linear-gradient(90deg, ${C.accentDeep}, ${C.accent})` : C.high }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  {(exam.fairnessFlags ?? []).map((f, i) => (
                    <div key={i} style={{ color: f.includes('疑似') || f.includes('不予') || f.includes('贴线') ? C.mid : C.low, marginTop: 3 }}>
                      · {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <Section title="规培轮转计划" extra={`${plan?.rotationTracks?.length ?? 0} 段 · 每段出科考核必过`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(plan?.rotationTracks ?? []).map((r, i) => (
                <div key={r.rotationId} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.panelBorder}`, borderRadius: 10, padding: '10px 14px', background: 'rgba(6,20,46,0.5)' }}>
                  <span style={{ color: C.accent, fontWeight: 700, width: 28 }}>Q{i + 1}</span>
                  <span style={{ color: C.text, flex: 1 }}>{r.months} · 带教 {r.mentor}</span>
                  <span style={{ color: C.low, fontSize: 12 }}>出科考核{r.exitExamRequired ? '·必过' : ''}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: 16, color: C.dim, fontSize: 12, textAlign: 'center' }}>
        {plan?.notice ?? '演示数据'} · 继教学分考核合格自动入账 · Copyright © 2026 杭州健澜科技有限公司
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 140,
  background: 'rgba(6,20,46,0.6)',
  border: '1px solid #1e3a8a',
  borderRadius: 8,
  color: '#e2e8f0',
  padding: '8px 12px',
  fontSize: 13,
};
const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #1e40af, #38bdf8)',
  border: 'none',
  borderRadius: 8,
  color: '#06142e',
  fontWeight: 700,
  padding: '8px 18px',
  cursor: 'pointer',
  fontSize: 13,
};
