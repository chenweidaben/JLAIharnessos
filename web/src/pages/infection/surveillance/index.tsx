/** 健澜科技 jlmedaios - 院感监测（M320 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { name: string; value: string; target: string; status: string }
interface Data { period: string; indicators: Row[] }
export default function InfectionSurveillancePage() {
  usePageTitle('院感监测');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/infection/surveillance').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '当前值', dataIndex: 'value', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '目标', dataIndex: 'target', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'good' ? 'green' : v === 'warning' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="院感监测" extra={data ? <Tag color="blue">{data.period}</Tag> : null}>
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card><Table rowKey="name" columns={columns} dataSource={data.indicators} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}