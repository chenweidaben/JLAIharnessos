/**
 * 健澜科技 jlmedaios - M130-C 医保结算智能审核页（医保办 · 建议级）
 *
 * 对一张已结算单据跑 BFF /api/v1/admin/insurance/review：
 *  - 费用测算：总金额 / 统筹纳入基数 / 自费金额 / 自费占比；
 *  - 问题项：甲乙丙分类、目录匹配、自费占比、重复收费、超标准收费；
 *  - 问题行标红，并在「建议调整」列给出人工确认前的处置建议。
 *
 * 【核心业务深化】审核结果为「建议」，不阻断结算、不直接拒付，
 * 必须经医保办人工确认后方可调整。视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

// ---------------------------------------------------------------------------
// 与后端 insuranceReviewAggregator 对齐的类型（前端轻量镜像）
// ---------------------------------------------------------------------------

type DrugClass = '甲类' | '乙类' | '丙类';

interface SettlementItem {
  itemCode: string;
  itemName: string;
  category: string;
  drugClass?: DrugClass;
  unitPrice: number;
  quantity: number;
  billedAt: string;
  inCatalog: boolean;
  standardPrice?: number;
  selfPayRatio?: number;
}

interface ReviewIssue {
  rule: string;
  severity: 'low' | 'medium' | 'high';
  dimension: string;
  itemCode: string;
  itemName: string;
  detail: string;
  suggestion: string;
  suggestedDeduct?: number;
}

interface ReviewResult {
  settlementId?: string;
  totalAmount: number;
  insuranceBase: number;
  selfPayAmount: number;
  selfPayRatio: number;
  issueCount: number;
  maxSeverity: 'low' | 'medium' | 'high' | 'none';
  needManualConfirm: true;
  issues: ReviewIssue[];
  summary: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
  danger: '#ff4d4f',
};

const SEVERITY_TAG: Record<ReviewIssue['severity'], string> = {
  low: 'warning',
  medium: 'orange',
  high: 'error',
};

/** 示例结算单（含丙类误标目录内、超限价、重复收费、乙类缺比例等典型问题） */
const SAMPLE_ITEMS: SettlementItem[] = [
  { itemCode: 'A001', itemName: '阿莫西林胶囊', category: '药品', drugClass: '甲类', unitPrice: 12.5, quantity: 3, billedAt: '2026-10-15T09:00:00', inCatalog: true },
  { itemCode: 'B002', itemName: '某乙类降压药', category: '药品', drugClass: '乙类', unitPrice: 48, quantity: 2, billedAt: '2026-10-15T09:05:00', inCatalog: true },
  { itemCode: 'C003', itemName: '某丙类营养针', category: '药品', drugClass: '丙类', unitPrice: 200, quantity: 1, billedAt: '2026-10-15T09:10:00', inCatalog: true },
  { itemCode: 'X101', itemName: '核磁共振平扫', category: '检查', unitPrice: 680, quantity: 1, billedAt: '2026-10-15T10:00:00', inCatalog: true, standardPrice: 500 },
  { itemCode: 'Y202', itemName: '豪华病房耗材', category: '耗材', unitPrice: 320, quantity: 2, billedAt: '2026-10-15T11:00:00', inCatalog: false },
  { itemCode: 'A001', itemName: '阿莫西林胶囊', category: '药品', drugClass: '甲类', unitPrice: 12.5, quantity: 1, billedAt: '2026-10-15T15:00:00', inCatalog: true },
];

