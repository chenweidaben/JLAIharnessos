/**
 * 健澜科技 jlmedaios - 智能随访日历视图（M131-A）
 *
 * AI能力深化：按月展示患者术后/慢病/出院复诊随访计划，深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo, useState } from 'react';

// 深海蓝 VI 色板
const VI = {
  deep: '#0A2540',
  primary: '#1B4F72',
  accent: '#2E86C1',
  light: '#D6EAF8',
  bg: '#F4F8FB',
  border: '#AED6F1',
  postop: '#C0392B',
  chronic: '#27AE60',
  discharge: '#F39C12',
};

interface PlanItem {
  id: string;
  type: string;
  timepoint: string;
  dueAt: string;
  status: string;
  description: string;
  diagnosis: string;
}

const TYPE_COLOR: Record<string, string> = {
  postop: VI.postop,
  chronic: VI.chronic,
  discharge: VI.discharge,
};

function typeOf(t: string): 'postop' | 'chronic' | 'discharge' {
  if (t.startsWith('postop')) return 'postop';
  if (t.startsWith('chronic')) return 'chronic';
  return 'discharge';
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function FollowUpCalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState('');

  async function load(monthOffset = 0) {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + monthOffset);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const params = new URLSearchParams();
    if (diagnosis) params.set('diagnosis', diagnosis);
    params.set('dischargeDate', start.toISOString());
    const r = await fetch(`/api/v1/patient/follow-ups?${params.toString()}`);
    const j = await r.json();
    const list: PlanItem[] = (j?.data?.plans ?? []).filter((p: PlanItem) => {
      const t = new Date(p.dueAt);
      return t >= start && t <= end;
    });
    setPlans(list);
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const byDay = useMemo(() => {
    const m: Record<string, PlanItem[]> = {};
    for (const p of plans) {
      const k = dayKey(p.dueAt);
      (m[k] = m[k] || []).push(p);
    }
    return m;
  }, [plans]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: Array<{ date: number; key: string; inMonth: boolean }> = [];
    for (let i = 0; i < firstDay; i++) arr.push({ date: 0, key: `pad-${i}`, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({ date: d, key: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, inMonth: true });
    }
    return arr;
  }, [cursor]);

  const selectedPlans = selected ? byDay[selected] ?? [] : [];

  return (
    <div style={{ padding: 24, background: VI.bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: VI.deep, margin: 0 }}>智能随访日历</h2>
        <div>
          <input
            placeholder="输入诊断（如：胆囊切除术后）"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            style={{ padding: '6px 10px', border: `1px solid ${VI.border}`, borderRadius: 4, marginRight: 8 }}
          />
          <button onClick={() => load(0)} style={{ background: VI.primary, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer' }}>
            生成随访
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 日历主体 */}
        <div style={{ flex: 2, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(10,37,64,0.08)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={{ border: `1px solid ${VI.border}`, background: '#fff', color: VI.primary, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>‹ 上月</button>
            <strong style={{ color: VI.deep, fontSize: 16 }}>{cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月</strong>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={{ border: `1px solid ${VI.border}`, background: '#fff', color: VI.primary, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>下月 ›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
              <div key={w} style={{ textAlign: 'center', color: VI.primary, fontWeight: 600, fontSize: 12, padding: 4 }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((c) => (
              <div
                key={c.key}
                onClick={() => c.inMonth && setSelected(c.key)}
                style={{
                  minHeight: 64,
                  border: `1px solid ${c.key === selected ? VI.accent : VI.light}`,
                  borderRadius: 4,
                  padding: 4,
                  cursor: c.inMonth ? 'pointer' : 'default',
                  background: c.key === selected ? VI.light : '#fff',
                  opacity: c.inMonth ? 1 : 0.3,
                }}
              >
                <div style={{ fontSize: 12, color: VI.deep }}>{c.inMonth ? c.date : ''}</div>
                {(byDay[c.key] ?? []).map((p) => (
                  <div key={p.id} style={{ fontSize: 10, color: '#fff', background: TYPE_COLOR[typeOf(p.type)], borderRadius: 2, padding: '1px 4px', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.timepoint}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧详情 */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(10,37,64,0.08)', padding: 16 }}>
          <h3 style={{ color: VI.deep, marginTop: 0 }}>{selected ? `${selected} 随访安排` : '选择日期查看详情'}</h3>
          {selectedPlans.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>当日暂无随访计划</p>}
          {selectedPlans.map((p) => (
            <div key={p.id} style={{ borderLeft: `3px solid ${TYPE_COLOR[typeOf(p.type)]}`, paddingLeft: 10, marginBottom: 12 }}>
              <div style={{ color: VI.deep, fontWeight: 600, fontSize: 14 }}>{p.timepoint}</div>
              <div style={{ color: '#555', fontSize: 12, margin: '4px 0' }}>{p.description}</div>
              <div style={{ color: VI.accent, fontSize: 12 }}>状态：{p.status === 'pending' ? '待随访' : p.status}</div>
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 12, borderTop: `1px solid ${VI.light}` }}>
            <div style={{ fontSize: 12, color: VI.primary, fontWeight: 600, marginBottom: 6 }}>图例</div>
            {[['术后随访', VI.postop], ['慢病随访', VI.chronic], ['出院复诊', VI.discharge]].map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
