/**
 * 健澜科技 jlmedaios - 日志审计（M747，升级自 M223 简易页）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useAuditLogM747Store } from '@/store/auditLogM747Store';
import {
  AUDIT_RESULT_META,
  type AuditLog,
} from '@/services/api/auditLogM747';

const buildColumns = (setDetail: (r: AuditLog) => void): ColumnsType<AuditLog> => [
  { title: '操作人', dataIndex: 'operator', width: 110 },
  { title: '操作时间', dataIndex: 'operatedAt', width: 170 },
  { title: '操作类型', dataIndex: 'action', width: 110 },
  { title: '操作对象', dataIndex: 'target', width: 160, ellipsis: true },
  { title: 'IP 地址', dataIndex: 'ip', width: 140 },
  {
    title: '结果',
    dataIndex: 'result',
    width: 100,
    render: (v: AuditLog['result']) => <Tag color={AUDIT_RESULT_META[v].color}>{AUDIT_RESULT_META[v].label}</Tag>,
  },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function AuditLogsPage() {
  usePageTitle('日志审计');
  const { items, loading, error, demo, load } = useAuditLogM747Store();
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="日志审计"
      description="操作人 / 操作时间 / 操作类型 / 操作对象 / IP 地址 / 结果"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`审计日志（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="审计日志详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="操作人">{detail.operator}</Descriptions.Item>
              <Descriptions.Item label="操作时间">{detail.operatedAt}</Descriptions.Item>
              <Descriptions.Item label="操作类型">{detail.action}</Descriptions.Item>
              <Descriptions.Item label="操作对象">{detail.target}</Descriptions.Item>
              <Descriptions.Item label="IP 地址">{detail.ip}</Descriptions.Item>
              <Descriptions.Item label="结果">
                <Tag color={AUDIT_RESULT_META[detail.result].color}>{AUDIT_RESULT_META[detail.result].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="操作内容" span={2}>{detail.content}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="请求参数" style={{ marginBottom: 16 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{detail.request}</pre>
            </Card>
            <Card size="small" title="响应结果">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{detail.response}</pre>
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
