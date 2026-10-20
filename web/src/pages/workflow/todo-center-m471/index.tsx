/**
 * 健澜科技 jlmedaios - 医生工作台待办中心（M471）
 *
 * 路由：/workflow/todo-center
 * 左列：待办列表（按优先级染色 + 状态 Tag + 到期时间）
 * 中列：审批流时间线（ApprovalNode 节点状态）
 * 右列：角色交接 + 活动日志
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, type ReactElement } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { TodoItem } from '@/services/api/workflow';
import { useTodoCenterStore } from '@/store/todoCenterStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
} as const;

const PRIORITY_META: Record<TodoItem['priority'], { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
};

const STATUS_META: Record<TodoItem['status'], { color: string; label: string }> = {
  pending: { color: 'default', label: '待处理' },
  processing: { color: 'processing', label: '处理中' },
  done: { color: 'success', label: '已完成' },
};

const APPROVAL_STATUS_META: Record<string, { color: string; label: string; icon: ReactElement }> = {
  approved: { color: 'green', label: '已通过', icon: <CheckCircleOutlined /> },
  rejected: { color: 'red', label: '已驳回', icon: <ExclamationCircleOutlined /> },
  pending: { color: 'blue', label: '待审批', icon: <ClockCircleOutlined /> },
  skipped: { color: 'default', label: '已跳过', icon: <SyncOutlined rotate={90} /> },
};

export default function WorkflowTodoCenterM471Page() {
  usePageTitle('医生工作台待办中心');
  const { todos, approvalChain, handoffs, activities, loading, error, demo, load } =
    useTodoCenterStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && todos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载待办中心…" />
      </div>
    );
  }

  const pendingCount = todos.filter((t) => t.status !== 'done').length;
  const highCount = todos.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const approvedCount = approvalChain.filter((n) => n.status === 'approved').length;

  return (
    <PageContainer
      title="医生工作台待办中心"
      description="聚合角色待办 / 审批流 / 角色交接 / 活动日志（M470 后端能力前端落地）"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={error}
          action={
            <Button size="small" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /workflow/* 接入后自动切换为真实待办）"
        />
      )}

      {/* 顶部 KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.navy}` }}>
            <Statistic title="待办总数" value={pendingCount} suffix="条" valueStyle={{ color: JL.navy }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid #cf1322` }}>
            <Statistic title="高优先级" value={highCount} suffix="条" valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="审批节点通过"
              value={approvedCount}
              suffix={`/ ${approvalChain.length}`}
              valueStyle={{ color: JL.blue }}
            />
            <Progress
              percent={approvalChain.length ? Math.round((approvedCount / approvalChain.length) * 100) : 0}
              size="small"
              strokeColor={JL.blue}
              showInfo={false}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 左列：待办列表 */}
        <Col xs={24} xl={10}>
          <Card
            title={
              <span style={{ color: JL.navy, fontWeight: 600 }}>
                我的待办
                <Badge count={pendingCount} style={{ marginLeft: 8, backgroundColor: '#cf1322' }} />
              </span>
            }
            style={{ borderTop: `3px solid ${JL.navy}` }}
          >
            <List
              dataSource={todos}
              renderItem={(t) => {
                const p = PRIORITY_META[t.priority];
                const s = STATUS_META[t.status];
                return (
                  <List.Item key={t.id}>
                    <List.Item.Meta
                      avatar={
                        <Badge color={p.color} dot>
                          <Avatar style={{ backgroundColor: JL.accent }}>
                            {t.assignee?.slice(0, 1) ?? '医'}
                          </Avatar>
                        </Badge>
                      }
                      title={
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag color={p.color}>{p.label}</Tag>
                          <Text strong style={{ color: JL.navy }}>
                            {t.title}
                          </Text>
                          <Tag color={s.color}>{s.label}</Tag>
                          {t.demo && <Tag>演示</Tag>}
                        </div>
                      }
                      description={
                        <div className="mt-1">
                          {t.patient && (
                            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                              {t.patient}
                            </Text>
                          )}
                          {t.dept && (
                            <Tag color="blue" style={{ fontSize: 11 }}>
                              {t.dept}
                            </Tag>
                          )}
                          {t.dueAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              · 截止 {t.dueAt}
                            </Text>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        {/* 中列：审批流时间线 */}
        <Col xs={24} xl={7}>
          <Card
            title={
              <span style={{ color: JL.navy, fontWeight: 600 }}>审批流链路</span>
            }
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Timeline
              items={approvalChain.map((n) => {
                const meta = APPROVAL_STATUS_META[n.status] ?? APPROVAL_STATUS_META.pending;
                return {
                  color: meta.color,
                  dot: meta.icon,
                  children: (
                    <div>
                      <div className="flex items-center gap-2">
                        <Text strong style={{ color: JL.navy }}>
                          步骤{n.step} · {n.name}
                        </Text>
                        <Tag color={meta.color}>{meta.label}</Tag>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          审批人：{n.approver}
                          {n.actedAt ? ` · ${n.actedAt}` : ''}
                        </Text>
                      </div>
                      {n.comment && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          意见：{n.comment}
                        </Text>
                      )}
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </Col>

        {/* 右列：角色交接 + 活动日志 */}
        <Col xs={24} xl={7}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>角色交接</span>}
            style={{ borderTop: `3px solid ${JL.accent}`, marginBottom: 16 }}
          >
            <List
              size="small"
              dataSource={handoffs}
              renderItem={(h) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div className="flex items-center gap-2">
                        <Text strong style={{ color: JL.navy }}>
                          {h.fromUser}（{h.fromRole}）
                        </Text>
                        <Text type="secondary">→</Text>
                        <Text strong style={{ color: JL.blue }}>
                          {h.toUser}（{h.toRole}）
                        </Text>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {h.taskRef} · {h.handoffAt}
                        </Text>
                        {h.note && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              备注：{h.note}
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>活动日志</span>}
            style={{ borderTop: `3px solid #722ed1` }}
          >
            <Timeline
              items={activities.map((l) => ({
                color: JL.accent,
                children: (
                  <div>
                    <div className="flex items-center gap-2">
                      <Text strong style={{ color: JL.navy }}>
                        {l.actor}
                      </Text>
                      <Text style={{ fontSize: 13 }}>{l.action}</Text>
                      {l.target && <Tag color="blue" style={{ fontSize: 11 }}>{l.target}</Tag>}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {l.happenedAt}
                      {l.detail ? ` · ${l.detail}` : ''}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
