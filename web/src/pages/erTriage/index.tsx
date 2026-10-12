import { useState } from 'react';

export default function ErTriagePage() {
  const [visitId, setVisitId] = useState('');
  const [cc, setCc] = useState('');
  const [sbp, setSbp] = useState<number | undefined>(undefined);
  const [hr, setHr] = useState<number | undefined>(undefined);
  const [rr, setRr] = useState<number | undefined>(undefined);
  const [spo2, setSpo2] = useState<number | undefined>(undefined);
  const [gcs, setGcs] = useState<number | undefined>(undefined);
  const [out, setOut] = useState<any>(null);

  async function triage() {
    const r = await fetch('/api/v1/er-triage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, chiefComplaint: cc, systolicBp: sbp, heartRate: hr, respRate: rr, spo2, gcs }),
    });
    const j = await r.json();
    setOut(j?.data);
  }

  const levelColor: Record<string, string> = { I: 'red', II: 'orange', III: 'yellow', IV: 'green', V: 'gray' };

  return (
    <div style={{ padding: 24 }}>
      <h2>急诊预检分诊五级</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div>主诉 <input value={cc} onChange={e => setCc(e.target.value)} /></div>
      <div>
        SBP <input type="number" value={sbp ?? ''} onChange={e => setSbp(e.target.value ? +e.target.value : undefined)} />
        HR <input type="number" value={hr ?? ''} onChange={e => setHr(e.target.value ? +e.target.value : undefined)} />
        RR <input type="number" value={rr ?? ''} onChange={e => setRr(e.target.value ? +e.target.value : undefined)} />
        SpO2 <input type="number" value={spo2 ?? ''} onChange={e => setSpo2(e.target.value ? +e.target.value : undefined)} />
        GCS <input type="number" value={gcs ?? ''} onChange={e => setGcs(e.target.value ? +e.target.value : undefined)} />
      </div>
      <button onClick={triage}>分诊</button>
      {out && (
        <div style={{ marginTop: 16 }}>
          <div>
            分级：
            <span style={{ color: levelColor[out.level] ?? 'black', fontSize: 24, fontWeight: 'bold' }}>{out.level}</span>
            {out.greenChannel && <span style={{ color: 'red', marginLeft: 12 }}>绿色通道</span>}
          </div>
        </div>
      )}
    </div>
  );
}
