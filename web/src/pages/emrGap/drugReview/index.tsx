/**
 * 健澜科技 jlmedaios - 合理用药实时审查页（AI 第八剑客）
 * 级别 Tag：critical 红 / warning 橙 / info 蓝；抗菌药越级醒目 Alert。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, Row, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useDrugReviewStore } from '@/store/drugReviewStore';
import type { DrugReviewIssue, DrugReviewLevel } from '@/services/api/drugReview';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 问题级别配色：critical 红 / warning 橙 / info 蓝 */
const LEVEL_TAG: Record<DrugReviewLevel, { color: string; label: string }> = {
  critical: { color: 'red', label: '危急' },
  warning: { color: 'orange', label: '警告' },
  info: { color: 'blue', label: '提示' },
};

export default function DrugReviewPage() {
  const { visitId, result, loading, scanning, error, setVisitId, load, scan } = useDrugReviewStore();
  const { hasPermission } = usePermission();

  const issues = result?.issues ?? [];
  const criticalCount = issues.filter((i) => i.level === 'critical').length;
  const escalationCount = issues.filter((i) => i.category === '抗菌药物越级使用').length;

  const columns: ColumnsType<DrugReviewIssue> = [
    { title: '药品', dataIndex: 'drug', key: 'drug' },
    { title: '类别', dataIndex: 'category', key: 'category' },
    {
      title: '级别', dataIndex: 'level', key: 'level',
      render: (v: DrugReviewLevel) => {
        const t = LEVEL_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    { title: '建议', dataIndex: 'suggestion', key: 'suggestion' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>合理用药实时审查（AI 第八剑客）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        {result?.hasEscalation && (
          <Alert
            type="warning" showIcon style={{ marginBottom: 16 }}
            message="抗菌药物越级使用提醒"
            description="检测到抗菌药物越级医嘱（药品分级高于处方授权），请上级医师复核；特殊使用级须先经会诊审批后方可使用。"
          />
        )}

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
              <Button onClick={() => void load()}>实时读取</Button>
            </Col>
            <Col span={6}>
              {hasPermission('drug_review:view') && (
                <Button type="primary" loading={scanning} onClick={() => void scan()}>
                  开始实时审查
                </Button>
              )}
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="在院药品医嘱" value={result?.orderCount ?? '-'} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="问题总数" value={result?.issueCount ?? '-'} valueStyle={{ color: '#cf1322' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="危急（配伍禁忌）" value={criticalCount} valueStyle={{ color: '#cf1322' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="越级警告" value={escalationCount} valueStyle={{ color: '#d46b08' }} /></Card>
          </Col>
        </Row>

        <Card title="审查结果">
          <Table
            rowKey="rule" size="small" loading={loading} columns={columns} dataSource={issues}
            pagination={false}
            locale={{ emptyText: <Empty description="在院医嘱未发现用药问题" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
