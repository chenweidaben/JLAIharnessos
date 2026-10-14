/**
 * 健澜科技 jlmedaios - 临床路径变异管理页（213）
 *
 * 变异率统计卡（变异率/变异例数/总入径例数）+ 变异原因列表 + 就诊级变异登记。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Form, Input, Layout, Row, Select, Space,
  Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { usePathwayVarianceStore } from '@/store/pathwayVarianceStore';
import type { PathwayVarianceItem, VarianceType } from '@/services/api/pathwayVariance';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 变异类型配色：negative 负向红 / positive 正向绿 / neutral 一般蓝 */
const TYPE_TAG: Record<string, { color: string; label: string }> = {
  negative: { color: 'red', label: '负向变异' },
  positive: { color: 'green', label: '正向变异' },
  neutral: { color: 'blue', label: '一般变异' },
};

/** 变异率展示为百分比（0~1 -> xx.x%） */
function formatRate(rate: number | undefined): string {
  if (rate === undefined || rate === null || Number.isNaN(rate)) return '-';
  return `${(rate * 100).toFixed(1)}%`;
}

export default function PathwayVariancePage() {
  const { visitId, result, loading, submitting, error, setVisitId, load, record } =
    usePathwayVarianceStore();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission('pathway:read');

  const records = result?.records ?? [];

  const columns: ColumnsType<PathwayVarianceItem> = [
    {
      title: '登记时间', dataIndex: 'recordedAt', key: 'recordedAt', width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '类型', dataIndex: 'varianceType', key: 'varianceType', width: 110,
      render: (v: string) => {
        const t = TYPE_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    { title: '变异原因', dataIndex: 'reason', key: 'reason' },
    { title: '就诊号', dataIndex: 'visitId', key: 'visitId', width: 280, ellipsis: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>临床路径变异管理</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={10}>
              <Input
                placeholder="就诊号 visitId（可空，空为全院口径）"
                value={visitId}
                onChange={(e) => setVisitId(e.target.value)}
                onPressEnter={() => void load()}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Button type="primary" loading={loading} onClick={() => void load()}>
                查询
              </Button>
            </Col>
            <Col span={10}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                变异率 = 变异例数 / 总入径例数
              </Text>
            </Col>
          </Row>
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="变异率"
                value={formatRate(result?.varianceRate)}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="变异例数" value={result?.variedCount ?? '-'} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="总入径例数" value={result?.enrolledCount ?? '-'} />
            </Card>
          </Col>
        </Row>

        {canEdit && (
          <Card title="登记变异" style={{ marginBottom: 16 }}>
            <Form
              layout="inline"
              onFinish={async (v: { visitId: string; pathwayId?: string; varianceType: VarianceType; reason: string }) => {
                await record({
                  visitId: v.visitId.trim(),
                  pathwayId: v.pathwayId?.trim() || null,
                  varianceType: v.varianceType,
                  reason: v.reason.trim(),
                });
              }}
            >
              <Space size={12} wrap>
                <Form.Item
                  name="visitId"
                  label="就诊号"
                  rules={[{ required: true, message: '请输入就诊号' }]}
                  initialValue={visitId}
                >
                  <Input style={{ width: 260 }} placeholder="visitId" allowClear />
                </Form.Item>
                <Form.Item name="pathwayId" label="路径ID" tooltip="可空">
                  <Input style={{ width: 220 }} placeholder="pathwayId（可空）" allowClear />
                </Form.Item>
                <Form.Item
                  name="varianceType"
                  label="类型"
                  rules={[{ required: true, message: '请选择变异类型' }]}
                  initialValue="neutral"
                >
                  <Select style={{ width: 140 }} options={[
                    { value: 'negative', label: '负向变异' },
                    { value: 'positive', label: '正向变异' },
                    { value: 'neutral', label: '一般变异' },
                  ]} />
                </Form.Item>
                <Form.Item
                  name="reason"
                  label="变异原因"
                  rules={[{ required: true, message: '请填写变异原因' }]}
                >
                  <Input style={{ width: 320 }} placeholder="如：病情变化、并发症、患者意愿…" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    登记
                  </Button>
                </Form.Item>
              </Space>
            </Form>
          </Card>
        )}

        <Card title="变异原因列表">
          <Table
            rowKey="id" size="small" loading={loading} columns={columns} dataSource={records}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="暂无变异记录" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
