/** 健澜科技 jlmedaios - 行政工作流（M307 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Spin, Statistic, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Cat { name: string; pending: number; avgDays: number }
interface Data { pendingApprovals: number; inProgress: number; completedToday: number; categories: Cat[] }
export default function WorkflowAdminPage() {
  usePageTitle('行政工作流');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/workflow/admin').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Cat> = [
    { title: '审批类别', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '待处理', dataIndex: 'pending', render: (v: number) => v > 3 ? <Tag color="red">{v}</Tag> : v },
    { title: '平均天数', dataIndex: 'avgDays' },
  ];
  return (
    <PageContainer title="行政工作流">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card><Statistic title="待审批" value={data.pendingApprovals} /></Card></Col>
              <Col span={8}><Card><Statistic title="进行中" value={data.inProgress} /></Card></Col>
              <Col span={8}><Card><Statistic title="今日已完成" value={data.completedToday} /></Card></Col>
            </Row>
            <Card><Table rowKey="name" columns={columns} dataSource={data.categories} locale={{ emptyText: <Empty description="暂无审批" /> }} pagination={false} /></Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}