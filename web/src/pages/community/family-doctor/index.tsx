/** 健澜科技 jlmedaios - 家庭医生签约（M331 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; resident: string; doctor: string; signDate: string; serviceContent: string; status: string }
export default function CommunityFamilyDoctorPage() {
  usePageTitle('家庭医生签约');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/community/family-doctor').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '居民', dataIndex: 'resident' },
    { title: '签约医生', dataIndex: 'doctor', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '签约日期', dataIndex: 'signDate', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '服务内容', dataIndex: 'serviceContent', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '服务中' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="家庭医生签约">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无签约" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}