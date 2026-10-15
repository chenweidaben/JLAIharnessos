/**
 * 健澜科技 jlmedaios - 跨院知识联邦浏览页（M133-C，SaaS化+智慧度）
 *
 * 面向授权医师的跨院临床知识浏览：以本院为知识接收方，从联邦成员医院汇聚
 * 已脱敏的路径 / 用药 / 诊断 / 失败教训知识，按采纳成功率降序展示。
 *
 * 【SaaS化 + 智慧度】数据不出域——展示内容已经后端 anonymizeKnowledge 脱敏，
 * 无患者 / 医生个人信息；对端高成功率经验前置，失败教训（lesson）重点标识。
 *
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，警示橙 #d46b08。
 * 固定免责声明：「仅供参考，不构成医疗建议」。
 *
 * 后端：GET /api/v1/federated/knowledge?type=pathway。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Badge, Card, Col, Empty, Layout, List, Radio, Row, Spin, Tag, Typography,
} from 'antd';
import {
  SafetyCertificateOutlined, GlobalOutlined, RiseOutlined, WarningOutlined,
} from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';

/** 知识类型选项 */
const TYPE_OPTIONS = [
  { value: 'pathway', label: '临床路径' },
  { value: 'drug', label: '用药方案' },
  { value: 'diagnosis', label: '诊断思路' },
  { value: 'lesson', label: '失败教训' },
] as const;

type KnowledgeType = (typeof TYPE_OPTIONS)[number]['value'];

/** 与后端 Knowledge 对齐（已脱敏，无 PII 字段） */
interface Knowledge {
  sourceHospitalId: string;
  sourceHospitalName: string;
  knowledgeType: KnowledgeType;
  title: string;
  content: string;
  successRate: number;
  usageCount: number;
  anonymized: boolean;
}

/** 与后端 FederatedKnowledgeView 对齐 */
interface FederatedKnowledgeView {
  requesterHospitalId: string;
  targetHospitalId: string;
  knowledgeType: KnowledgeType;
  count: number;
  items: Knowledge[];
  generatedAt: string;
}

/** 知识类型标签颜色 */
function typeTagColor(t: KnowledgeType): string {
  switch (t) {
    case 'lesson': return 'warning';
    case 'drug': return 'geekblue';
    case 'diagnosis': return 'purple';
    default: return 'blue';
  }
}

export default function FederatedKnowledgePage() {
  const [type, setType] = useState<KnowledgeType>('pathway');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<FederatedKnowledgeView | null>(null);

  const load = useCallback(async (t: KnowledgeType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<FederatedKnowledgeView>('/federated/knowledge', { type: t });
      setView(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '跨院知识联邦加载失败');
      setView(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(type);
  }, [type, load]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          <GlobalOutlined /> 跨院知识联邦 · 协同智慧
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        {/* 类型筛选 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Radio.Group
            value={type}
            onChange={(e) => setType(e.target.value as KnowledgeType)}
            optionType="button"
            buttonStyle="solid"
            options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Text type="secondary" style={{ marginLeft: 16, fontSize: 12 }}>
            共 {view?.count ?? 0} 条跨院脱敏知识
          </Text>
          <Badge
            count="已脱敏"
            style={{ background: '#52c41a', marginLeft: 12 }}
            title="跨院知识不含患者/医生个人信息"
          />
        </Card>

        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Spin spinning={loading}>
          {!view || view.items.length === 0 ? (
            <Empty description="当前类型暂无跨院联邦知识" style={{ padding: '48px 0' }} />
          ) : (
            <List
              grid={{ gutter: [16, 16], xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
              dataSource={view.items}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    size="small"
                    style={{ borderTop: `3px solid ${ACCENT}`, height: '100%' }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Tag color={typeTagColor(item.knowledgeType)}>
                        {item.knowledgeType === 'lesson'
                          ? <><WarningOutlined /> 失败教训</>
                          : TYPE_OPTIONS.find((o) => o.value === item.knowledgeType)?.label ?? item.knowledgeType}
                      </Tag>
                      <Tag icon={<GlobalOutlined />} color="default">
                        {item.sourceHospitalName}
                      </Tag>
                    </div>
                    <Title level={5} style={{ margin: '4px 0 8px', color: DEEP_BG }}>
                      {item.title}
                    </Title>
                    <Paragraph style={{ marginBottom: 12, color: '#333', whiteSpace: 'pre-wrap' }}>
                      {item.content}
                    </Paragraph>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text style={{ fontSize: 12 }}>
                          <RiseOutlined style={{ color: '#52c41a' }} /> 采纳成功率{' '}
                          <Text strong style={{ color: '#52c41a' }}>
                            {(item.successRate * 100).toFixed(0)}%
                          </Text>
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                          使用 {item.usageCount} 次
                        </Text>
                      </Col>
                      <Col>
                        {item.anonymized && (
                          <Text style={{ fontSize: 12, color: '#52c41a' }}>
                            <SafetyCertificateOutlined /> 已脱敏
                          </Text>
                        )}
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Spin>

        {/* 固定免责声明 */}
        <Alert
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginTop: 16, fontSize: 12 }}
          message="免责声明与隐私说明"
          description="本页知识来自联邦成员医院，已脱敏且不含任何患者/医生个人信息；内容为跨院经验的辅助参考，不构成医疗建议，具体诊疗请结合患者实际情况与最新版指南，并以主管医师判断为准。"
        />
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          © 2026 杭州健澜科技有限公司
        </Paragraph>
      </Content>
    </Layout>
  );
}
