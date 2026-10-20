/** 健澜科技 jlmedaios - 病历锁定历史（M318 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; mrn: string; lockedBy: string; lockTime: string; unlockedBy: string; unlockTime: string; reason: string }
export default function EmrLockHistoryPage() {
  usePageTitle('病历锁定历史');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/lock-history').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.history ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病历号', dataIndex: 'mrn', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '锁定人', dataIndex: 'lockedBy' },
    { title: '锁定时间', dataIndex: 'lockTime' },
    { title: '解锁人', dataIndex: 'unlockedBy' },
    { title: '解锁时间', dataIndex: 'unlockTime', render: (v: string) => v || <Tag color="orange">未解锁</Tag> },
    { title: '原因', dataIndex: 'reason' },
  ];
  return (
    <PageContainer title="病历锁定历史">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}