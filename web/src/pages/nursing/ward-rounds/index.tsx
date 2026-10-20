/** 健澜科技 jlmedaios - 护理查房（M303 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; nurse: string; time: string; measure: string; note: string }
export default function NursingWardRoundsPage() {
  usePageTitle('护理查房');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/nursing/ward-rounds').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.rounds ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '护士', dataIndex: 'nurse', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '措施', dataIndex: 'measure' },
    { title: '备注', dataIndex: 'note' },
  ];
  return (
    <PageContainer title="护理查房">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无查房" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}