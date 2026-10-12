import { useState } from 'react';

export default function IcuSedationPage() {
  const [visitId, setVisitId] = useState('');
  const [rass, setRass] = useState(-1);
  const [target, setTarget] = useState(-1);
  const [vent, setVent] = useState(true);
  const [list, setList] = useState<any[]>([]);

  async function record() {
    await fetch('/api/v1/icu-sedation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, rassScore: rass, targetRass: target, onVentilator: vent }),
    });
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/icu-sedation?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  const overSedated = rass <= -3;
  const inTarget = Math.abs(rass - target) <= 1;

  return (
    <div style={{ padding: 24 }}>
      <h2>ICU RASS 镇静评分</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div>实际 RASS (-5..+4) <input type="number" min={-5} max={4} value={rass} onChange={e => setRass(+e.target.value)} /></div>
      <div>目标 RASS (-5..+1) <input type="number" min={-5} max={1} value={target} onChange={e => setTarget(+e.target.value)} /></div>
      <div>
        <label><input type="checkbox" checked={vent} onChange={e => setVent(e.target.checked)} /> 机械通气</label>
      </div>
      {overSedated && <div style={{ color: 'red' }}>过深镇静（≤-3），请评估减量</div>}
      {!overSedated && !inTarget && <div style={{ color: 'orange' }}>未达目标（±1 外）</div>}
      {inTarget && !overSedated && <div style={{ color: 'green' }}>达标</div>}
      <button onClick={record}>录入</button>
      <table border={1} cellPadding={6}>
        <thead><tr><th>时间</th><th>RASS</th><th>目标</th><th>通气</th></tr></thead>
        <tbody>
          {list.map((r: any) => (
            <tr key={r.id}>
              <td>{r.createdAt}</td>
              <td style={{ color: r.rassScore <= -3 ? 'red' : 'black' }}>{r.rassScore}</td>
              <td>{r.targetRass}</td>
              <td>{r.onVentilator ? 'Y' : 'N'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
