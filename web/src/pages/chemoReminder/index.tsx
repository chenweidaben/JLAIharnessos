import { useEffect, useState } from 'react';

export default function ChemoReminderPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const r = await fetch('/api/v1/chemo/reminders/upcoming');
    const j = await r.json();
    setItems(j?.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function scan() {
    await fetch('/api/v1/chemo/reminders/scan', { method: 'POST' });
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>明日化疗提醒</h2>
      <button onClick={scan}>手动扫描</button>
      <ul>
        {items.map(it => (
          <li key={it.id}>
            {it.drug} cycle {it.cycleNo} ({it.plannedDate}) — {it.reminderSent ? '已通知' : '未通知'}
          </li>
        ))}
      </ul>
    </div>
  );
}
