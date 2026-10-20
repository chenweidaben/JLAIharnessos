/** 健澜科技 jlmedaios - 预防保健（M224 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; vaccine: string; target: string; date: string; dose: string; doctor: string; status: string }
export default function PreventivePage() {
  usePageTitle('预防保健');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/preventive/immunizations').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.records ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '疫苗', dataIndex: 'vaccine', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '接种对象', dataIndex: 'target' },
    { title: '接种日期', dataIndex: 'date' },
    { title: '剂次', dataIndex: 'dose' },
    { title: '接种医生', dataIndex: 'doctor' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已接种' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="预防保健（接种记录）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无接种记录" /> }} pagination={{ pageSize: 10 }} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
