/** 健澜科技 jlmedaios - 容灾演练（M263 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; time: string; scope: string; rto: string; rpo: string; result: string }
export default function SecurityDrPage() {
  usePageTitle('容灾演练');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/dr').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.drills ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '时间', dataIndex: 'time' },
    { title: '范围', dataIndex: 'scope' },
    { title: 'RTO', dataIndex: 'rto', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'RPO', dataIndex: 'rpo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '通过' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="容灾演练（DR）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无演练" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
