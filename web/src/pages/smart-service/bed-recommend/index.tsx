/** 健澜科技 jlmedaios - 床位推荐（M322 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; recommendedWard: string; bedType: string; reason: string; status: string }
export default function SmartServiceBedRecommendPage() {
  usePageTitle('床位推荐');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/bed-recommend').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '推荐病房', dataIndex: 'recommendedWard', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '床型', dataIndex: 'bedType' },
    { title: '理由', dataIndex: 'reason', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已接受' ? 'green' : v === '推荐中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="床位推荐">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无推荐" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}