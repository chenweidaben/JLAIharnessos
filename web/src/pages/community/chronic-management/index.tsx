/** 健澜科技 jlmedaios - 慢病管理（M331 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; disease: string; manager: string; followupCount: number; controlStatus: string }
export default function CommunityChronicManagementPage() {
  usePageTitle('慢病管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/community/chronic-management').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '病种', dataIndex: 'disease', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '管理医生', dataIndex: 'manager' },
    { title: '随访次数', dataIndex: 'followupCount', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '控制情况', dataIndex: 'controlStatus', render: (v: string) => <Tag color={v.includes('良好') ? 'green' : v.includes('差') ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="慢病管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无慢病管理" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}