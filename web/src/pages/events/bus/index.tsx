/** 健澜科技 jlmedaios - 事件总线（M271 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data { totalEvents: string; eventTypes: number; avgConsumerLatency: string; failureRate: string; topics: string[] }
export default function EventsBusPage() {
  usePageTitle('事件总线');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/events/bus').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="事件总线运行状态">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="今日事件总量"><Tag color="purple">{data.totalEvents}</Tag></Descriptions.Item>
              <Descriptions.Item label="事件类型数">{data.eventTypes}</Descriptions.Item>
              <Descriptions.Item label="平均消费延迟">{data.avgConsumerLatency}</Descriptions.Item>
              <Descriptions.Item label="失败率">{data.failureRate}</Descriptions.Item>
              <Descriptions.Item label="Topic">{data.topics.map((t) => <Tag key={t} color="blue" style={{ marginLeft: 4 }}>{t}</Tag>)}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
