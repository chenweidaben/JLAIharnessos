import { useEffect, useState } from 'react';

export default function VteAnticoagPage() {
  const [visitId, setVisitId] = useState('');
  const [drug, setDrug] = useState('enoxaparin');
  const [plannedDays, setPlannedDays] = useState(7);
  const [list, setList] = useState<any[]>([]);

  async function load() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/vte-anticoag?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }
  useEffect(() => { load(); }, [visitId]);

  async function start() {
    await fetch('/api/v1/vte-anticoag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, drug, startDate: new Date().toISOString().slice(0, 10), plannedDays }),
    });
    load();
  }

  async function bleeding(id: string) {
    const score = prompt('出血评分(0-100)');
    await fetch(`/api/v1/vte-anticoag/${id}/bleeding`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: Number(score) }),
    });
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>VTE 抗凝疗程</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div>药物
        <select value={drug} onChange={e => setDrug(e.target.value)}>
          <option value="enoxaparin">enoxaparin</option>
          <option value="warfarin">warfarin</option>
          <option value="rivaroxaban">rivaroxaban</option>
        </select>
      </div>
      <div>计划天数 <input type="number" value={plannedDays} onChange={e => setPlannedDays(+e.target.value)} /></div>
      <button onClick={start}>启动</button>
      <ul>
        {list.map(it => (
          <li key={it.id} style={{ color: it.bleedingScore >= 40 ? 'red' : 'inherit' }}>
            {it.drug} plan={it.plannedDays}d bleeding={it.bleedingScore} active={String(it.active)}
            <button onClick={() => bleeding(it.id)}>记录出血分</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
