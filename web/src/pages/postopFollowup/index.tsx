import { useState } from 'react';

export default function PostopFollowupPage() {
  const [visitId, setVisitId] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [tp, setTp] = useState('6h');
  const [score, setScore] = useState(3);

  async function schedule() {
    await fetch('/api/v1/postop-followups/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, surgeryEndAt: new Date().toISOString() }),
    });
    refresh();
  }
  async function complete() {
    await fetch('/api/v1/postop-followups/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, timepoint: tp, score }),
    });
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/postop-followups?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>术后镇痛随访 6/24/48h</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <button onClick={schedule}>生成随访计划</button>
      <div style={{ margin: 12 }}>
        时间点
        <select value={tp} onChange={e => setTp(e.target.value)}>
          <option value="6h">6h</option><option value="24h">24h</option><option value="48h">48h</option>
        </select>
        NRS <input type="number" min={0} max={10} value={score} onChange={e => setScore(+e.target.value)} />
        {score >= 4 && <span style={{ color: 'red' }}> ≥4 将触发镇痛工单</span>}
      </div>
      <button onClick={complete}>完成随访</button>
      <table border={1} cellPadding={6}>
        <thead><tr><th>时间点</th><th>应随访</th><th>已完成</th><th>评分</th><th>工单</th></tr></thead>
        <tbody>
          {list.map((f: any) => (
            <tr key={f.id}>
              <td>{f.timepoint}</td>
              <td>{f.dueAt}</td>
              <td>{f.completedAt ?? '—'}</td>
              <td style={{ color: (f.painScore ?? 0) >= 4 ? 'red' : 'green' }}>{f.painScore ?? '—'}</td>
              <td>{f.workOrderId ? '已建工单' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
