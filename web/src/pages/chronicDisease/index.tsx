import { useState } from 'react';

export default function ChronicPage() {
  const [patientId, setPatientId] = useState('');
  const [sbp, setSbp] = useState<number | undefined>(undefined);
  const [dbp, setDbp] = useState<number | undefined>(undefined);
  const [fpg, setFpg] = useState<number | undefined>(undefined);
  const [hba1c, setHba1c] = useState<number | undefined>(undefined);
  const [out, setOut] = useState<any>(null);

  async function submit() {
    const r = await fetch('/api/v1/chronic/vitals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, sbp, dbp, fastingGlucose: fpg, hba1c }),
    });
    const j = await r.json();
    setOut(j?.data);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>慢病随访（高血压/糖尿病）</h2>
      <div>患者ID <input value={patientId} onChange={e => setPatientId(e.target.value)} /></div>
      <div>
        SBP <input type="number" value={sbp ?? ''} onChange={e => setSbp(e.target.value ? +e.target.value : undefined)} />
        DBP <input type="number" value={dbp ?? ''} onChange={e => setDbp(e.target.value ? +e.target.value : undefined)} />
      </div>
      <div>
        空腹血糖 <input type="number" step="0.1" value={fpg ?? ''} onChange={e => setFpg(e.target.value ? +e.target.value : undefined)} />
        HbA1c <input type="number" step="0.1" value={hba1c ?? ''} onChange={e => setHba1c(e.target.value ? +e.target.value : undefined)} />
      </div>
      <button onClick={submit}>记录</button>
      {out && (
        <div style={{ marginTop: 16 }}>
          <div>达标判定：<b style={{ color: out.level === 'controlled' ? 'green' : 'red' }}>{out.level}</b></div>
          {out.interventionTaskId && <div style={{ color: 'red' }}>已建随访工单</div>}
        </div>
      )}
    </div>
  );
}
