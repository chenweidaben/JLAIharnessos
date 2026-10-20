/** 健澜科技 jlmedaios - 互联网处方（M249 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; rxNo: string; patient: string; doctor: string; diagnosis: string; medicines: string[]; status: string; pharmacy: string; createTime: string }
export default function InternetPrescriptionPage() {
  usePageTitle('互联网处方');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/internet/prescriptions').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.prescriptions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '处方号', dataIndex: 'rxNo', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '患者', dataIndex: 'patient' },
    { title: '诊断', dataIndex: 'diagnosis' },
    { title: '药品', dataIndex: 'medicines', render: (v: string[]) => v.map((m) => <Tag key={m} color="green">{m}</Tag>) },
    { title: '开方医生', dataIndex: 'doctor' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已审核' ? 'green' : 'orange'}>{v}</Tag> },
    { title: '时间', dataIndex: 'createTime' },
  ];
  return (
    <PageContainer title="互联网处方（在线复诊）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无处方" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
