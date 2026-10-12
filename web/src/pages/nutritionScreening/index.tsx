import { useState } from 'react';

interface Screening {
  id: string;
  visitId: string;
  nutritionScore: number;
  diseaseSeverity: number;
  ageBonus: number;
  totalScore: number;
  nutritionRisk: boolean;
  resultNote: string | null;
  createdAt: string;
}

export default function NutritionScreeningPage() {
  const [visitId, setVisitId] = useState('');
  const [nutritionScore, setNutritionScore] = useState(1);
  const [diseaseSeverity, setDiseaseSeverity] = useState(0);
  const [ageYears, setAgeYears] = useState(50);
  const [list, setList] = useState<Screening[]>([]);
  const [msg, setMsg] = useState('');

  const ageBonus = ageYears >= 70 ? 1 : 0;
  const total = nutritionScore + diseaseSeverity + ageBonus;
  const risk = total >= 3;

  async function submit() {
    const r = await fetch('/api/v1/nutrition-screenings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, nutritionScore, diseaseSeverity, ageYears }),
    });
    const j = await r.json();
    setMsg(JSON.stringify(j));
    refresh();
  }
  async function refresh() {
    if (!visitId) return;
    const r = await fetch(`/api/v1/nutrition-screenings?visitId=${visitId}`);
    const j = await r.json();
    setList(j?.data ?? []);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>入院营养风险筛查（NRS-2002）</h2>
      <div style={{ marginBottom: 12 }}>
        就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} />
        <button onClick={refresh}>加载历史</button>
      </div>
      <div>
        营养状态(0-3) <input type="number" min={0} max={3} value={nutritionScore} onChange={e => setNutritionScore(+e.target.value)} />
        疾病严重度(0-3) <input type="number" min={0} max={3} value={diseaseSeverity} onChange={e => setDiseaseSeverity(+e.target.value)} />
        年龄 <input type="number" value={ageYears} onChange={e => setAgeYears(+e.target.value)} />
      </div>
      <div style={{ margin: '12px 0', fontWeight: 'bold', color: risk ? 'red' : 'green' }}>
        总分 {total}（年龄加分 {ageBonus}）→ {risk ? '营养风险阳性' : '暂无风险'}
      </div>
      <button onClick={submit} style={{ padding: '6px 16px' }}>提交筛查</button>
      {msg && <pre style={{ fontSize: 12 }}>{msg}</pre>}
      <h3>历史记录</h3>
      <ul>{list.map(s => (
        <li key={s.id} style={{ color: s.nutritionRisk ? 'red' : 'inherit' }}>
          {s.createdAt} 总分{s.totalScore} {s.nutritionRisk ? 'RISK' : 'ok'}
        </li>
      ))}</ul>
    </div>
  );
}
