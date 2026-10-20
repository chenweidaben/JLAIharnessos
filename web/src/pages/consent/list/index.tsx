/** 健澜科技 jlmedaios - 知情同意（M303 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; consentType: string; signTime: string; doctor: string; status: string }
export default function ConsentListPage() {
  usePageTitle('知情同意');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/consent/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.consents ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '同意类型', dataIndex: 'consentType' },
    { title: '签署时间', dataIndex: 'signTime' },
    { title: '医生', dataIndex: 'doctor' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已签署' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="知情同意">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无同意书" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}