/**
 * 健澜科技 jlmedaios - 操作审计日志（M223 对接真实 API）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Layout, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePageTitle } from '@/hooks';

const { Content } = Layout;
const { Title } = Typography;

interface LogRow {
  username: string;
  action: string;
  module: string;
  time: string;
  ip: string;
  result: string;
}

export default function AuditLogsPage() {
  usePageTitle('操作审计日志');
  const [list, setList] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/security/operation-logs')
      .then((r) => r.json())
      .then((j) => {
        if (alive) setList((j.data?.logs ?? []) as LogRow[]);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const columns: ColumnsType<LogRow> = [
    { title: '用户', dataIndex: 'username' },
    { title: '操作', dataIndex: 'action', render: (a: string) => <Tag color="blue">{a}</Tag> },
    { title: '模块', dataIndex: 'module' },
    { title: '时间', dataIndex: 'time' },
    { title: 'IP', dataIndex: 'ip' },
    {
      title: '结果',
      dataIndex: 'result',
      render: (r: string) => <Tag color={r === '成功' ? 'green' : 'red'}>{r}</Tag>,
    },
  ];

  return (
    <Layout style={{ background: '#f5f7fa' }}>
      <Content style={{ padding: 24 }}>
        <Title level={3} style={{ color: '#0A2540' }}>操作审计日志</Title>
        <Spin spinning={loading}>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          <Card>
            <Table<LogRow>
              rowKey={(r) => `${r.username}-${r.time}`}
              columns={columns}
              dataSource={list}
              locale={{ emptyText: <Empty description="暂无日志" /> }}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
