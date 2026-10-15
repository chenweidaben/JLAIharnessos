/**
 * 健澜科技 jlmedaios - 患者健康提醒页（M122-C）
 *
 * 依据《中华人民共和国宪法》第四十五条发展医疗卫生事业、保护人民
 * 健康的要求，为患者本人聚合展示用药、就诊、检查准备与慢病随访提醒。
 * 界面遵循患者端大字易读、三态（loading/error/empty）原则。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';

interface HealthReminder {
  id: string;
  level: 'normal' | 'warning' | 'urgent';
  title: string;
  body: string;
  dueAt: string;
  relatedId?: string;
}

interface RemindersData {
  medicationReminders: HealthReminder[];
  appointmentReminders: HealthReminder[];
  prepReminders: HealthReminder[];
  chronicCareReminders: HealthReminder[];
}

const SECTIONS: { key: keyof RemindersData; label: string }[] = [
  { key: 'medicationReminders', label: '用药提醒' },
  { key: 'appointmentReminders', label: '就诊提醒' },
  { key: 'prepReminders', label: '检查准备' },
  { key: 'chronicCareReminders', label: '慢病照护' },
];

const LEVEL_STYLE: Record<HealthReminder['level'], { color: string; bg: string }> = {
  urgent: { color: '#c62828', bg: '#fdecea' },
  warning: { color: '#e65100', bg: '#fff4e5' },
  normal: { color: '#0b4f8a', bg: '#eaf3fb' },
};

function ReminderCard({ r }: { r: HealthReminder }) {
  const s = LEVEL_STYLE[r.level];
  return (
    <div
      style={{
        background: s.bg,
        borderLeft: `6px solid ${s.color}`,
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{r.title}</div>
      <div style={{ fontSize: 18, color: '#222', marginTop: 8, lineHeight: 1.6 }}>{r.body}</div>
      <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
        {new Date(r.dueAt).toLocaleString('zh-CN', { hour12: false })}
      </div>
    </div>
  );
}

export default function PatientRemindersPage() {
  const [data, setData] = useState<RemindersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/patient/reminders');
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '加载失败');
      setData(json.data as RemindersData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 32, fontSize: 20, color: '#555' }}>加载中，请稍候…</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: '#c62828' }}>{error}</div>
        <button
          onClick={load}
          style={{ marginTop: 16, fontSize: 18, padding: '10px 28px', borderRadius: 8 }}
        >
          重新加载
        </button>
      </div>
    );
  }

  const total = data
    ? SECTIONS.reduce((n, s) => n + data[s.key].length, 0)
    : 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 26, marginBottom: 4 }}>我的健康提醒</h2>
      <div style={{ fontSize: 15, color: '#888', marginBottom: 20 }}>
        共 {total} 条 · 依据宪法第四十五条主动为您推送
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <div style={{ fontSize: 22 }}>今日暂无健康提醒</div>
          <div style={{ fontSize: 16, marginTop: 8 }}>请按时作息、规律用药，祝您健康</div>
        </div>
      ) : (
        SECTIONS.map((sec) => {
          const list = data?.[sec.key] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={sec.key} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, color: '#333', margin: '0 0 10px' }}>{sec.label}</h3>
              {list.map((r) => (
                <ReminderCard key={r.id} r={r} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
