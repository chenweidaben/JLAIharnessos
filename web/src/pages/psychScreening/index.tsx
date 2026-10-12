import { useState } from 'react';

export default function PsychScreeningPage() {
  const [visitId, setVisitId] = useState('');
  const [phq, setPhq] = useState<number[]>(Array(9).fill(0));
  const [gad, setGad] = useState<number[]>(Array(7).fill(0));
  const [out, setOut] = useState<any>(null);

  async function submit() {
    const r = await fetch('/api/v1/psych-screenings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, phq9Answers: phq, gad7Answers: gad }),
    });
    const j = await r.json();
    setOut(j?.data);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>PHQ-9 / GAD-7 心理筛查</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <h3>PHQ-9（0-3）</h3>
      {phq.map((v, i) => (
        <div key={i}>
          Q{i + 1}: <input type="number" min={0} max={3} value={v} onChange={e => { const a = [...phq]; a[i] = +e.target.value; setPhq(a); }} />
        </div>
      ))}
      <h3>GAD-7（0-3）</h3>
      {gad.map((v, i) => (
        <div key={i}>
          Q{i + 1}: <input type="number" min={0} max={3} value={v} onChange={e => { const a = [...gad]; a[i] = +e.target.value; setGad(a); }} />
        </div>
      ))}
      <button onClick={submit}>提交</button>
      {out && (
        <div style={{ marginTop: 16 }}>
          <div>PHQ-9: {out.phq9Total} ({out.phq9Level})</div>
          <div>GAD-7: {out.gad7Total} ({out.gad7Level})</div>
          {out.taskId && <div style={{ color: 'red' }}>已自动建心理科工单</div>}
        </div>
      )}
    </div>
  );
}
