/** 健澜科技 jlmedaios - 患者360时间线（M245 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Tag, Timeline } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Item { date: string; type: string; title: string; description: string }
interface Data { patientId: string; patientName: string; timeline: Item[] }
const COLOR: Record<string, string> = { outpatient: 'blue', exam: 'green', inpatient: 'purple', medication: 'orange', surgery: 'red' };
export default function Patient360Page() {
  usePageTitle('患者360');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/360/full').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="患者 360° 全景">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card title={`${data.patientName}（${data.patientId}）`}>
            <Timeline
              items={data.timeline.map((t) => ({
                color: COLOR[t.type] || 'gray',
                children: <div><strong>{t.date}</strong> <Tag color={COLOR[t.type]}>{t.type}</Tag> {t.title}<div style={{ color: '#666' }}>{t.description}</div></div>,
              }))}
            />
          </Card>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
