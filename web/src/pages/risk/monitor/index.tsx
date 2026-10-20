/** 健澜科技 jlmedaios - 风险监测（M327 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; item: string; indicator: string; threshold: string; trend: string; status: string }
export default function RiskMonitorPage() {
  usePageTitle('风险监测');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/risk/monitor').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '监测项', dataIndex: 'item', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '当前值', dataIndex: 'indicator', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '阈值', dataIndex: 'threshold', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '趋势', dataIndex: 'trend' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '正常' ? 'green' : v === '预警' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="风险监测">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无监测" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}