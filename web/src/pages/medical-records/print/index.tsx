/** 健澜科技 jlmedaios - 病历打印（M337 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; copies: string; printer: string; time: string; purpose: string }
export default function MedicalRecordsPrintPage() {
  usePageTitle('病历打印');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/medical-records/print').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病案号', dataIndex: 'recordNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '份数', dataIndex: 'copies', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '打印员', dataIndex: 'printer' },
    { title: '时间', dataIndex: 'time' },
    { title: '用途', dataIndex: 'purpose' },
  ];
  return (
    <PageContainer title="病历打印">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无打印记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}