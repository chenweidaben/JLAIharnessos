/** 健澜科技 jlmedaios - 患者时间线（M270 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Tag, Timeline } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; type: string; time: string; dept: string; desc: string }
export default function CdsPatientTimelinePage() {
  usePageTitle('患者时间线');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/patient-timeline').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.events ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="患者全周期时间线">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          {list.length === 0 ? <Empty description="暂无事件" /> : (
            <Timeline items={list.map((e) => ({
              color: e.type === '就诊' ? 'blue' : 'green',
              children: <div>
                <strong>{e.time}</strong> <Tag color="purple">{e.type}</Tag> <Tag color="blue">{e.dept}</Tag>
                <div style={{ color: '#666' }}>{e.desc}</div>
              </div>,
            }))} />
          )}
        </Card>
      </Spin>
    </PageContainer>
  );
}
