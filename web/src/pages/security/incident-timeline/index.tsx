/** 健澜科技 jlmedaios - 安全事件时间线（M269 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Tag, Timeline } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; event: string; time: string; stage: string; handler: string; status: string }
export default function SecurityIncidentTimelinePage() {
  usePageTitle('安全事件时间线');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/incident-timeline').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.timeline ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="安全事件响应时间线">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          {list.length === 0 ? <Empty description="暂无事件" /> : (
            <Timeline items={list.map((t) => ({
              color: t.status === '已关闭' ? 'green' : 'orange',
              children: <div>
                <strong>{t.time}</strong> <Tag color="blue">{t.stage}</Tag> <Tag color="purple">{t.event}</Tag>
                <div style={{ color: '#666' }}>处置人：{t.handler} / {t.status}</div>
              </div>,
            }))} />
          )}
        </Card>
      </Spin>
    </PageContainer>
  );
}
