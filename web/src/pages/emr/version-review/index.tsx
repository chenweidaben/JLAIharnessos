/** 健澜科技 jlmedaios - 版本审核（M341 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; reviewer: string; result: string; comment: string; time: string }
export default function EmrVersionReviewPage() {
  usePageTitle('版本审核');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/emr/version-review').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '病案号', dataIndex: 'recordNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '审核人', dataIndex: 'reviewer' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v.includes('通过') ? 'green' : 'red'}>{v}</Tag> },
    { title: '意见', dataIndex: 'comment', ellipsis: true },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="版本审核"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无审核" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}