export default function InsuranceReviewPage() {
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runReview = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/insurance/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId: 'S20261015-001', patientInfo: { insuranceType: '职工' }, items }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '审核失败');
        setResult(null);
        return;
      }
      setResult(json.data as ReviewResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 命中问题的项目编码集合（用于明细行标红）
  const flaggedCodes = new Set(
    (result?.issues ?? []).map((i) => i.itemCode).filter(Boolean),
  );

  const itemColumns = [
    { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 90 },
    { title: '名称', dataIndex: 'itemName', key: 'itemName' },
    { title: '类别', dataIndex: 'category', key: 'category', width: 70 },
    {
      title: '医保分类',
      dataIndex: 'drugClass',
      key: 'drugClass',
      width: 90,
      render: (v?: string) => v ?? <Text type="warning">未标注</Text>,
    },
    { title: '单价', dataIndex: 'unitPrice', key: 'unitPrice', width: 80, render: (v: number) => `${v} 元` },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: '金额', key: 'amount', width: 90, render: (_: unknown, r: SettlementItem) => `${(r.unitPrice * r.quantity).toFixed(2)} 元` },
    {
      title: '目录',
      dataIndex: 'inCatalog',
      key: 'inCatalog',
      width: 70,
      render: (v: boolean) => (v ? <Tag color="success">目录内</Tag> : <Tag color="default">目录外</Tag>),
    },
  ];

  const issueColumns = [
    { title: '维度', dataIndex: 'dimension', key: 'dimension', width: 100 },
    {
      title: '级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (v: ReviewIssue['severity']) => <Tag color={SEVERITY_TAG[v]}>{v}</Tag>,
    },
    { title: '问题说明', dataIndex: 'detail', key: 'detail' },
    {
      title: '建议调整',
      dataIndex: 'suggestion',
      key: 'suggestion',
      render: (v: string, r: ReviewIssue) => (
        <Space direction="vertical" size={0}>
          <Text>{v}</Text>
          {typeof r.suggestedDeduct === 'number' && (
            <Text type="danger">建议核减：{r.suggestedDeduct.toFixed(2)} 元</Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医保结算智能审核 · 医保办工作台
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          甲乙丙分类 / 目录匹配 / 自费占比 / 重复收费 / 超标准收费 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* 操作区 */}
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <Button onClick={() => { setItems(SAMPLE_ITEMS); setResult(null); setError(''); }}>
              载入示例结算单
            </Button>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} disabled={items.length === 0} onClick={runReview}>
              智能审核
            </Button>
            <Button onClick={() => { setItems([]); setResult(null); setError(''); }}>清空</Button>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            共 {items.length} 条明细。审核结果为「建议」，不阻断结算，需医保办人工确认后调整。
          </Paragraph>
        </Card>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {/* 结算明细（问题行标红） */}
        {items.length > 0 && (
          <Card title="结算明细" style={{ marginBottom: 16 }}>
            <Table
              rowKey={(r) => `${r.itemCode}-${r.billedAt}`}
              columns={itemColumns}
              dataSource={items}
              pagination={false}
              size="small"
              rowClassName={(r) => (flaggedCodes.has(r.itemCode) ? 'insurance-review-row-danger' : '')}
            />
            <style>{`.insurance-review-row-danger td { background: #fff1f0 !important; }`}</style>
          </Card>
        )}

        {/* 费用测算汇总 */}
        {result && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总金额" value={result.totalAmount} precision={2} suffix="元" />
                </Col>
                <Col span={6}>
                  <Statistic title="统筹纳入基数" value={result.insuranceBase} precision={2} suffix="元" valueStyle={{ color: VI.accent }} />
                </Col>
                <Col span={6}>
                  <Statistic title="自费金额" value={result.selfPayAmount} precision={2} suffix="元" valueStyle={{ color: result.selfPayRatio > 0.3 ? VI.danger : undefined }} />
                </Col>
                <Col span={6}>
                  <Statistic title="自费占比" value={result.selfPayRatio * 100} precision={1} suffix="%" valueStyle={{ color: result.selfPayRatio > 0.3 ? VI.danger : undefined }} />
                </Col>
              </Row>
            </Card>

            <Alert
              type={result.maxSeverity === 'none' ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={result.summary}
            />

            <Card title={`建议项（${result.issueCount}）· 人工确认后生效`} style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.rule}-${r.itemCode}-${r.detail}`}
                columns={issueColumns}
                dataSource={result.issues}
                pagination={false}
                size="small"
              />
            </Card>

            <Alert
              type="info"
              showIcon
              message="免责说明：本页输出为系统审核建议，不构成拒付结论；最终支付/清算以医保经办机构为准。"
            />
          </>
        )}
      </Content>
    </Layout>
  );
}
