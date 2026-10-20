/** 健澜科技 jlmedaios - 电子签名（M262 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recordNo: string; signer: string; signTime: string; certSerial: string; hash: string }
export default function EmrSignPage() {
  usePageTitle('电子签名');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/sign').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.signs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病历号', dataIndex: 'recordNo' },
    { title: '签名人', dataIndex: 'signer' },
    { title: '签名时间', dataIndex: 'signTime' },
    { title: '证书序列号', dataIndex: 'certSerial', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '内容哈希', dataIndex: 'hash', render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
  ];
  return (
    <PageContainer title="电子签名记录（CA 证书 + 内容哈希）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无签名" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
