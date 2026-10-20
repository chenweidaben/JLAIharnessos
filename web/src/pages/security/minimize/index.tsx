/** 健澜科技 jlmedaios - 数据最小化（M265 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { field: string; sensitivity: string; maskRule: string; scenario: string }
export default function SecurityMinimizePage() {
  usePageTitle('数据最小化');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/minimize').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.fields ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '字段', dataIndex: 'field', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '敏感度', dataIndex: 'sensitivity', render: (v: string) => <Tag color={v === '高' ? 'red' : 'orange'}>{v}</Tag> },
    { title: '脱敏规则', dataIndex: 'maskRule' },
    { title: '适用场景', dataIndex: 'scenario' },
  ];
  return (
    <PageContainer title="数据最小化字段策略">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="field" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无字段" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
