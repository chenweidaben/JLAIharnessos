/** 健澜科技 jlmedaios - 数据保留策略（M262 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { dataType: string; retentionYears: number; archive: string; destroy: string }
export default function SecurityRetentionPage() {
  usePageTitle('数据保留策略');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/retention').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.policies ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '数据类型', dataIndex: 'dataType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '保留年限', dataIndex: 'retentionYears', render: (v: number) => `${v} 年` },
    { title: '归档策略', dataIndex: 'archive' },
    { title: '销毁策略', dataIndex: 'destroy' },
  ];
  return (
    <PageContainer title="数据保留与销毁策略">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="dataType" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无策略" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
