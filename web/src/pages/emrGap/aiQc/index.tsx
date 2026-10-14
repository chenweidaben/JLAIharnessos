/**
 * 健澜科技 jlmedaios - AI病历质控页（M90-A）
 * 质控评分大数字（<60 红 / 60-80 橙 / >80 绿）+ 最新扫描问题清单 Table。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, Row, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useAiNoteQcStore } from '@/store/aiNoteQcStore';
import type { AiNoteQcIssue } from '@/services/api/aiNoteQc';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 评分配色：<60 红 / 60-80 橙 / >80 绿 */
function scoreColor(score: number | null): string {
  if (score == null) return '#8c8c8c';
  if (score < 60) return '#cf1322';
  if (score <= 80) return '#d46b08';
  return '#3f8600';
}

const SEVERITY_TAG: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: '严重' },
  warning: { color: 'orange', label: '警告' },
  info: { color: 'blue', label: '提示' },
};

export default function AiQcPage() {
  const { visitId, records, loading, scanning, error, setVisitId, load, scan } = useAiNoteQcStore();
  const { hasPermission } = usePermission();

  // records 按 created_at 倒序，首条即最新一次扫描
  const latest = records[0];
  const issues = latest?.issues ?? [];
  const errorCount = issues.filter((i) => i.severity === 'error').length;

  const columns: ColumnsType<AiNoteQcIssue> = [
    { title: '规则', dataIndex: 'rule', key: 'rule' },
    {
      title: '级别', dataIndex: 'severity', key: 'severity',
      render: (v: string) => {
        const t = SEVERITY_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    { title: '问题描述', dataIndex: 'message', key: 'message' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>AI病历质控（M90-A）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={10}>
              <Input
                placeholder="请输入就诊号 visitId"
                value={visitId}
                onChange={(e) => setVisitId(e.target.value)}
                onPressEnter={() => void load()}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Button onClick={() => void load()}>查询历史</Button>
            </Col>
            <Col span={6}>
              {hasPermission('ai_note_qc:view') && (
                <Button type="primary" loading={scanning} onClick={() => void scan()}>
                  开始扫描
                </Button>
              )}
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="最新质控评分"
                value={latest?.score ?? '-'}
                valueStyle={{ color: scoreColor(latest?.score ?? null) }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="问题总数" value={issues.length} /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="严重问题" value={errorCount} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="历史扫描次数" value={records.length} /></Card>
          </Col>
        </Row>

        <Card title="最新扫描问题清单">
          <Table
            rowKey="rule" size="small" loading={loading} columns={columns} dataSource={issues}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无问题，病历质量良好" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
