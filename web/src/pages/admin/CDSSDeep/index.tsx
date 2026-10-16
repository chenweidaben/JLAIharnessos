/**
 * 健澜科技 jlmedaios - M165-A CDSS 临床决策支持深化 · 告警治理页
 *
 * 「CDSS与运营精细化」——CDSS 告警不能太多，否则医生会忽略（告警疲劳）。
 *   - 一键运行演示评估：POST /api/v1/cdss/evaluate（患者上下文 + 医嘱上下文）；
 *   - 告警按 红>橙>黄>蓝 分级渲染，同优先级去重合并；
 *   - 超量低优先级告警被压制，只计数不弹窗（suppressedCount）；
 *   - 每条告警可现场处置：采纳 / 驳回 / 忽略 / 升级（本地闭环演示）。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e）。三态：loading / error（可重试）/ empty。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type CDSSPriority = 'red' | 'orange' | 'yellow' | 'blue';

interface CDSSAlert {
  alertId: string;
  ruleId: string;
  ruleType: string;
  subType: string;
  priority: CDSSPriority;
  priorityLabel: string;
  title: string;
  message: string;
  suggestedAction: string;
  relatedTo: string[];
  mergedCount: number;
}

interface CDSSEvaluateResponse {
  patientId: string;
  facts: {
    drugOrderCount: number;
    labOrderCount: number;
    diagnosisCount: number;
    activeDrugCount: number;
    allergyCount: number;
  };
  applicableRuleCount: number;
  rawAlertCount: number;
  alerts: CDSSAlert[];
  suppressedCount: number;
  byPriority: Record<CDSSPriority, number>;
}

type AdoptionAction = 'accepted' | 'overridden' | 'dismissed' | 'escalated';

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 告警优先级配色（红>橙>黄>蓝） */
const PRIORITY_STYLE: Record<CDSSPriority, { border: string; bg: string; tag: string }> = {
  red: { border: '#cf1322', bg: '#fff1f0', tag: 'red' },
  orange: { border: '#d46b08', bg: '#fff7e6', tag: 'orange' },
  yellow: { border: '#d4b106', bg: '#fffbe6', tag: 'yellow' },
  blue: { border: '#1e6fbf', bg: '#e6f4ff', tag: 'blue' },
};

const ACTION_LABEL: Record<AdoptionAction, string> = {
  accepted: '已采纳',
  overridden: '已驳回',
  dismissed: '已忽略',
  escalated: '已升级',
};

/** 演示用患者上下文：刻意制造多类命中，验证「少而准」的合并与压制效果 */
const DEMO_BODY = {
  patientContext: {
    patientId: 'P-DEMO-0001',
    age: 68,
    gender: 'M',
    weightKg: 62,
    diagnoses: ['肺炎', '高血压'],
    allergies: ['青霉素'],
    activeDrugs: ['warfarin', 'amlodipine'],
    recentLabs: [],
    symptoms: ['chest_pain', 'diaphoresis'],
  },
  orderContext: {
    pathwayId: 'PATH-COMMON-001',
    orders: [
      { orderId: 'ORD-1', category: 'drug', name: 'aspirin', dosageMg: 3200, freqPerDay: 2 },
      { orderId: 'ORD-2', category: 'drug', name: 'aspirin', dosageMg: 100, freqPerDay: 1 },
      { orderId: 'ORD-3', category: 'drug', name: '青霉素', dosageMg: 800, freqPerDay: 3 },
      { orderId: 'ORD-4', category: 'lab', name: '胸片' },
    ],
  },
};

