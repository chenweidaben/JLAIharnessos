/** 健澜科技 jlmedaios - 加密密钥（M366 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; keyName: string; algorithm: string; expiryTime: string; status: string }
export default function SecurityEncryptionKeysPage() {
  usePageTitle('加密密钥');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/encryption-keys').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '密钥名', dataIndex: 'keyName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '算法', dataIndex: 'algorithm', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '过期时间', dataIndex: 'expiryTime' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="加密密钥"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无密钥" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}