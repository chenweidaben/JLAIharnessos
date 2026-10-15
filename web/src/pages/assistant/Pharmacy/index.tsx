/**
 * 健澜科技 jlmedaios - 药房审方智能助手面板（M120-D）
 *
 * 药师输入处方 ID 后，展示调配前智能扫描结果：
 *  - 顶部风险结论条（riskLevel + summary）；
 *  - 相互作用 / 过敏提示 / 近期用药史 / 处置建议 四区块。
 *
 * 三态完备：loading（Spin）、error（Alert + 重试）、empty（未查询 / 无数据）。
 * 视觉：深海蓝 VI（主色 #0B3D6B，辅底 #E8F0F8）。
 *
 * 定位：CDS 辅助提示，不拦截处方；最终审方由药师本人决定。
 * 数据安全与审方留痕要求：依据宪法第七章，全程只读、不落敏感明文。
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

type RiskLevel = 'info' | 'warning' | 'critical';

interface Interaction {
  rule: string; drugA: string; drugB: string; level: RiskLevel; reason: string; suggestion: string;
}
interface AllergyAlert {
  allergen: string; drug: string; level: RiskLevel; reaction: string; suggestion: string;
}
interface HistoryBlock { period: string; summary: string; riskFlags?: string[] }
interface Suggestion { level: RiskLevel; title: string; detail: string; action: string }

interface PharmacyAssistantResult {
  pharmacistId: string;
  prescriptionId: string;
  rxNo: string;
  interactions: Interaction[];
  allergies: AllergyAlert[];
  historyBlocks: HistoryBlock[];
  suggestions: Suggestion[];
  riskLevel: RiskLevel;
  summary: string;
}

const LEVEL_TAG: Record<RiskLevel, { color: string; label: string }> = {
  critical: { color: 'red', label: '高风险' },
  warning: { color: 'orange', label: '需核对' },
  info: { color: 'green', label: '安全' },
};

/** 调用 BFF：GET /api/v1/assistant/pharmacy?prescriptionId=xxx（baseURL 已含前缀） */
function fetchAssistant(prescriptionId: string): Promise<PharmacyAssistantResult> {
  return get<PharmacyAssistantResult>('/assistant/pharmacy', { prescriptionId });
}

export default function PharmacyAssistantPage() {
  const [prescriptionId, setPrescriptionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PharmacyAssistantResult | null>(null);
  const [queried, setQueried] = useState(false);

  const runQuery = async (id: string) => {
    const pid = id.trim();
    if (!pid) { message.warning('请输入处方 ID'); return; }
    setLoading(true);
    setError(null);
    setQueried(true);
    try {
      const res = await fetchAssistant(pid);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const risk = data ? LEVEL_TAG[data.riskLevel] : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>药房审方智能助手</Title>
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
            <Spin size="large" tip="正在扫描处方用药风险…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error" showIcon
            message="审方数据加载失败"
            description={error}
            action={<Button size="small" onClick={() => void runQuery(prescriptionId)}>重试</Button>}
          />
        )}

        {/* empty 态：未查询 */}
        {!loading && !error && !data && (
          <Card>
            <Empty description={queried ? '该处方无审方数据' : '输入处方 ID，开始调配前智能审方'} />
          </Card>
        )}

        {/* 数据态 */}
        {!loading && !error && data && risk && (
          <>
            {/* 风险结论条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Title level={5} style={{ marginBottom: 4 }}>
                    处方 {data.rxNo || data.prescriptionId}
                    <Tag color={risk.color} style={{ marginLeft: 12 }}>{risk.label}</Tag>
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.summary}</Paragraph>
                </Col>
                <Col>
                  <Text type="secondary">
                    相互作用 {data.interactions.length} · 过敏 {data.allergies.length} · 用药史 {data.historyBlocks.length}
                  </Text>
                </Col>
              </Row>
            </Card>

            <Row gutter={16}>
              {/* 相互作用 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="药品相互作用" size="small">
                  {data.interactions.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未检出相互作用" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.interactions}
                      renderItem={(item) => (
                        <List.Item>
                          <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                          <div>
                            <Text strong>{item.drugA} + {item.drugB}</Text>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.reason}；{item.suggestion}</Paragraph>
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* 过敏提示 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="过敏史匹配" size="small">
                  {data.allergies.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无过敏匹配" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.allergies}
                      renderItem={(item) => (
                        <List.Item>
                          <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                          <div>
                            <Text strong>对{item.allergen}过敏 → {item.drug}</Text>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              {item.reaction}；{item.suggestion}
                            </Paragraph>
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* 近期用药史 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="近期用药史" size="small">
                  {data.historyBlocks.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无近期用药记录" />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.historyBlocks}
                      renderItem={(item) => (
                        <List.Item>
                          <Text type="secondary">{item.period}</Text>
                          <div>
                            <Text>{item.summary}</Text>
                            {(item.riskFlags ?? []).map((f) => <Tag key={f} color="orange" style={{ marginLeft: 8 }}>{f}</Tag>)}
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>

              {/* 处置建议 */}
              <Col span={12} style={{ marginBottom: 16 }}>
                <Card title="处置建议" size="small">
                  <List
                    size="small"
                    dataSource={data.suggestions}
                    renderItem={(item) => (
                      <List.Item>
                        <Tag color={LEVEL_TAG[item.level].color}>{LEVEL_TAG[item.level].label}</Tag>
                        <div>
                          <Text strong>{item.title}</Text>
                          <Paragraph type="secondary" style={{ marginBottom: 0 }}>{item.detail}</Paragraph>
                          <Text type="warning">建议：{item.action}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
