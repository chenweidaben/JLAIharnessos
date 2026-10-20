/** 健澜科技 jlmedaios - 新生儿筛查（M332 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; baby: string; screeningItem: string; result: string; time: string; doctor: string }
export default function NewbornScreeningPage() {
  usePageTitle('新生儿筛查');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/newborn/screening').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '婴儿', dataIndex: 'baby' },
    { title: '筛查项目', dataIndex: 'screeningItem', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v.includes('阴性') ? 'green' : 'red'}>{v}</Tag> },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="新生儿筛查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无筛查记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}