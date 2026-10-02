/**
 * 健澜科技 jlmedaios - 人工工单详情与审核（M4-D）
 *
 * 审核人查看工单说明与（脱敏）审核上下文，认领后填写意见，批准/驳回；
 * 批准/驳回均需显式签名（记录审核人），杜绝静默通过。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useHumanTaskStore } from '@/store/humanTaskStore';

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) return <Typography.Text type="secondary">无</Typography.Text>;
  return (
    <pre className="max-h-64 overflow-auto rounded bg-ink-bg/40 p-2 text-xs" data-testid="ht-review-data">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function TaskDetail() {
  const {
    detail,
    acting,
    claimTask,
    resolveTask,
  } = useHumanTaskStore();
  const [comment, setComment] = useState('');

  useEffect(() => {
    setComment('');
  }, [detail?.task.id]);

  if (!detail) {
    return (
      <Card size="small" data-testid="ht-detail-empty">
        <Empty description="请选择左侧工单查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const { task, instance } = detail;
  const open = task.status === 'pending' || task.status === 'claimed';
  const isResolved = task.status === 'resolved';

  const doResolve = async (approved: boolean) => {
    await resolveTask(task.id, { approved, comment: comment.trim() || undefined });
  };

  return (
    <Card
      size="small"
      data-testid="ht-task-detail"
      title={
        <Space wrap>
          <span>{task.title}</span>
          <Tag>{task.taskNo}</Tag>
        </Space>
      }
    >
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="触发节点" span={1}>{task.nodeId}</Descriptions.Item>
        <Descriptions.Item label="状态" span={1}>
          <Tag color={open ? 'orange' : isResolved ? 'green' : 'default'}>{task.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="审核角色" span={1}>{task.assigneeRoles.join(', ') || '—'}</Descriptions.Item>
        <Descriptions.Item label="创建时间" span={1}>
          {new Date(task.createdAt).toLocaleString('zh-CN', { hour12: false })}
        </Descriptions.Item>
        <Descriptions.Item label="工单说明" span={2}>
          {task.instructions || '—'}
        </Descriptions.Item>
        {instance && (
          <Descriptions.Item label="关联实例" span={2}>
            {instance.instanceNo} · {instance.agentId} · <Tag>{instance.state}</Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      <div className="mt-3">
        <Typography.Text strong>审核上下文（脱敏）</Typography.Text>
        <div className="mt-1">
          <JsonBlock value={task.reviewData} />
        </div>
      </div>

      {open && (
        <div className="mt-3" data-testid="ht-review-form">
          <Typography.Text strong>审核意见</Typography.Text>
          <Input.TextArea
            className="mt-1"
            rows={2}
            placeholder="请填写审核意见（驳回时建议说明原因）"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Space className="mt-2">
            {task.status === 'pending' && (
              <Button data-testid="ht-claim-btn" loading={acting} onClick={() => void claimTask(task.id)}>
                认领
              </Button>
            )}
            <Button
              type="primary"
              data-testid="ht-approve-btn"
              loading={acting}
              onClick={() => void doResolve(true)}
            >
              批准并签名
            </Button>
            <Button
              danger
              data-testid="ht-reject-btn"
              loading={acting}
              onClick={() => void doResolve(false)}
            >
              驳回
            </Button>
          </Space>
        </div>
      )}

      {isResolved && task.resolution && (
        <Alert
          className="mt-3"
          data-testid="ht-resolution"
          type={task.resolution.approved ? 'success' : 'warning'}
          showIcon
          message={task.resolution.approved ? '已批准' : '已驳回'}
          description={
            <div>
              <div>审核人：{task.resolution.reviewerId}</div>
              {task.resolution.comment && <div>意见：{task.resolution.comment}</div>}
              {task.resolvedAt && (
                <div>处理时间：{new Date(task.resolvedAt).toLocaleString('zh-CN', { hour12: false })}</div>
              )}
            </div>
          }
        />
      )}
    </Card>
  );
}
