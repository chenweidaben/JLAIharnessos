import { useState } from 'react';

export default function PacuRecordPage() {
  const [visitId, setVisitId] = useState('');
  const [activity, setActivity] = useState(2);
  const [respiration, setRespiration] = useState(2);
  const [circulation, setCirculation] = useState(2);
  const [consciousness, setConsciousness] = useState(2);
  const [spo2, setSpo2] = useState(2);
  const [list, setList] = useState<any[]>([]);

  const total = activity + respiration + circulation + consciousness + spo2;
  const ready = total >= 9;

  async function submit() {
    await fetch('/api/v1/pacu-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, activity, respiration, circulation, consciousness, spo2 }),
    });
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/pacu-records?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  const fields: [string, number, (v: number) => void][] = [
    ['活动 activity', activity, setActivity],
    ['呼吸 respiration', respiration, setRespiration],
    ['循环 circulation', circulation, setCirculation],
    ['意识 consciousness', consciousness, setConsciousness],
    ['SpO2 spo2', spo2, setSpo2],
  ];
  return (
    <div style={{ padding: 24 }}>
      <h2>PACU Aldrete 评分</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      {fields.map(([label, val, set]) => (
        <div key={label} style={{ margin: 6 }}>
          {label}
          <input type="range" min={0} max={2} value={val} onChange={e => set(+e.target.value)} />
          <b> {val}</b>
        </div>
      ))}
      <div style={{ color: ready ? 'green' : 'red' }}>
        Aldrete 总分 {total} / 10 — {ready ? '可出 PACU' : '继续观察'}
      </div>
      <button onClick={submit}>记录</button>
      <ul>{list.map((s: any) => <li key={s.id}>{s.createdAt} aldrete={s.aldrete ?? '?'}</li>)}</ul>
    </div>
  );
}
