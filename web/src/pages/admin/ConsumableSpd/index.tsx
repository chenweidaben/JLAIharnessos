/**
 * 健澜科技 jlmedaios - M177-D 医院耗材管理深化——SPD 物流驾驶舱（仅 admin）
 *
 * 【病案设备耗材】SPD（Supply Processing Distribution）医院供应链物流：
 *   采购：科室申请 + 采购订单 + 到货验收；
 *   库存：一级库（中心库房）+ 二级库（科室库房）+ 消耗点（手术室/治疗车）；
 *   使用：扫码领用 + 消耗记录 + HMS 计费；
 *   结算：按实际消耗（PPV）与供应商结算。
 *
 * 核心主张：高值耗材一物一码追溯，不能漏。
 *   - 顶部高值追溯率仪表盘 + 漏追溯红色报警条（缺 UDI/序列号即禁止出库）；
 *   - 四段闭环卡片：采购 / 三级库存 / 使用计费 / PPV 结算；
 *   - 库存优化表：补货 / 呆滞退库 / 观察 / 健康，ABC 分类。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI（#0a2540 → #123a5e）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Table, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type ValueLevel = 'high' | 'medium' | 'low';

interface HighValueTraceGap {
  itemCode: string;
  name: string;
  unitPrice: number;
  supplier: string;
  missing: ('udi' | 'serial' | 'flag')[];
  reason: string;
}

interface HighValueTraceResult {
  highValueCount: number;
  fullyTracedCount: number;
  missingTrace: HighValueTraceGap[];
  traceRate: number;
  hasGap: boolean;
  conclusion: string;
}

interface OptimizationItem {
  itemCode: string;
  name: string;
  currentStock: number;
  safetyStock: number;
  maxStock: number;
  monthlyUsage: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  stockDays: number | null;
  abcClass: 'A' | 'B' | 'C';
  action: 'replenish' | 'reduce' | 'monitor' | 'ok';
  reason: string;
}

interface DeepConsumableMgmt {
  mode: 'SPD';
  procurement: {
    departmentRequests: { dept: string; deptName: string; pendingItems: number; note: string }[];
    purchaseOrders: { orderNo: string; supplier: string; itemCount: number; amount: number; status: string }[];
    arrivals: { goodsNo: string; supplier: string; sku: number; accepted: boolean; note: string }[];
  };
  inventory: {
    level1Total: number;
    level2Total: number;
    pointTotal: number;
    total: number;
    byLocation: { location: string; label: string; qty: number; value: number }[];
  };
  usage: { scanPickupCount: number; consumptionRecordCount: number; billingMatchedRate: number };
  settlement: {
    actualConsumptionValue: number;
    consignmentSettleValue: number;
    directPurchaseValue: number;
  };
  highValue: HighValueTraceResult;
  optimization: {
    items: OptimizationItem[];
    summary: {
      total: number;
      replenishCount: number;
      reduceCount: number;
      monitorCount: number;
      okCount: number;
      replenishValue: number;
      excessValue: number;
      conclusion: string;
    };
  };
  demo: boolean;
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const ACTION_COLOR: Record<OptimizationItem['action'], string> = {
  replenish: 'red',
  reduce: 'orange',
  monitor: 'default',
  ok: 'green',
};

const ACTION_LABEL: Record<OptimizationItem['action'], string> = {
  replenish: '补货',
  reduce: '退库/调拨',
  monitor: '观察',
  ok: '健康',
};

const ABC_COLOR: Record<string, string> = {
  A: 'volcano',
  B: 'gold',
  C: 'default',
};

export default function ConsumableSpdPage() {
  const [data, setData] = useState<DeepConsumableMgmt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/consumable/spd');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DeepConsumableMgmt);
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

  /** 三级库位库存分布（饼） */
  const locationPieOption = useMemo<EChartsOption | null>(() => {
    if (!data) return null;
    return {
      color: [VI.deep, VI.accent, '#13c2c2'],
      tooltip: { trigger: 'item', formatter: '{b}<br/>库存 {c} 件（{d}%）' },
      legend: { bottom: 0 },
      series: [
        {
          name: '三级库位',
          type: 'pie',
          radius: ['40%', '68%'],
          label: { formatter: '{b}\n{c}件' },
          data: data.inventory.byLocation.map((l) => ({ name: l.label, value: l.qty })),
        },
      ],
    };
  }, [data]);

  /** 三级库位资金占用（柱） */
  const locationValueOption = useMemo<EChartsOption | null>(() => {
    if (!data) return null;
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 24, top: 32, bottom: 40 },
      xAxis: {
        type: 'category',
        data: data.inventory.byLocation.map((l) => l.label),
        axisLabel: { interval: 0, rotate: 12 },
      },
      yAxis: { type: 'value', name: '资金(元)' },
      series: [
        {
          name: '库存资金占用',
          type: 'bar',
          data: data.inventory.byLocation.map((l) => l.value),
          itemStyle: { color: VI.accent, borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [data]);

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
          耗材 SPD 物流驾驶舱
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          病案设备耗材 · SPD（采购→三级库存→扫码消耗计费→PPV 结算）· 高值耗材一物一码追溯，不能漏
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1360, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总 SPD 物流数据…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无 SPD 数据。" />
        )}

        {!loading && !error && data && (
          <>
            {data.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实 SPD 台账与 UDI 扫码流水，仅用于演示 SPD 物流四段闭环与高值追溯效果。"
              />
            )}

            {/* 高值一物一码追溯：不能漏（核心红线） */}
            <Card
              style={{
                marginBottom: 16,
                borderLeft: `4px solid ${data.highValue.hasGap ? '#f5222d' : '#52c41a'}`,
              }}
            >
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="dashboard"
                      percent={data.highValue.traceRate}
                      size={120}
                      strokeColor={data.highValue.hasGap ? '#f5222d' : '#52c41a'}
                    />
                    <div style={{ marginTop: 4 }}>高值一物一码追溯率</div>
                  </div>
                </Col>
                <Col span={18}>
                  <Text strong style={{ fontSize: 16, color: VI.deep }}>
                    {data.highValue.conclusion}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="geekblue">高值件 {data.highValue.highValueCount} 件</Tag>
                    <Tag color="green">已闭环 {data.highValue.fullyTracedCount} 件</Tag>
                    <Tag color={data.highValue.hasGap ? 'red' : 'default'}>
                      漏追溯 {data.highValue.missingTrace.length} 件
                    </Tag>
                  </div>
                  {data.highValue.missingTrace.length > 0 && (
                    <Table
                      style={{ marginTop: 12 }}
                      size="small"
                      rowKey="itemCode"
                      pagination={false}
                      dataSource={data.highValue.missingTrace}
                      columns={[
                        { title: '物资编码', dataIndex: 'itemCode', width: 160 },
                        { title: '名称', dataIndex: 'name', width: 140 },
                        { title: '单价(元)', dataIndex: 'unitPrice', width: 100 },
                        { title: '供应商', dataIndex: 'supplier', width: 120 },
                        {
                          title: '缺失要素',
                          dataIndex: 'missing',
                          width: 140,
                          render: (m: ('udi' | 'serial' | 'flag')[]) =>
                            m.map((x) => (
                              <Tag color="red" key={x}>
                                {x === 'udi' ? '缺UDI' : x === 'serial' ? '缺序列号' : '未开追溯'}
                              </Tag>
                            )),
                        },
                        { title: '处置要求', dataIndex: 'reason' },
                      ]}
                    />
                  )}
                </Col>
              </Row>
            </Card>

            {/* 四段闭环概览卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small" title="① 采购">
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>
                    {data.procurement.purchaseOrders.length}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    在途采购订单 · {data.procurement.departmentRequests.length} 项科室申请待审
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="② 三级库存">
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>
                    {data.inventory.total.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    一级 {data.inventory.level1Total} / 二级 {data.inventory.level2Total} / 消耗点{' '}
                    {data.inventory.pointTotal}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="③ 扫码消耗计费">
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>
                    {data.usage.billingMatchedRate}%
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    HMS 计费闭环率 · 扫码 {data.usage.scanPickupCount} 件
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" title="④ PPV 结算">
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>
                    ¥{data.settlement.consignmentSettleValue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    寄售按实际消耗应付 · 直购在库 ¥{data.settlement.directPurchaseValue.toLocaleString()}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 三级库存分布 + 资金占用 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={10}>
                <Card title="三级库位库存分布">
                  {locationPieOption && <ReactECharts option={locationPieOption} style={{ height: 300 }} />}
                </Card>
              </Col>
              <Col span={14}>
                <Card title="三级库位资金占用（元）">
                  {locationValueOption && (
                    <ReactECharts option={locationValueOption} style={{ height: 300 }} />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 采购段明细 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" title="科室采购申请（待审）">
                  <Table
                    size="small"
                    rowKey="dept"
                    pagination={false}
                    dataSource={data.procurement.departmentRequests}
                    columns={[
                      { title: '科室', dataIndex: 'deptName', width: 110 },
                      { title: '待办', dataIndex: 'pendingItems', width: 60 },
                      { title: '说明', dataIndex: 'note' },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="采购订单">
                  <Table
                    size="small"
                    rowKey="orderNo"
                    pagination={false}
                    dataSource={data.procurement.purchaseOrders}
                    columns={[
                      { title: '订单号', dataIndex: 'orderNo', width: 150 },
                      { title: '供应商', dataIndex: 'supplier', width: 100 },
                      {
                        title: '金额',
                        dataIndex: 'amount',
                        width: 100,
                        render: (v: number) => `¥${v.toLocaleString()}`,
                      },
                      { title: '状态', dataIndex: 'status' },
                    ]}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="到货验收">
                  <Table
                    size="small"
                    rowKey="goodsNo"
                    pagination={false}
                    dataSource={data.procurement.arrivals}
                    columns={[
                      { title: '到货号', dataIndex: 'goodsNo', width: 140 },
                      { title: '供应商', dataIndex: 'supplier', width: 100 },
                      {
                        title: '验收',
                        dataIndex: 'accepted',
                        width: 80,
                        render: (v: boolean) =>
                          v ? <Tag color="green">通过</Tag> : <Tag color="red">待补码</Tag>,
                      },
                      { title: '说明', dataIndex: 'note' },
                    ]}
                  />
                </Card>
              </Col>
            </Row>

            {/* 库存优化建议 */}
            <Card title={`库存优化建议 · ${data.optimization.summary.conclusion}`}>
              <Table
                rowKey="itemCode"
                size="small"
                pagination={{ pageSize: 8 }}
                dataSource={data.optimization.items}
                columns={[
                  { title: '物资编码', dataIndex: 'itemCode', width: 150 },
                  { title: '名称', dataIndex: 'name', width: 150 },
                  { title: '在库', dataIndex: 'currentStock', width: 70 },
                  { title: '安全', dataIndex: 'safetyStock', width: 60 },
                  { title: '最高', dataIndex: 'maxStock', width: 60 },
                  { title: '月耗', dataIndex: 'monthlyUsage', width: 70 },
                  {
                    title: '可支撑(天)',
                    dataIndex: 'stockDays',
                    width: 90,
                    render: (v: number | null) => (v === null ? '∞' : v),
                  },
                  {
                    title: 'ABC',
                    dataIndex: 'abcClass',
                    width: 60,
                    render: (v: string) => <Tag color={ABC_COLOR[v]}>{v}</Tag>,
                  },
                  {
                    title: '建议订货',
                    dataIndex: 'suggestedOrderQty',
                    width: 90,
                    render: (v: number) => (v > 0 ? <Text strong>{v}</Text> : '-'),
                  },
                  {
                    title: '动作',
                    dataIndex: 'action',
                    width: 100,
                    render: (v: OptimizationItem['action']) => (
                      <Tag color={ACTION_COLOR[v]}>{ACTION_LABEL[v]}</Tag>
                    ),
                  },
                  { title: '说明', dataIndex: 'reason' },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
