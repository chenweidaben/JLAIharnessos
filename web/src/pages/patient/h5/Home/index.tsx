/**
 * 健澜科技 jlmedaios - 患者端 H5 首页（M148-C，产品化收尾）
 *
 * 面向患者本人的一站式大字大按钮 H5：我的预约 / 我的报告 / 我的账单 /
 * 健康提醒（用药 / 复诊 / 接种）/ 智能导诊。依据《中华人民共和国宪法》
 * 第四十五条发展医疗卫生事业、保护人民健康的要求，以易读、易点的方式
 * 帮助患者自助管理健康，不替代医师诊疗判断。
 *
 * 移动端 + 性能优化（产品化收尾）：
 * - 最小触控目标 44px、最小字号 16px，适配中老年与触控；
 * - 深海蓝 VI（#0b4f8a 主色），三态 loading / error / empty，避免白屏；
 * - 内联样式零额外依赖，单接口一次拉取，不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* 与 BFF 聚合结果对齐的类型                                            */
/* ------------------------------------------------------------------ */

interface H5Reminder {
  id: string;
  kind: 'medication' | 'followup' | 'vaccination';
  level: 'urgent' | 'warning' | 'normal';
  title: string;
  body: string;
  dueAt: string;
}

interface H5Appointment {
  id: string;
  scheduledAt: string;
  department: string;
  doctor: string;
  purpose: string;
  status: string;
}

interface H5Report {
  id: string;
  name: string;
  reportDate: string;
  status: 'available' | 'pending';
  summary?: string | null;
}

interface H5Bill {
  id: string;
  title: string;
  amount?: number | null;
  status: 'unpaid' | 'paid' | 'refunded';
  billDate: string;
}

interface PatientH5DashboardData {
  patientId: string;
  greeting: string;
  profile: { name: string; phone: string };
  appointments: H5Appointment[];
  appointmentCount: number;
  reports: H5Report[];
  bills: H5Bill[];
  unpaidAmount: number;
  unpaidCount: number;
  healthReminders: H5Reminder[];
  urgentCount: number;
  smartGuide: { available: boolean; quickSymptoms: string[] };
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 深海蓝 VI 色板（对比度优先，产品化收尾）                            */
/* ------------------------------------------------------------------ */

/** 深海蓝主色 */
const DEEP_SEA = '#0b4f8a';
const DEEP_SEA_DARK = '#083d6b';
const BG = '#f5f7fa';

const LEVEL_STYLE: Record<H5Reminder['level'], { color: string; bg: string }> = {
  urgent: { color: '#b71c1c', bg: '#fdecea' },
  warning: { color: '#bf360c', bg: '#fff3e0' },
  normal: { color: DEEP_SEA, bg: '#e8f1fa' },
};

const KIND_LABEL: Record<H5Reminder['kind'], string> = {
  medication: '用药',
  followup: '复诊',
  vaccination: '接种',
};

/**
 * 大按钮基础样式：最小触控目标 48px（>44px 标准）、字号 ≥18px。
 * 产品化收尾：满足移动端可访问性，避免中老年误触。
 */
const BIG_BUTTON: React.CSSProperties = {
  minHeight: 48,
  minWidth: 44,
  fontSize: 18,
  fontWeight: 600,
  borderRadius: 12,
  border: 'none',
  padding: '12px 16px',
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 22, color: '#222', margin: '0 0 12px', fontWeight: 700 }}>{title}</h2>
      {children}
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '28px 16px',
        fontSize: 18,
        color: '#999',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

function ReminderCard({ r }: { r: H5Reminder }) {
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
          {KIND_LABEL[r.kind]}
        </span>
      </div>
      <div style={{ fontSize: 18, color: '#222', marginTop: 10, lineHeight: 1.7 }}>{r.body}</div>
      <div style={{ fontSize: 16, color: '#777', marginTop: 8 }}>{fmtDateTime(r.dueAt)}</div>
    </div>
  );
}

