import { useState } from 'react';

export default function OncologyPage() {
  const [patientId, setPatientId] = useState('');
  const [drugName, setDrugName] = useState('');
  const [cycleNo, setCycleNo] = useState(1);
  const [cycles, setCycles] = useState<any[]>([]);
  const [aes, setAes] = useState<any[]>([]);

  async function addCycle() {
    await fetch('/api/v1/oncology/cycles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, drugName, cycleNo, plannedDate: '2026-10-14' }),
    });
    load();
  }
  async function load() {
    const r = await fetch(`/api/v1/oncology?patientId=${patientId}`);
    const j = await r.json();
    setCycles(j?.data?.cycles ?? []);
    setAes(j?.data?.aes ?? []);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>肿瘤随访</h2>
      <div>患者ID <input value={patientId} onChange={e => setPatientId(e.target.value)} /></div>
      <div>药品 <input value={drugName} onChange={e => setDrugName(e.target.value)} /></div>
      <div>周期 <input type="number" value={cycleNo} onChange={e => setCycleNo(+e.target.value)} /></div>
      <button onClick={addCycle}>加周期</button>
      <h3>化疗周期</h3>
      <ul>{cycles.map(c => <li key={c.id}>{c.drugName} cycle {c.cycleNo} ({c.plannedDate})</li>)}</ul>
      <h3>不良反应（CTCAE）</h3>
      <ul>
        {aes.map(a => (
          <li key={a.id} style={{ color: a.grade >= 3 ? 'red' : 'black' }}>
            {a.term} grade {a.grade}
          </li>
        ))}
      </ul>
    </div>
  );
}
