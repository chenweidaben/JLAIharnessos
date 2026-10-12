import { useState } from 'react';

const LABEL: Record<string, string> = {
  feeding: '进食', bathing: '洗澡', grooming: '修饰', dressing: '穿衣',
  bowel: '大便', bladder: '小便', toileting: '如厕',
  transfer: '转移', walking: '行走', stairs: '上下楼梯',
};
const OPTS: Record<string, number[]> = {
  feeding: [0,5,10], bathing: [0,5], grooming: [0,5], dressing: [0,5,10],
  bowel: [0,5,10], bladder: [0,5,10], toileting: [0,5,10],
  transfer: [0,5,10,15], walking: [0,5,10,15], stairs: [0,5,10],
};

export default function BarthelPage() {
  const [visitId, setVisitId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({
    feeding: 10, bathing: 5, grooming: 5, dressing: 10, bowel: 10, bladder: 10, toileting: 10, transfer: 15, walking: 15, stairs: 10,
  });
  const [out, setOut] = useState<any>(null);

  async function submit() {
    const r = await fetch('/api/v1/barthel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, ...scores }),
    });
    const j = await r.json();
    setOut(j?.data);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Barthel ADL 指数</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      {Object.keys(LABEL).map(k => (
        <div key={k}>
          {LABEL[k]}
          <select value={scores[k]} onChange={e => setScores({ ...scores, [k]: +e.target.value })}>
            {OPTS[k].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      ))}
      <button onClick={submit}>评定</button>
      {out && (
        <div style={{ marginTop: 16 }}>
          <div>总分：<b>{out.totalScore}</b></div>
          <div>分级：<b>{out.dependencyLevel}</b></div>
        </div>
      )}
    </div>
  );
}
