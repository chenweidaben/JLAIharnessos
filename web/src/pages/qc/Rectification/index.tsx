/**
 * 健澜科技 jlmedaios - 质控整改闭环看板（215）
 *
 * issue → 整改任务 → 复核关闭：四列看板（open 待整改 / fixed 已整改待复核 /
 * reviewed 复核通过 / closed 已关闭），卡片上点「流转按钮」按状态机前推一步。
 * 顶部可由质控 issue 新建一条整改任务。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Empty, Form, Input, Layout, Row, Space, Tag, Typography,
} from 'antd';
import { usePermission } from '@/router/guards';
import { useQcRectificationStore } from '@/store/qcRectificationStore';
import {
  BOARD_COLUMNS, NEXT_ACTION_LABEL, type QcRectification, QcRectificationStatus,
} from '@/types/qcRectification';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function shortId(v: string | null): string {
  return v ? v.slice(0, 8) : '—';
}

export default function QcRectificationBoardPage() {
  const { records, loading, acting, error, load, create, advance } = useQcRectificationStore();
  usePermission();

  const [issueId, setIssueId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => { void load(); }, [load]);

  const onCreate = async () => {
    await create({
      issueId: issueId || undefined,
      assigneeId: assigneeId || undefined,
      note: note || undefined,
    });
    setIssueId(''); setAssigneeId(''); setNote('');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>质控整改闭环看板</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="下发整改任务（由质控 issue）" size="small" style={{ marginBottom: 16 }}>
          <Form layout="inline">
            <Form.Item label="质控 issue ID">
              <Input style={{ width: 220 }} value={issueId}
                onChange={(e) => setIssueId(e.target.value)} placeholder="issue_id" />
            </Form.Item>
            <Form.Item label="整改责任人 ID">
              <Input style={{ width: 200 }} value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)} placeholder="assignee_id" />
            </Form.Item>
            <Form.Item label="备注">
              <Input style={{ width: 260 }} value={note}
                onChange={(e) => setNote(e.target.value)} placeholder="整改要求 / 说明" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" loading={acting} onClick={onCreate}>下发整改</Button>
            </Form.Item>
          </Form>
        </Card>

        <Row gutter={16}>
          {BOARD_COLUMNS.map((col) => {
            const cards = records.filter((r) => r.status === col.value);
            return (
              <Col key={col.value} span={6}>
                <Card
                  size="small"
                  title={<Space><Tag color={col.color}>{col.label}</Tag><Text type="secondary">{cards.length}</Text></Space>}
                  loading={loading}
                  styles={{ body: { minHeight: 360, background: '#fafafa' } }}
                >
                  {cards.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无" /> : (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {cards.map((c) => (
                        <RectiCard key={c.id} card={c} acting={acting}
                          onAdvance={() => advance(c.id)} />
                      ))}
                    </Space>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Content>
    </Layout>
  );
}

function RectiCard({ card, acting, onAdvance }: {
  card: QcRectification;
  acting: boolean;
  onAdvance: () => void;
}) {
  const terminal = card.status === 'closed';
  return (
    <Card size="small" variant="outlined">
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Text strong>任务 {shortId(card.id)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(card.createdAt).toLocaleDateString()}
          </Text>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>issue：{shortId(card.issueId)}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>责任人：{shortId(card.assigneeId)}</Text>
        {card.note && <Text style={{ fontSize: 12 }}>{card.note}</Text>}
        {terminal
          ? <Tag color="success">已关闭{card.closedAt ? ` · ${new Date(card.closedAt).toLocaleDateString()}` : ''}</Tag>
          : <Button size="small" type="link" loading={acting} onClick={onAdvance}>
              {NEXT_ACTION_LABEL[card.status as QcRectificationStatus]} →
            </Button>}
      </Space>
    </Card>
  );
}
