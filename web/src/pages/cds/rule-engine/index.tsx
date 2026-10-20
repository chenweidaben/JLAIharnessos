/** 健澜科技 jlmedaios - 规则引擎（M377 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; engineName: string; ruleCount: string; executionCount: string }
export default function CdsRuleEnginePage() {
  usePageTitle('规则引擎');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/cds/rule-engine').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '引擎', dataIndex: 'engineName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '规则数', dataIndex: 'ruleCount', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '执行数', dataIndex: 'executionCount' },
  ];
  return (<PageContainer title="规则引擎"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无引擎" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}