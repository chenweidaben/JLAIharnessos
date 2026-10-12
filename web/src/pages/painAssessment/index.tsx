import { useState } from 'react';

export default function PainAssessmentPage() {
  const [visitId, setVisitId] = useState('');
  const [score, setScore] = useState(3);
  const [assessType, setAssessType] = useState('admission');
  const [list, setList] = useState<any[]>([]);

  const level = score <= 3 ? 'mild' : score <= 6 ? 'moderate' : 'severe';
  const need = score >= 4;

  async function submit() {
    await fetch('/api/v1/pain-assessments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, score, assessType }),
    });
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/pain-assessments?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>疼痛评估 NRS 0-10</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div style={{ margin: '12px 0' }}>
        评分 <input type="range" min={0} max={10} value={score} onChange={e => setScore(+e.target.value)} />
        <b style={{ color: need ? 'red' : 'green' }}> {score} ({level})</b>
      </div>
      <div>类型
        <select value={assessType} onChange={e => setAssessType(e.target.value)}>
          <option value="admission">入院</option><option value="postop">术后</option>
          <option value="cancer">癌痛</option><option value="followup">随访</option>
        </select>
      </div>
      {need && <div style={{ color: 'red', margin: 8 }}>建议通知医师评估镇痛方案</div>}
      <button onClick={submit}>提交评估</button>
      <h3>历史</h3>
      <ul>{list.map((s: any) => <li key={s.id}>{s.createdAt} NRS={s.score} {s.assessType}</li>)}</ul>
    </div>
  );
}
