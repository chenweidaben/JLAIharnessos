/**
 * 健澜科技 jlmedaios - 患者移动端 H5 首页（M128-C）
 *
 * 面向中老年患者本人的大字大按钮 H5：今日提醒（用药/复诊/检查）、
 * 最近报告、智能导诊、满意度评价。依据《中华人民共和国宪法》第四十五条
 * 发展医疗卫生事业、保护人民健康的要求，以易读、易点的方式帮助患者
 * 自助管理健康，不替代医师诊疗判断。
 *
 * 移动端 + 性能优化：
 * - 最小字号 16px、最小按钮高 48px，适配中老年与触控；
 * - 三态 loading / error / empty，避免白屏；
 * - 内联样式零额外依赖，单接口一次拉取，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* 与 BFF 聚合结果对齐的类型                                            */
/* ------------------------------------------------------------------ */

interface MobileReminder {
  id: string;
  type: 'medication' | 'appointment' | 'exam';
  level: 'urgent' | 'warning' | 'normal';
  title: string;
  body: string;
  dueAt: string;
}

interface MobileReport {
  id: string;
  name: string;
  reportDate: string;
  status: 'available' | 'pending';
  summary?: string | null;
}

interface PatientMobileHomeData {
  patientId: string;
  greeting: string;
  todayReminders: MobileReminder[];
  reminderCount: number;
  urgentCount: number;
  recentReports: MobileReport[];
  smartGuide: { available: boolean; quickSymptoms: string[] };
  satisfaction: { pending: boolean; lastScore?: number | null };
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 中老年适配色板（对比度优先）                                        */
/* ------------------------------------------------------------------ */

const LEVEL_STYLE: Record<MobileReminder['level'], { color: string; bg: string }> = {
  urgent: { color: '#b71c1c', bg: '#fdecea' },
  warning: { color: '#bf360c', bg: '#fff3e0' },
  normal: { color: '#0b4f8a', bg: '#e8f1fa' },
};

const TYPE_LABEL: Record<MobileReminder['type'], string> = {
  medication: '用药',
  appointment: '复诊',
  exam: '检查',
};

/** 大按钮基础样式：最小高 48px、字号 ≥18px */
const BIG_BUTTON: React.CSSProperties = {
  minHeight: 48,
  fontSize: 18,
  fontWeight: 600,
  borderRadius: 12,
  border: 'none',
  padding: '12px 16px',
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

function ReminderCard({ r }: { r: MobileReminder }) {
  const s = LEVEL_STYLE[r.level];
  return (
    <div
      style={{
        background: s.bg,
        borderLeft: '8px solid ' + s.color,
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{r.title}</span>
        <span
          style={{
            fontSize: 16,
            color: '#fff',
            background: s.color,
            borderRadius: 8,
            padding: '2px 10px',
          }}
        >
          {TYPE_LABEL[r.type]}
        </span>
      </div>
      <div style={{ fontSize: 18, color: '#222', marginTop: 10, lineHeight: 1.7 }}>{r.body}</div>
      <div style={{ fontSize: 16, color: '#777', marginTop: 8 }}>{formatDue(r.dueAt)}</div>
    </div>
  );
}

export default function PatientMobileHomePage() {
  const [data, setData] = useState<PatientMobileHomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/patient/mobile/home');
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '加载失败');
      setData(json.data as PatientMobileHomeData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 移动端 + 性能优化：仅挂载时拉取一次，后续由下拉/按钮手动刷新
  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 40, fontSize: 20, color: '#555', textAlign: 'center' }}>
        加载中，请稍候…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: '#b71c1c' }}>{error}</div>
        <button onClick={load} style={{ ...BIG_BUTTON, marginTop: 20, background: '#0b4f8a', color: '#fff' }}>
          重新加载
        </button>
      </div>
    );
  }

  const d = data;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 40px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* 顶部问候 */}
      <header style={{ padding: '8px 4px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a' }}>
          {d?.greeting ?? '您好'}
        </div>
        <div style={{ fontSize: 16, color: '#888', marginTop: 6 }}>
          {d && d.urgentCount > 0 ? `您有 ${d.urgentCount} 条紧急提醒，请优先处理` : '祝您身体健康'}
        </div>
      </header>

      {/* 今日提醒 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#222', margin: '0 0 12px' }}>今日提醒</h2>
        {!d || d.todayReminders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 16px', fontSize: 18, color: '#999', textAlign: 'center' }}>
            今日暂无提醒
          </div>
        ) : (
          d.todayReminders.map((r) => <ReminderCard key={r.id} r={r} />)
        )}
      </section>

      {/* 最近报告 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#222', margin: '0 0 12px' }}>最近报告</h2>
        {!d || d.recentReports.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 16px', fontSize: 18, color: '#999', textAlign: 'center' }}>
            暂无已出报告
          </div>
        ) : (
          d.recentReports.map((r) => (
            <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 600, color: '#222' }}>{r.name}</span>
                <span style={{ fontSize: 16, color: r.status === 'available' ? '#2e7d32' : '#b8860b' }}>
                  {r.status === 'available' ? '已出' : '出报告中'}
                </span>
              </div>
              {r.summary ? <div style={{ fontSize: 16, color: '#555', marginTop: 6 }}>{r.summary}</div> : null}
              <div style={{ fontSize: 16, color: '#999', marginTop: 6 }}>{formatDue(r.reportDate)}</div>
            </div>
          ))
        )}
      </section>

      {/* 智能导诊 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#222', margin: '0 0 12px' }}>智能导诊</h2>
        {d?.smartGuide.available ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {d.smartGuide.quickSymptoms.map((s) => (
              <button
                key={s}
                style={{ ...BIG_BUTTON, background: '#e8f1fa', color: '#0b4f8a', border: '2px solid #b9d4ec' }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 18, color: '#999' }}>智能导诊暂未开放</div>
        )}
      </section>

      {/* 满意度评价 */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, color: '#222', margin: '0 0 12px' }}>满意度评价</h2>
        <button style={{ ...BIG_BUTTON, width: '100%', background: d?.satisfaction.pending ? '#0b4f8a' : '#eceff1', color: d?.satisfaction.pending ? '#fff' : '#666' }}>
          {d?.satisfaction.pending
            ? '去评价'
            : d?.satisfaction.lastScore != null
              ? `已评价（${d.satisfaction.lastScore} 分）`
              : '暂无待评价'}
        </button>
      </section>

      <footer style={{ textAlign: 'center', fontSize: 16, color: '#bbb', marginTop: 32 }}>
        杭州健澜科技有限公司 · 本页面不替代医师诊疗判断
      </footer>
    </div>
  );
}
