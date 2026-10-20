/** 健澜科技 jlmedaios - 合规审计（M264 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; item: string; standard: string; result: string; remediation: string; deadline: string }
export default function AuditCompliancePage() {
  usePageTitle('合规审计');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/audit/compliance').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.audits ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '审计项', dataIndex: 'item' },
    { title: '依据', dataIndex: 'standard', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '符合' ? 'green' : v === '部分符合' ? 'orange' : 'red'}>{v}</Tag> },
    { title: '整改建议', dataIndex: 'remediation' },
    { title: '截止', dataIndex: 'deadline' },
  ];
  return (
    <PageContainer title="合规审计（等保 2.0 / 三级评审）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无审计" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
