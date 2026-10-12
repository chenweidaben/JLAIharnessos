import { useEffect, useState } from 'react';

export default function ErGreenPage() {
  const [list, setList] = useState<any[]>([]);
  const [created, setCreated] = useState<number | null>(null);

  async function load() {
    const r = await fetch('/api/v1/er-green/overdue');
    const j = await r.json();
    setList(j?.data ?? []);
  }
  async function scan() {
    const r = await fetch('/api/v1/er-green/scan', { method: 'POST' });
    const j = await r.json();
    setCreated(j?.data?.created ?? 0);
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>急诊绿色通道超时催办</h2>
      <button onClick={scan}>扫描催办</button>
      {created != null && <div>本次新建催办工单：<b>{created}</b></div>}
      <table border={1} cellPadding={6}>
        <thead><tr><th>Visit</th><th>级别</th><th>主诉</th><th>分诊时间</th></tr></thead>
        <tbody>
          {list.map(x => (
            <tr key={x.visitId}>
              <td>{x.visitId.slice(0, 8)}</td>
              <td style={{ color: 'red' }}>{x.level}</td>
              <td>{x.chiefComplaint}</td>
              <td>{x.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
