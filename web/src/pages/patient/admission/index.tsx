/** 健澜科技 jlmedaios - 入院登记（M296 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; dept: string; bedNo: string; admissionTime: string; status: string }
export default function PatientAdmissionPage() {
  usePageTitle('入院登记');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/admission').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.admissions ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '床号', dataIndex: 'bedNo' },
    { title: '入院时间', dataIndex: 'admissionTime' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '在院' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="入院登记">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无入院" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}