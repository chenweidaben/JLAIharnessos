/**
 * 健澜科技 jlmedaios - OA 审批中心（M139-A · 医院运营管理）
 *
 * 【医院运营管理】行政办公多级审批：请假 / 报销 / 采购 / 用印。
 *   流程固定三级流转、不可跳步：申请人 → 科室主任 → 分管院长 → 人事/财务。
 *
 * 交互：
 *   左侧「发起审批」选择类型、填写事由标题与正文 → POST /api/v1/oa/approvals；
 *   右侧审批中心列表 GET /api/v1/oa/approvals 拉取全部单据，
 *   逐单展示三级节点进度（科室主任 → 分管院长 → 人事/财务），
 *   待办节点可「通过 / 驳回」→ PUT /api/v1/oa/approvals/:id/approve。
 *
 * 视觉：深海蓝 VI（主色 #0A2A5E，辅色 #1E5BA8，浅底 #F4F7FB）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 */
import { Button, Card, Col, Input, message, Row, Select, Space, Tag, Timeline, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { get, post, put } from '../../../api/client';

const { Title, Text, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deepSea: '#0A2A5E',
  accent: '#1E5BA8',
  bg: '#F4F7FB',
  line: '#D6E0EE',
};

type ApprovalType = 'leave' | 'expense' | 'purchase' | 'seal';

const TYPE_LABEL: Record<ApprovalType, string> = {
  leave: '请假',
  expense: '报销',
  purchase: '采购',
  seal: '用印',
};

interface ApprovalStep {
  order: number;
  role: string;
  approverId: string | null;
  action: 'approve' | 'reject' | null;
  comment: string;
  actedAt: string | null;
}

interface Approval {
  id: string;
  applicantId: string;
  type: ApprovalType;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  currentStep: number;
  steps: ApprovalStep[];
  finalRole: 'hr' | 'finance';
  createdAt: string;
  updatedAt: string;
}

const STATUS_TAG: Record<Approval['status'], { color: string; label: string }> = {
  pending: { color: 'processing', label: '审批中' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function ApprovalsPage() {
  const [type, setType] = useState<ApprovalType>('leave');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [list, setList] = useState<Approval[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /** 拉取审批中心列表 */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await get<{ list: Approval[] }>('/api/v1/oa/approvals');
      setList(resp.list ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '审批列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** 发起审批 */
  const submit = async () => {
    if (!title.trim()) {
      message.warning('请填写审批标题');
      return;
    }
    setSubmitting(true);
    try {
      await post<{ approval: Approval }>('/api/v1/oa/approvals', {
        type,
        title: title.trim(),
        content,
      });
      message.success('已发起，进入多级审批流程（科室主任 → 分管院长 → 人事/财务）');
      setTitle('');
      setContent('');
      void refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '发起审批失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 处理当前节点一步 */
  const act = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      await put<{ approval: Approval }>(`/api/v1/oa/approvals/${approvalId}/approve`, {
        action,
        comment: action === 'approve' ? '同意' : '退回补充材料',
      });
      message.success(action === 'approve' ? '本节点已通过，流转下一节点' : '本节点已驳回');
      void refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '审批操作失败');
    }
  };

  return (
    <div style={{ padding: 24, background: VI.bg, minHeight: '100vh' }}>
      <Title level={3} style={{ color: VI.deepSea, marginBottom: 4 }}>
        OA 审批中心
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        【医院运营管理】请假 / 报销 / 采购 / 用印。多级流转、不可跳步：
        申请人 → 科室主任 → 分管院长 → 人事/财务。
      </Paragraph>

      <Row gutter={16}>
        {/* 发起审批 */}
        <Col xs={24} md={8}>
          <Card title="发起审批" style={{ borderTop: `3px solid ${VI.deepSea}` }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>审批类型：</Text>
                <Select<ApprovalType>
                  value={type}
                  style={{ width: '100%', marginTop: 6 }}
                  onChange={(v) => setType(v)}
                  options={(Object.keys(TYPE_LABEL) as ApprovalType[]).map((k) => ({
                    value: k,
                    label: TYPE_LABEL[k],
                  }))}
                />
              </div>
              <div>
                <Text strong>事由标题：</Text>
                <Input
                  placeholder="如：年休假申请 / 设备采购申请"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </div>
              <div>
                <Text strong>事由正文：</Text>
                <Input.TextArea
                  rows={4}
                  placeholder="补充说明（时间、金额、事由明细等）"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </div>
              <Button
                type="primary"
                block
                loading={submitting}
                onClick={submit}
                style={{ background: VI.deepSea }}
              >
                提交审批
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 审批中心列表 */}
        <Col xs={24} md={16}>
          <Card
            title={`审批单（${list.length}）`}
            loading={loading}
            style={{ borderTop: `3px solid ${VI.deepSea}` }}
            extra={<Button onClick={refresh}>刷新</Button>}
          >
            {list.length === 0 && (
              <Paragraph type="secondary" style={{ margin: 0 }}>
                暂无审批单，先在左侧发起一张。
              </Paragraph>
            )}
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {list.map((a) => {
                const st = STATUS_TAG[a.status];
                return (
                  <Card
                    key={a.id}
                    size="small"
                    style={{ border: `1px solid ${VI.line}` }}
                    title={
                      <Space>
                        <Tag color={VI.accent}>{TYPE_LABEL[a.type]}</Tag>
                        <Text strong>{a.title}</Text>
                        <Tag color={st.color}>{st.label}</Tag>
                      </Space>
                    }
                    extra={
                      a.status === 'pending' ? (
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => void act(a.id, 'approve')}
                            style={{ background: VI.deepSea }}
                          >
                            通过
                          </Button>
                          <Button size="small" danger onClick={() => void act(a.id, 'reject')}>
                            驳回
                          </Button>
                        </Space>
                      ) : null
                    }
                  >
                    {a.content && (
                      <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                        {a.content}
                      </Paragraph>
                    )}
                    <Timeline
                      items={a.steps.map((s, i) => ({
                        color:
                          s.action === 'reject'
                            ? 'red'
                            : s.action === 'approve'
                              ? 'green'
                              : i === a.currentStep
                                ? 'blue'
                                : 'gray',
                        children: (
                          <Space direction="vertical" size={0}>
                            <Text strong>
                              {s.role}
                              {i === a.currentStep && a.status === 'pending' ? '（待办）' : ''}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {s.action
                                ? `${s.action === 'approve' ? '通过' : '驳回'}${
                                    s.comment ? ` · ${s.comment}` : ''
                                  }${s.actedAt ? ` · ${s.actedAt.slice(0, 19).replace('T', ' ')}` : ''}`
                                : '未处理'}
                            </Text>
                          </Space>
                        ),
                      }))}
                    />
                  </Card>
                );
              })}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
