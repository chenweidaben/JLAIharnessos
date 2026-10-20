/** 健澜科技 jlmedaios - 医保待遇（M354 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; benefitName: string; type: string; rate: string; limit: string; effectiveTime: string }
export default function InsuranceBenefitsPage() {
  usePageTitle('医保待遇');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/insurance/benefits').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '待遇名', dataIndex: 'benefitName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '报销比例', dataIndex: 'rate' },
    { title: '限额', dataIndex: 'limit' },
    { title: '生效时间', dataIndex: 'effectiveTime' },
  ];
  return (<PageContainer title="医保待遇"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无待遇" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}