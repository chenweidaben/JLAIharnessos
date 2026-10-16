/**
 * 健澜科技 jlmedaios - M170-D 医院数据资产深化页（管理驾驶舱，仅 admin）
 *
 * 【自学习与数字孪生】数据资产要可治理，不能只是清单：
 *   - 四大域资产卡：患者数据 / 医疗数据 / 运营数据 / AI 数据（数量·治理率·平均价值分·缺口数）；
 *   - 资产明细表：责任科室、敏感级别、数据量、质量分、覆盖率、新鲜度、是否纳入治理、价值分；
 *   - 缺口清单：质量 / 覆盖 / 陈旧 / 未治理 四类缺口，标高/中/低严重度；
 *   - 治理策略：按 L1~L4 敏感级别产出脱敏、授权、保留年限、质检与备份动作。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type DataAssetCategory = 'patient' | 'medical' | 'operation' | 'ai';
type DataGapSeverity = 'high' | 'medium' | 'low';
type AssetValueGrade = 'core' | 'important' | 'general' | 'dormant';

interface DataAssetItem {
  key: string;
  name: string;
  category: DataAssetCategory;
  categoryName: string;
  description: string;
  ownerDept: string;
  sensitivityLevel: number;
  retentionYears: number;
  maskingRequired: boolean;
  volumeRows: number;
  qualityScore: number;
  coverageRate: number;
  freshnessDays: number;
  isGoverned: boolean;
}

interface DataAssetCategorySummary {
  category: DataAssetCategory;
  name: string;
  totalItems: number;
  governedItems: number;
  totalVolumeRows: number;
  avgValueScore: number;
  gapCount: number;
}

interface DataGap {
  assetKey: string;
  assetName: string;
  category: DataAssetCategory;
  categoryName: string;
  severity: DataGapSeverity;
  gapType: 'coverage' | 'quality' | 'freshness' | 'governance';
  current: number;
  threshold: number;
  message: string;
  suggestion: string;
}

interface DataGovernancePolicy {
  assetKey: string;
  assetName: string;
  sensitivityLevel: number;
  sensitivityLabel: string;
  maskingMode: string;
  accessControl: string;
  retentionYears: number;
  qualityCheck: string;
  backup: string;
  encryption: boolean;
  ownerDept: string;
  actions: string[];
}

interface DataAssetInventory {
  asOf: string;
  demo: boolean;
  items: DataAssetItem[];
  categories: DataAssetCategorySummary[];
  summary: {
    totalItems: number;
    governedItems: number;
    ungovernedItems: number;
    avgValueScore: number;
    coreAssets: number;
    gapCount: number;
  };
  gaps: DataGap[];
}

interface InventoryResponse {
  inventory: DataAssetInventory;
  policies: DataGovernancePolicy[];
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SEVERITY_COLOR: Record<DataGapSeverity, string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

const SEVERITY_LABEL: Record<DataGapSeverity, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const GAP_TYPE_LABEL: Record<DataGap['gapType'], string> = {
  coverage: '覆盖率',
  quality: '质量',
  freshness: '陈旧',
  governance: '未治理',
};

const GRADE_COLOR: Record<AssetValueGrade, string> = {
  core: '#52c41a',
  important: '#1e6fbf',
  general: '#13c2c2',
  dormant: '#faad14',
};

/** 单条资产价值分（与 BFF 同口径，便于表格直显） */
function valueScoreOf(item: DataAssetItem): number {
  const freshness =
    item.freshnessDays <= 7 ? 100 : item.freshnessDays <= 30 ? 80 : item.freshnessDays <= 90 ? 60 : item.freshnessDays <= 180 ? 40 : 20;
  const weight = item.category === 'ai' ? 1.1 : item.category === 'medical' ? 1.05 : item.category === 'operation' ? 0.85 : 1.0;
  const raw = item.qualityScore * 0.4 + item.coverageRate * 0.35 + freshness * 0.25;
  return Math.round(Math.min(100, Math.max(0, raw * weight)) * 10) / 10;
}

