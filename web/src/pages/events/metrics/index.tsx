/** 健澜科技 jlmedaios - 事件指标（M307 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { totalEvents: number; todayEvents: number; eventTypes: number; errorRate: string; avgLatencyMs: number; topTypes: { type: string; count: number; percent: string }[] }
export default function EventsMetricsPage() {
  usePageTitle('事件指标');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/events/metrics').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="事件总线指标">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总事件" value={data.totalEvents} /></Card></Col>
              <Col span={6}><Card><Statistic title="今日事件" value={data.todayEvents} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均延迟(ms)" value={data.avgLatencyMs} /></Card></Col>
              <Col span={6}><Card><Statistic title="错误率" value={data.errorRate} /></Card></Col>
            </Row>
            <Card title="Top 事件类型"><List size="small" dataSource={data.topTypes} renderItem={(i) => <List.Item><Tag color="blue">{i.type}</Tag> {i.count} 次 ({i.percent})</List.Item>} /></Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}