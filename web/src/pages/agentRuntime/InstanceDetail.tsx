/**
 * 健澜科技 jlmedaios - 运行实例详情 / 结果回放（M4-C）
 *
 * 展示实例输入、节点执行记录（状态/尝试/耗时/输出）、最终输出与错误，
 * 并支持取消运行中实例。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useAgentRuntimeStore } from '@/store/agentRuntimeStore';
import type { NodeRecordView, WorkflowInstanceView } from '@/types/agentRuntime';

const NODE_COLOR: Record<string, string> = {
  completed: 'green',
  running: 'processing',
  failed: 'red',
  skipped: 'default',
  waiting: 'gold',
  cancelled: 'default',
};

function fmtDuration(ms: number | null): string {
  if (ms == null) return '-';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/** 以可读 JSON 展示（限制大小） */
function JsonBlock({ value, testid }: { value: unknown; testid: string }) {
  if (value == null) return <Typography.Text type="secondary">无</Typography.Text>;
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <pre
      data-testid={testid}
      className="max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs"
    >
      {text}
    </pre>
  );
}

export default function InstanceDetail() {
  const { detail, running, cancelInstance } = useAgentRuntimeStore();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  if (!detail) {
    return (
      <Card size="small" title="实例详情 / 结果回放">
        <Empty description="点击上方实例查看详情，或运行一个智能体" />
      </Card>
    );
  }

  const instance: WorkflowInstanceView = detail.instance;
  const nodes: NodeRecordView[] = detail.nodes;
  const isLive = instance.state === 'running' || instance.state === 'paused' || instance.state === 'waiting_human';

  const onCancel = () => {
    Modal.confirm({
      title: '取消该运行实例？',
      content: '取消后工作流停止，已产生的节点记录将保留。',
      okText: '取消实例',
      okButtonProps: { danger: true },
      cancelText: '返回',
      onOk: () => cancelInstance(instance.id, '用户在运行台取消'),
    });
  };

  const nodeColumns = [
    {
      title: '节点',
      dataIndex: 'nodeId',
      key: 'nodeId',
      render: (v: string, r: NodeRecordView) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>{r.nodeType}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      render: (s: string) => <Tag color={NODE_COLOR[s] ?? 'default'}>{s}</Tag>,
    },
    { title: '尝试', dataIndex: 'attempts', key: 'attempts' },
    { title: '耗时', dataIndex: 'durationMs', key: 'durationMs', render: (v: number | null) => fmtDuration(v) },
    {
      title: '输出 / 错误',
      key: 'io',
      render: (_: unknown, r: NodeRecordView) => {
        const hasData = r.output != null || r.errorMessage != null;
        if (!hasData) return <Typography.Text type="secondary">-</Typography.Text>;
        return (
          <Button
            type="link"
            size="small"
            onClick={() => setExpandedNode(expandedNode === r.nodeId ? null : r.nodeId)}
          >
            {expandedNode === r.nodeId ? '收起' : '查看'}
          </Button>
        );
      },
    },
  ];

  return (
    <Card
      size="small"
      title="实例详情 / 结果回放"
      data-testid="instance-detail-card"
      extra={
        isLive ? (
          <Button danger size="small" loading={running} onClick={onCancel}>
            取消运行
          </Button>
        ) : null
      }
    >
      <Space direction="vertical" className="w-full" size="small">
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="实例号">{instance.instanceNo}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={instance.state === 'completed' ? 'green' : instance.state === 'failed' ? 'red' : 'default'}>
              {instance.state}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="智能体">{instance.agentId}</Descriptions.Item>
          <Descriptions.Item label="版本">{instance.agentVersion ? `v${instance.agentVersion}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="触发方式">{instance.triggerType ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Token(入/出)">{instance.tokensIn}/{instance.tokensOut}</Descriptions.Item>
          <Descriptions.Item label="traceId" span={2}>
            <Typography.Text code style={{ fontSize: 11 }}>{instance.traceId}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        {instance.errorMessage && (
          <Alert
            type="error"
            showIcon
            data-testid="instance-error"
            message={`${instance.errorCode ?? 'ERROR'}：${instance.errorMessage}`}
          />
        )}

        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>节点执行记录</Typography.Text>
          <Table<NodeRecordView>
            size="small"
            rowKey="id"
            columns={nodeColumns}
            dataSource={nodes}
            pagination={false}
            expandable={{
              expandedRowKeys: expandedNode ? nodes.filter((n) => n.nodeId === expandedNode).map((n) => n.id) : [],
              expandedRowRender: (r) => (
                <Space direction="vertical" className="w-full" size="small">
                  {r.errorMessage && <Alert type="error" showIcon message={r.errorMessage} />}
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>输出</Typography.Text>
                    <JsonBlock value={r.output} testid="node-output" />
                  </div>
                </Space>
              ),
              showExpandColumn: false,
            }}
          />
        </div>

        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>输入</Typography.Text>
          <JsonBlock value={instance.input} testid="instance-input" />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>最终输出（结果回放）</Typography.Text>
          <JsonBlock value={instance.output} testid="instance-output" />
        </div>
      </Space>
    </Card>
  );
}
