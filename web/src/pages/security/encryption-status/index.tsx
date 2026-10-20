/** 健澜科技 jlmedaios - 加密状态（M366 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; resource: string; encrypted: string; algorithm: string; lastVerified: string }
export default function SecurityEncryptionStatusPage() {
  usePageTitle('加密状态');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/encryption-status').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '资源', dataIndex: 'resource', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '是否加密', dataIndex: 'encrypted', render: (v: string) => <Tag color={v.includes('是') ? 'green' : 'red'}>{v}</Tag> },
    { title: '算法', dataIndex: 'algorithm' },
    { title: '最近校验', dataIndex: 'lastVerified', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (<PageContainer title="加密状态"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无状态" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}