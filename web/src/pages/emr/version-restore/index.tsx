/** 健澜科技 jlmedaios - 病历版本恢复（M273 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; medicalRecordNo: string; restoreVersion: string; operator: string; operateTime: string; approval: string }
export default function EmrVersionRestorePage() {
  usePageTitle('病历版本恢复');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/version-restore').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.restores ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '病历号', dataIndex: 'medicalRecordNo' },
    { title: '恢复至版本', dataIndex: 'restoreVersion', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '操作人', dataIndex: 'operator' },
    { title: '操作时间', dataIndex: 'operateTime' },
    { title: '审批', dataIndex: 'approval', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="病历版本恢复记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无恢复记录" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