export default function DataAssetPage() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/data-asset/inventory');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as InventoryResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const inv = data?.inventory;

  /** 四域平均价值分（柱） */
  const categoryOption = useMemo<EChartsOption | null>(() => {
    if (!inv) return null;
    return {
      color: [VI.accent],
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 24, top: 32, bottom: 32 },
      xAxis: { type: 'category', data: inv.categories.map((c) => c.name) },
      yAxis: { type: 'value', min: 0, max: 100, name: '平均价值分' },
      series: [
        {
          name: '平均价值分',
          type: 'bar',
          data: inv.categories.map((c) => c.avgValueScore),
          itemStyle: { color: VI.accent, borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', formatter: '{c}' },
          markLine: {
            symbol: 'none',
            data: [{ yAxis: 60, lineStyle: { color: '#f5222d', type: 'dashed' }, label: { formatter: '合格线 60' } }],
          },
        },
      ],
    };
  }, [inv]);

  if (loading) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Spin tip="加载数据资产清单…" />
      </Content>
    );
  }

  if (error || !inv) {
    return (
      <Content style={{ padding: 24, background: VI.bg }}>
        <Alert
          type="error"
          showIcon
          message="数据资产清单加载失败"
          description={error || '未知错误'}
          action={<Button onClick={load}>重试</Button>}
        />
      </Content>
    );
  }

  const policyMap = new Map((data?.policies ?? []).map((p) => [p.assetKey, p]));

  return (
    <Content style={{ padding: 24, background: VI.bg }}>
      {/* 深海蓝头部 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          borderRadius: 12,
          padding: '24px 28px',
          marginBottom: 20,
          color: '#fff',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医院数据资产治理驾驶舱
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8, marginBottom: 0 }}>
          四大域 15 类资产 · 价值可量化 · 缺口可识别 · 治理可落地
          {inv.demo && (
            <Tag color="orange" style={{ marginLeft: 12 }}>
              演示模式（目录基线，待接入台账）
            </Tag>
          )}
        </Paragraph>
      </div>

      {/* 汇总卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card size="small">
            <Text type="secondary">资产总数</Text>
            <Title level={3} style={{ margin: 0 }}>{inv.summary.totalItems}</Title>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Text type="secondary">已治理</Text>
            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>{inv.summary.governedItems}</Title>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Text type="secondary">待治理</Text>
            <Title level={3} style={{ margin: 0, color: '#faad14' }}>{inv.summary.ungovernedItems}</Title>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Text type="secondary">核心资产</Text>
            <Title level={3} style={{ margin: 0, color: GRADE_COLOR.core }}>{inv.summary.coreAssets}</Title>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Text type="secondary">缺口数</Text>
            <Title level={3} style={{ margin: 0, color: '#f5222d' }}>{inv.summary.gapCount}</Title>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Text type="secondary">平均价值分</Text>
            <Title level={3} style={{ margin: 0, color: VI.accent }}>{inv.summary.avgValueScore}</Title>
          </Card>
        </Col>
      </Row>

      {/* 四域卡片 + 价值分柱图 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {inv.categories.map((c) => (
          <Col span={6} key={c.category}>
            <Card size="small" title={c.name}>
              <Row justify="space-between">
                <Text type="secondary">资产 {c.totalItems} 类</Text>
                <Text type="secondary">治理 {c.governedItems}/{c.totalItems}</Text>
              </Row>
              <Progress percent={c.avgValueScore} size="small" strokeColor={VI.accent} />
              <Row justify="space-between" style={{ marginTop: 4 }}>
                <Text type="secondary">缺口 {c.gapCount}</Text>
                <Text type="secondary">
                  数据量 {(c.totalVolumeRows / 10000).toFixed(1)} 万
                </Text>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Card title="四域平均价值分" size="small">
            {categoryOption && <ReactECharts option={categoryOption} style={{ height: 280 }} />}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={`数据缺口清单（${inv.gaps.length}）`} size="small">
            <Space direction="vertical" style={{ width: '100%', maxHeight: 320, overflow: 'auto' }}>
              {inv.gaps.length === 0 && <Text type="secondary">无缺口，数据资产健康。</Text>}
              {inv.gaps.map((g, i) => (
                <Row key={i} align="middle" gutter={8}>
                  <Col span={3}>
                    <Tag color={SEVERITY_COLOR[g.severity]}>{SEVERITY_LABEL[g.severity]}</Tag>
                  </Col>
                  <Col span={4}>
                    <Tag>{GAP_TYPE_LABEL[g.gapType]}</Tag>
                  </Col>
                  <Col span={6}>
                    <Text strong>{g.assetName}</Text>
                    <Text type="secondary">（{g.categoryName}）</Text>
                  </Col>
                  <Col span={11}>
                    <Text type="secondary">{g.message}。{g.suggestion}</Text>
                  </Col>
                </Row>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 资产明细表 */}
      <Card title="数据资产明细与治理策略" size="small">
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={inv.items}
          columns={[
            { title: '资产', dataIndex: 'name', render: (v: string, r) => (
              <>
                <Text strong>{v}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
              </>
            ) },
            { title: '域', dataIndex: 'categoryName', width: 90 },
            { title: '责任科室', dataIndex: 'ownerDept', width: 110 },
            { title: '敏感级别', dataIndex: 'sensitivityLevel', width: 90, render: (lvl: number) => (
              <Tag color={lvl >= 4 ? 'red' : lvl === 3 ? 'orange' : lvl === 2 ? 'blue' : 'default'}>
                L{lvl}
              </Tag>
            ) },
            { title: '质量分', dataIndex: 'qualityScore', width: 110, render: (v: number) => (
              <Progress percent={v} size="small" status={v < 60 ? 'exception' : 'normal'} />
            ) },
            { title: '覆盖率', dataIndex: 'coverageRate', width: 110, render: (v: number) => (
              <Progress percent={v} size="small" status={v < 60 ? 'exception' : 'normal'} />
            ) },
            { title: '新鲜度(天)', dataIndex: 'freshnessDays', width: 90 },
            { title: '治理', dataIndex: 'isGoverned', width: 80, render: (g: boolean) => (
              <Tag color={g ? 'green' : 'red'}>{g ? '已治理' : '未治理'}</Tag>
            ) },
            { title: '价值分', dataIndex: 'key', width: 110, render: (_: unknown, r: DataAssetItem) => {
              const v = valueScoreOf(r);
              return (
                <Progress
                  percent={v}
                  size="small"
                  strokeColor={v >= 80 ? GRADE_COLOR.core : v >= 60 ? VI.accent : v >= 40 ? '#13c2c2' : '#faad14'}
                />
              );
            } },
          ]}
          expandable={{
            expandedRowRender: (r) => {
              const p = policyMap.get(r.key);
              if (!p) return null;
              return (
                <div style={{ paddingLeft: 24 }}>
                  <Text strong>治理策略：</Text>
                  <Tag color="blue">{p.sensitivityLabel}</Tag>
                  <Tag>脱敏 {p.maskingMode}</Tag>
                  <Tag>授权 {p.accessControl}</Tag>
                  <Tag>保留 {p.retentionYears} 年</Tag>
                  <Tag>质检 {p.qualityCheck}</Tag>
                  <Tag>备份 {p.backup}</Tag>
                  {p.encryption && <Tag color="green">加密</Tag>}
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    {p.actions.map((a, i) => (
                      <li key={i}><Text type="secondary">{a}</Text></li>
                    ))}
                  </ul>
                </div>
              );
            },
          }}
        />
      </Card>
    </Content>
  );
}