export default function CDSSDeepPage() {
  const [data, setData] = useState<CDSSEvaluateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /** 告警处置本地闭环：alertId -> action */
  const [adoptions, setAdoptions] = useState<Record<string, AdoptionAction>>({});

  const runEvaluate = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/cdss/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEMO_BODY),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || 'CDSS 评估失败');
        setData(null);
        return;
      }
      setData(json.data as CDSSEvaluateResponse);
      setAdoptions({});
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const onAdopt = (alertId: string, action: AdoptionAction) => {
    setAdoptions((prev) => ({ ...prev, [alertId]: action }));
  };

  const resolvedCount = useMemo(
    () => Object.values(adoptions).filter((a) => a !== 'dismissed').length,
    [adoptions],
  );

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          CDSS 临床决策支持 · 告警治理台
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          CDSS与运营精细化 · 告警不能太多，否则医生会忽略 · 红&gt;橙&gt;黄&gt;蓝，同优先级自动合并
        </Paragraph>
        <Button
          type="primary"
          size="middle"
          loading={loading}
          onClick={runEvaluate}
          style={{ marginTop: 16, background: '#fff', color: VI.deep, borderColor: '#fff' }}
        >
          {data ? '重新运行演示评估' : '运行演示评估'}
        </Button>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在逐条求值规则、合并压制告警…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={runEvaluate}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !data && !error && (
          <Alert
            type="info"
            showIcon
            message="尚未运行评估"
            description="点击顶部「运行演示评估」，以一例老年肺炎合并高血压、伴红旗胸痛的住院患者为样本，验证 CDSS 告警的分级、合并与压制效果。"
          />
        )}

        {!loading && data && (
          <>
            {/* 顶部汇总卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Card>
                  <Statistic title="适用规则" value={data.applicableRuleCount} />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic title="原始命中告警" value={data.rawAlertCount} />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="弹窗告警（已合并）"
                    value={data.alerts.length}
                    valueStyle={{ color: VI.deep }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="被压制告警（防疲劳）"
                    value={data.suppressedCount}
                    valueStyle={{ color: data.suppressedCount > 0 ? '#d46b08' : '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="有效闭环" value={resolvedCount} suffix={`/ ${data.alerts.length}`} />
                </Card>
              </Col>
            </Row>

            {/* 优先级分布 */}
            <Card title="本次评估告警优先级分布（原始命中口径）" style={{ marginBottom: 16 }}>
              {(Object.keys(data.byPriority) as CDSSPriority[]).map((p) => {
                const total = Math.max(1, data.rawAlertCount);
                const pct = Math.round((data.byPriority[p] / total) * 100);
                return (
                  <div key={p} style={{ marginBottom: 8 }}>
                    <Space>
                      <Tag color={PRIORITY_STYLE[p].tag}>{p.toUpperCase()}</Tag>
                      <Text style={{ width: 48 }}>{data.byPriority[p]} 条</Text>
                    </Space>
                    <Progress
                      percent={pct}
                      size="small"
                      showInfo={false}
                      strokeColor={PRIORITY_STYLE[p].border}
                      style={{ width: 320, marginLeft: 16 }}
                    />
                  </div>
                );
              })}
            </Card>

            {/* 弹窗告警列表 */}
            <Card title="当前弹给医生的告警（已按红>橙>黄>蓝排序并合并）">
              <List
                dataSource={data.alerts}
                locale={{ emptyText: '本次无告警——规则表现良好' }}
                renderItem={(a) => {
                  const style = PRIORITY_STYLE[a.priority];
                  const adopted = adoptions[a.alertId];
                  return (
                    <List.Item
                      style={{
                        borderLeft: `4px solid ${style.border}`,
                        background: style.bg,
                        padding: 16,
                        marginBottom: 12,
                        borderRadius: 4,
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <Space style={{ marginBottom: 8 }}>
                          <Tag color={style.tag}>{a.priorityLabel}</Tag>
                          <Tag>{a.ruleType}</Tag>
                          <Tag>{a.subType}</Tag>
                          {a.mergedCount > 1 && (
                            <Tag color="default">已合并 {a.mergedCount} 条同源</Tag>
                          )}
                          {adopted && <Tag color="green">{ACTION_LABEL[adopted]}</Tag>}
                        </Space>
                        <Title level={5} style={{ margin: '4px 0' }}>
                          {a.title}
                        </Title>
                        <Paragraph style={{ marginBottom: 4 }}>{a.message}</Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          建议处置：{a.suggestedAction}
                        </Text>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            关联：{a.relatedTo.join('、')}
                          </Text>
                        </div>
                        {!adopted && (
                          <Space style={{ marginTop: 12 }}>
                            <Button size="small" type="primary" onClick={() => onAdopt(a.alertId, 'accepted')}>
                              采纳
                            </Button>
                            <Button size="small" onClick={() => onAdopt(a.alertId, 'overridden')}>
                              驳回并坚持原医嘱
                            </Button>
                            <Button size="small" onClick={() => onAdopt(a.alertId, 'escalated')}>
                              升级会诊
                            </Button>
                            <Button size="small" danger onClick={() => onAdopt(a.alertId, 'dismissed')}>
                              忽略
                            </Button>
                          </Space>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>

            <Alert
              style={{ marginTop: 16 }}
              type="warning"
              showIcon
              message="告警疲劳治理口径"
              description={`同优先级同源告警自动合并；单次评估最多弹窗 5 条，本次另有 ${data.suppressedCount} 条低优先级告警被压制（只入流水、不弹窗），避免医生对弹窗麻木、漏过真正的红色致命告警。`}
            />
          </>
        )}
      </Content>
    </Layout>
  );
}
