/** 健澜科技 jlmedaios - 糖尿病管理（M237 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; hba1c: number; fastingGlucose: number; medication: string; complications: string; followUp: string }
export default function ChronicPage() {
  usePageTitle('糖尿病管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/chronic/diabetes').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.diabetes ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: 'HbA1c', dataIndex: 'hba1c', render: (v: number) => <Tag color={v > 7 ? 'red' : 'green'}>{v}%</Tag> },
    { title: '空腹血糖', dataIndex: 'fastingGlucose' },
    { title: '用药', dataIndex: 'medication' },
    { title: '并发症', dataIndex: 'complications' },
    { title: '随访日期', dataIndex: 'followUp' },
  ];
  return (
    <PageContainer title="糖尿病慢性病管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无患者" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
