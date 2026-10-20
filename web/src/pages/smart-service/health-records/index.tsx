/** 健澜科技 jlmedaios - 健康档案（M322 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; basicInfo: string; pastHistory: string; familyHistory: string; updatedAt: string }
export default function SmartServiceHealthRecordsPage() {
  usePageTitle('健康档案');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/smart-service/health-records').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '基本信息', dataIndex: 'basicInfo' },
    { title: '既往史', dataIndex: 'pastHistory', ellipsis: true },
    { title: '家族史', dataIndex: 'familyHistory', ellipsis: true },
    { title: '更新', dataIndex: 'updatedAt', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (
    <PageContainer title="健康档案">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无档案" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}