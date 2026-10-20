/** 健澜科技 jlmedaios - 脱敏规则（M366 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; ruleName: string; field: string; algorithm: string; status: string }
export default function SecurityMaskingRulesPage() {
  usePageTitle('脱敏规则');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/masking-rules').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '规则名', dataIndex: 'ruleName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '字段', dataIndex: 'field', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '算法', dataIndex: 'algorithm' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('启用') ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (<PageContainer title="脱敏规则"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无规则" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}