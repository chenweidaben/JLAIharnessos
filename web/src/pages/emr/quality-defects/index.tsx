/** 健澜科技 jlmedaios - 病历缺陷明细（M268 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; mrn: string; type: string; penalty: number; rectifier: string; status: string }
export default function EmrQualityDefectsPage() {
  usePageTitle('病历缺陷明细');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/quality-defects').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.defects ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病历号', dataIndex: 'mrn' },
    { title: '缺陷类型', dataIndex: 'type' },
    { title: '扣分', dataIndex: 'penalty', render: (v: number) => <Tag color="red">-{v}</Tag> },
    { title: '整改人', dataIndex: 'rectifier' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已整改' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="病历缺陷明细">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无缺陷" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
