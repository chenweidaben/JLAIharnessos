/**
 * 健澜科技 jlmedaios - 医保控费智能提醒面板（M121-D）
 *
 * 医生输入处方 ID 后，展示处方提交前的「事前医保合规扫描」结果：
 *  - 顶部合规结论条（status + summary + 脱敏患者名）；
 *  - 医保支付限制 / 历史违规 / 目录内替代方案 三区块。
 *
 * 三态完备：loading（Spin）、error（Alert + 重试）、empty（未查询 / 无数据）。
 * 视觉：深海蓝 VI（主色 #0B3D6B，辅底 #E8F0F8）。
 *
 * 定位：事前提醒，不阻断处方；最终处方与支付由医生 / 医保经办决定。
 * 数据安全要求：依据宪法，全程只读、患者姓名脱敏、不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, List, Row, Spin, Tag, Typography, message,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA = '#0B3D6B';
const DEEP_SEA_BG = '#E8F0F8';

type ComplianceLevel = 'info' | 'warning' | 'critical';

interface ComplianceCheck {
  status: 'pass' | 'warning' | 'blocked';
  riskLevel: ComplianceLevel;
  hitCount: number;
  summary: string;
}
interface InsuranceLimit {
  rule: string; itemCode: string; itemName: string; level: ComplianceLevel; detail: string; suggestion: string;
}
interface HistoryViolationItem {
  date: string; type: string; detail: string; amount: number | null; repeated: boolean;
}
interface AlternativeItem {
  itemCode: string; itemName: string; category: string; reason: string; estimatedSaving: number;
}

interface InsuranceComplianceView {
  complianceCheck: ComplianceCheck;
  insuranceLimits: InsuranceLimit[];
  historyViolations: HistoryViolationItem[];
  alternatives: AlternativeItem[];
  patientName: string;
  doctorId: string;
  prescriptionId: string;
  demo: boolean;
  updatedAt: string;
}

const LEVEL_TAG: Record<ComplianceLevel, { color: string; label: string }> = {
  critical: { color: 'red', label: '不予支付' },
  warning: { color: 'orange', label: '需核对' },
  info: { color: 'blue', label: '告知' },
};

const STATUS_TAG: Record<ComplianceCheck['status'], { color: string; label: string }> = {
  blocked: { color: 'red', label: '需调整' },
  warning: { color: 'orange', label: '有提醒' },
  pass: { color: 'green', label: '合规' },
};

/** 调用 BFF：GET /api/v1/assistant/insurance?prescriptionId=xxx（baseURL 已含前缀） */
function fetchInsurance(prescriptionId: string): Promise<InsuranceComplianceView> {
  return get<InsuranceComplianceView>('/assistant/insurance', { prescriptionId });
}

export default function InsuranceAssistantPage() {
  const [prescriptionId, setPrescriptionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsuranceComplianceView | null>(null);
  const [queried, setQueried] = useState(false);

  const runQuery = async (id: string) => {
    const pid = id.trim();
    if (!pid) { message.warning('请输入处方 ID'); return; }
    setLoading(true);
    setError(null);
    setQueried(true);
    try {
      const res = await fetchInsurance(pid);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const status = data ? STATUS_TAG[data.complianceCheck.status] : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>医保控费智能提醒</Title>
      </Header>
      <Content style={{ padding: 24, background: DEEP_SEA_BG }}>
        {/* 查询条 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="输入处方 ID，如 rx_xxx"
            enterButton={<SearchOutlined />}
            size="large"
            value={prescriptionId}
            onChange={(e) => setPrescriptionId(e.target.value)}
            onSearch={runQuery}
            loading={loading}
            allowClear
          />
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" tip="正在扫描处方医保合规性…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error" showIcon
            message="医保合规数据加载失败"
            description={error}
            action={<Button size="small" onClick={() => void runQuery(prescriptionId)}>重试</Button>}
          />
        )}

        {/* empty 态：未查询 / 无数据 */}
        {!loading && !error && !data && (
          <Card>
            <Empty description={queried ? '该处方无医保合规数据' : '输入处方 ID，开始提交前医保合规扫描'} />
          </Card>
        )}

        {/* 数据态 */}
        {!loading && !error && data && status && (
          <>
            {/* 合规结论条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Title level={5} style={{ marginBottom: 4 }}>
                    处方 {data.prescriptionId}
                    <Tag color={status.color} style={{ marginLeft: 12 }}>{status.label}</Tag>
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.complianceCheck.summary}</Paragraph>
                </Col>
                <Col>
                  <Text type="secondary">
                    患者 {data.patientName} · 命中 {data.complianceCheck.hitCount} 项
                  </Text>
                </Col>
              </Row>
            </Card>

            <Row gutter={16}>
              {/* 医保支付限制 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="医保支付限制" size="small">
                  {data.insuranceLimits.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未命中医保支付限制" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.insuranceLimits}
                      renderItem={(item) => (
                        <List.Item>
                          <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                          <div>
                            <Text strong>{item.itemName}</Text>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.detail}</Paragraph>
                            <Text type="warning">建议：{item.suggestion}</Text>
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* 历史违规 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="患者近期违规记录" size="small">
                  {data.historyViolations.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无近期违规记录" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.historyViolations}
                      renderItem={(item) => (
                        <List.Item>
                          <Text type="secondary">{item.date}</Text>
                          {item.repeated && <Tag color="red" style={{ marginLeft: 8 }}>重复违规</Tag>}
                          <div>
                            <Text>{item.detail}</Text>
                            {item.amount != null && (
                              <Paragraph type="secondary" style={{ marginBottom: 0 }}>涉及金额 {item.amount} 元</Paragraph>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* 替代方案 */}
              <Col span={24} style={{ marginBottom: 16 }}>
                <Card title="医保目录内替代方案" size="small">
                  {data.alternatives.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无需调整，暂无可推荐替代" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.alternatives}
                      renderItem={(item) => (
                        <List.Item>
                          <Tag color="green">可选</Tag>
                          <div>
                            <Text strong>{item.itemName}</Text>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.reason}</Paragraph>
                          </div>
                          <Tag color="blue">预计节省 {item.estimatedSaving} 元</Tag>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
