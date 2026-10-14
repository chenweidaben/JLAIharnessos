/**
 * 健澜科技 jlmedaios - 病历终末质控评分页（M90-B）
 * 甲级绿 / 乙级蓝 / 丙级红 大 Tag + 总分 + 问题清单 Table。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, Row, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useTerminalQcStore } from '@/store/terminalQcStore';
import type { TerminalQcIssue, TerminalGrade } from '@/services/api/terminalQc';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 终末评级配色：甲级绿 / 乙级蓝 / 丙级红 */
const GRADE_TAG: Record<TerminalGrade, { color: string; label: string }> = {
  甲级: { color: 'green', label: '甲级' },
  乙级: { color: 'blue', label: '乙级' },
  丙级: { color: 'red', label: '丙级' },
};

const SEVERITY_TAG: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: '严重' },
  warning: { color: 'orange', label: '警告' },
  info: { color: 'blue', label: '提示' },
};

export default function TerminalQcPage() {
  const { visitId, records, loading, scanning, error, setVisitId, load, scan } = useTerminalQcStore();
  const { hasPermission } = usePermission();

  // records 按 created_at 倒序，首条即最新一次评分
  const latest = records[0];
  const issues = latest?.issues ?? [];
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const grade = latest?.grade ?? null;

  const columns: ColumnsType<TerminalQcIssue> = [
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
      <Header><Title level={4} style={{ color: '#fff' }}>病历终末质控评分（M90-B）</Title></Header>
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
              {hasPermission('terminal_qc:view') && (
                <Button type="primary" loading={scanning} onClick={() => void scan()}>
                  开始终末评分
                </Button>
              )}
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card title="终末评级">
              {grade ? (
                <Tag color={GRADE_TAG[grade].color} style={{ fontSize: 20, padding: '4px 16px' }}>
                  {GRADE_TAG[grade].label}
                </Tag>
              ) : (
                <span style={{ color: '#8c8c8c' }}>-</span>
              )}
            </Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="总分" value={latest?.score ?? '-'} /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="严重问题" value={errorCount} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="历史评分次数" value={records.length} /></Card>
          </Col>
        </Row>

        <Card title="最新评分问题清单">
          <Table
            rowKey="rule" size="small" loading={loading} columns={columns} dataSource={issues}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无问题，病历质量达标" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
