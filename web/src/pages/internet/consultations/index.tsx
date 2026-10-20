/** 健澜科技 jlmedaios - 互联网问诊（M306 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; doctor: string; dept: string; date: string; status: string; topic: string }
export default function InternetConsultationsPage() {
  usePageTitle('互联网问诊');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/internet/consultations').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.consultations ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '主题', dataIndex: 'topic' },
    { title: '医生', dataIndex: 'doctor' },
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '日期', dataIndex: 'date' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已回复' ? 'green' : v === '回复中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="互联网问诊">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无问诊" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}