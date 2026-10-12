import { useEffect, useState } from 'react';

export default function NissReportingPage() {
  const [visitId, setVisitId] = useState('');
  const [type, setType] = useState('SSI');
  const [pathogen, setPathogen] = useState('');
  const [list, setList] = useState<any[]>([]);

  async function load() {
    const r = await fetch('/api/v1/niss');
    const j = await r.json();
    setList(j?.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    await fetch('/api/v1/niss', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, infectionType: type, pathogen }),
    });
    load();
  }

  async function advance(id: string, status: string) {
    await fetch(`/api/v1/niss/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>院内感染上报</h2>
      <div>就诊ID <input value={visitId} onChange={e => setVisitId(e.target.value)} /></div>
      <div>类型
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="SSI">SSI</option><option value="CRBSI">CRBSI</option>
          <option value="CAUTI">CAUTI</option><option value="pneumonia">肺炎</option>
        </select>
      </div>
      <div>病原体 <input value={pathogen} onChange={e => setPathogen(e.target.value)} /></div>
      <button onClick={submit}>上报</button>
      <h3>Active</h3>
      <ul>
        {list.map(it => (
          <li key={it.id}>
            {it.infectionType} ({it.status}) isolation={String(it.isolationRequired)}
            <button onClick={() => advance(it.id, 'under_investigation')}>调查</button>
            <button onClick={() => advance(it.id, 'resolved')}>结案</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