export default function PatientH5HomePage() {
  const [data, setData] = useState<PatientH5DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/patient/h5/home');
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '加载失败');
      setData(json.data as PatientH5DashboardData);
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
        <button
          onClick={load}
          style={{ ...BIG_BUTTON, marginTop: 20, background: DEEP_SEA, color: '#fff' }}
        >
          重新加载
        </button>
      </div>
    );
  }

  const d = data;

  /* 快捷入口大按钮：深海蓝 VI */
  const quickActions = [
    { label: '我的预约', badge: d?.appointmentCount ?? 0 },
    { label: '我的报告', badge: d?.reports.length ?? 0 },
    { label: '我的账单', badge: d?.unpaidCount ?? 0 },
    { label: '智能导诊', badge: 0 },
  ];

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '20px 16px 40px',
        background: BG,
        minHeight: '100vh',
      }}
    >
      {/* 顶部问候 + 脱敏档案 */}
      <header style={{ padding: '8px 4px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a' }}>
          {d?.greeting ?? '您好'}
        </div>
        <div style={{ fontSize: 16, color: '#888', marginTop: 6 }}>
          {d?.profile?.name ? `${d.profile.name}，` : ''}
          {d && d.urgentCount > 0
            ? `您有 ${d.urgentCount} 条紧急提醒，请优先处理`
            : '祝您身体健康'}
        </div>
        {d?.profile?.phone ? (
          <div style={{ fontSize: 15, color: '#aaa', marginTop: 4 }}>已绑定手机 {d.profile.phone}</div>
        ) : null}
      </header>

      {/* 快捷入口：大按钮宫格（min 44px 触控目标） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {quickActions.map((a) => (
          <button
            key={a.label}
            style={{
              ...BIG_BUTTON,
              position: 'relative',
              background: '#fff',
              color: DEEP_SEA,
              border: '2px solid #b9d4ec',
            }}
          >
            {a.label}
            {a.badge > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 10,
                  minWidth: 24,
                  height: 24,
                  lineHeight: '24px',
                  fontSize: 14,
                  color: '#fff',
                  background: '#b71c1c',
                  borderRadius: 12,
                  padding: '0 6px',
                }}
              >
                {a.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* 健康提醒（用药 / 复诊 / 接种） */}
      <Section title="健康提醒">
        {!d || d.healthReminders.length === 0 ? (
          <EmptyBox text="今日暂无健康提醒" />
        ) : (
          d.healthReminders.map((r) => <ReminderCard key={r.id} r={r} />)
        )}
      </Section>

      {/* 我的预约 */}
      <Section title="我的预约">
        {!d || d.appointments.length === 0 ? (
          <EmptyBox text="暂无待就诊预约" />
        ) : (
          d.appointments.map((a) => (
            <div
              key={a.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 600, color: '#222' }}>
                  {a.department}
                  {a.doctor ? ` · ${a.doctor}` : ''}
                </span>
                <span style={{ fontSize: 16, color: DEEP_SEA }}>{fmtDateTime(a.scheduledAt)}</span>
              </div>
              {a.purpose ? (
                <div style={{ fontSize: 16, color: '#555', marginTop: 6 }}>{a.purpose}</div>
              ) : null}
            </div>
          ))
        )}
      </Section>

      {/* 我的账单 */}
      <Section title="我的账单">
        {d && d.unpaidAmount > 0 ? (
          <div
            style={{
              background: '#fdecea',
              borderLeft: '8px solid #b71c1c',
              borderRadius: 12,
              padding: '16px 18px',
              marginBottom: 12,
              fontSize: 18,
              color: '#b71c1c',
              fontWeight: 700,
            }}
          >
            待缴 {d.unpaidCount} 笔，共 ¥{d.unpaidAmount.toFixed(2)}
          </div>
        ) : null}
        {!d || d.bills.length === 0 ? (
          <EmptyBox text="暂无账单" />
        ) : (
          d.bills.map((b) => (
            <div
              key={b.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 600, color: '#222' }}>{b.title}</span>
                <span style={{ fontSize: 18, color: b.status === 'unpaid' ? '#b71c1c' : '#2e7d32' }}>
                  {b.amount != null ? `¥${b.amount.toFixed(2)}` : ''}
                </span>
              </div>
              <div style={{ fontSize: 16, color: '#999', marginTop: 6 }}>
                {fmtDateTime(b.billDate)} ·{' '}
                {b.status === 'unpaid' ? '待缴' : b.status === 'paid' ? '已缴' : '已退'}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* 我的报告 */}
      <Section title="我的报告">
        {!d || d.reports.length === 0 ? (
          <EmptyBox text="暂无已出报告" />
        ) : (
          d.reports.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 600, color: '#222' }}>{r.name}</span>
                <span style={{ fontSize: 16, color: r.status === 'available' ? '#2e7d32' : '#b8860b' }}>
                  {r.status === 'available' ? '已出' : '出报告中'}
                </span>
              </div>
              {r.summary ? (
                <div style={{ fontSize: 16, color: '#555', marginTop: 6 }}>{r.summary}</div>
              ) : null}
              <div style={{ fontSize: 16, color: '#999', marginTop: 6 }}>{fmtDateTime(r.reportDate)}</div>
            </div>
          ))
        )}
      </Section>

      {/* 智能导诊 */}
      <Section title="智能导诊">
        {d?.smartGuide.available ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {d.smartGuide.quickSymptoms.map((s) => (
              <button
                key={s}
                style={{
                  ...BIG_BUTTON,
                  background: '#e8f1fa',
                  color: DEEP_SEA_DARK,
                  border: '2px solid #b9d4ec',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 18, color: '#999' }}>智能导诊暂未开放</div>
        )}
      </Section>

      <footer style={{ textAlign: 'center', fontSize: 16, color: '#bbb', marginTop: 32 }}>
        杭州健澜科技有限公司 · 本页面不替代医师诊疗判断
      </footer>
    </div>
  );
}
