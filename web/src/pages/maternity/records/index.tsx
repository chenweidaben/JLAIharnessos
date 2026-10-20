/** 健澜科技 jlmedaios - 产科记录（M284 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; mother: string; gestationalAge: string; expectedDate: string; checkupCount: number; riskLevel: string }
export default function MaternityRecordsPage() {
  usePageTitle('产科记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/maternity/records').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.records ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '孕妇', dataIndex: 'mother' },
    { title: '孕周', dataIndex: 'gestationalAge', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '预产期', dataIndex: 'expectedDate' },
    { title: '产检次数', dataIndex: 'checkupCount' },
    { title: '风险等级', dataIndex: 'riskLevel', render: (v: string) => <Tag color={v === '低' ? 'green' : v === '中' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="产科记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}