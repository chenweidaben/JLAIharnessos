import { useState } from 'react';

export default function PostpartumVisitPage() {
  const [motherVisitId, setMotherVisitId] = useState('');
  const [day, setDay] = useState(1);
  const [bf, setBf] = useState(2);
  const [tcb, setTcb] = useState<number | undefined>(undefined);
  const [visual, setVisual] = useState('none');
  const [list, setList] = useState<any[]>([]);

  async function record() {
    await fetch('/api/v1/postpartum-visits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motherVisitId, postpartumDay: day, breastfeedingScore: bf, jaundiceTcb: tcb, jaundiceVisual: visual }),
    });
    refresh();
  }
  async function refresh() {
    if (!motherVisitId) return;
    const r = await fetch(`/api/v1/postpartum-visits?motherVisitId=${motherVisitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>产后 1/2/3 天访视</h2>
      <div>母亲就诊ID <input value={motherVisitId} onChange={e => setMotherVisitId(e.target.value)} /></div>
      <div>
        产后日
        <select value={day} onChange={e => setDay(+e.target.value)}>
          <option value={1}>Day 1</option><option value={2}>Day 2</option><option value={3}>Day 3</option>
        </select>
      </div>
      <div>母乳喂养评分 0-3 <input type="number" min={0} max={3} value={bf} onChange={e => setBf(+e.target.value)} /></div>
      <div>黄疸 TcB (mg/dL) <input type="number" value={tcb ?? ''} onChange={e => setTcb(e.target.value ? +e.target.value : undefined)} /></div>
      <div>
        可视黄疸
        <select value={visual} onChange={e => setVisual(e.target.value)}>
          <option value="none">无</option><option value="face">面</option><option value="trunk">躯干</option>
          <option value="extremities">四肢</option><option value="generalized">全身</option>
        </select>
      </div>
      <button onClick={record}>录入</button>
      <table border={1} cellPadding={6}>
        <thead><tr><th>日</th><th>喂养</th><th>TcB</th><th>可视</th></tr></thead>
        <tbody>
          {list.map((r: any) => (
            <tr key={r.id}>
              <td>{r.postpartumDay}</td>
              <td>{r.breastfeedingScore}</td>
              <td style={{ color: r.jaundiceTcb != null && r.jaundiceTcb >= (r.postpartumDay === 1 ? 6 : r.postpartumDay === 2 ? 9 : 12) ? 'red' : 'black' }}>
                {r.jaundiceTcb ?? '—'}
              </td>
              <td style={{ color: r.jaundiceVisual === 'generalized' ? 'red' : 'black' }}>{r.jaundiceVisual}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
