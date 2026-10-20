/** 健澜科技 jlmedaios - 证书管理（M264 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; issuer: string; validity: string; fingerprint: string; status: string }
export default function SecurityCertificatesPage() {
  usePageTitle('证书管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/certificates').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.certs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '证书', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '签发 CA', dataIndex: 'issuer' },
    { title: '有效期', dataIndex: 'validity' },
    { title: '指纹', dataIndex: 'fingerprint', render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '有效' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="证书管理（HTTPS / 签名）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无证书" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
