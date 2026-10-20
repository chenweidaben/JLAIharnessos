/** 健澜科技 jlmedaios - 皮肤科病例（M240 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; location: string; morphology: string; diagnosis: string; fungalTest: string; treatment: string }
export default function DermatologyPage() {
  usePageTitle('皮肤科病例');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/dermatology/cases').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.cases ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '部位', dataIndex: 'location', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '形态', dataIndex: 'morphology' },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '真菌镜检', dataIndex: 'fungalTest', render: (v: string) => <Tag color={v === '阴性' ? 'green' : 'red'}>{v}</Tag> },
    { title: '治疗', dataIndex: 'treatment' },
  ];
  return (
    <PageContainer title="皮肤科病例">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无病例" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
