/** 健澜科技 jlmedaios - 日志归档（M269 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { logType: string; retentionDays: number; storage: string; compression: string }
export default function SecurityLogArchivePage() {
  usePageTitle('日志归档');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/log-archive').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.archives ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '日志类型', dataIndex: 'logType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '保留天数', dataIndex: 'retentionDays', render: (v: number) => `${v} 天` },
    { title: '存储', dataIndex: 'storage' },
    { title: '压缩', dataIndex: 'compression' },
  ];
  return (
    <PageContainer title="日志归档策略">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="logType" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无配置" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
