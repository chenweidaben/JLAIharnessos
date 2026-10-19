/**
 * 健澜科技 jlmedaios - M173-C 医院智能药房深化页（质量提升与新场景，仅 admin）
 *
 * 「智能药房要真减少差错，不能只是看板」：
 *  - 四大能力域盘点：智能摆药（摆药机对接+摆药差错率监控）/ 智能审方（AI 前置审核+
 *    药师事后复核）/ 智能库存（效期管理+自动补货+缺货预警）/ 智能用药（用药指导+
 *    相互作用+特殊人群），每个域都标注基线差错率 → 目标差错率（真降差错）；
 *  - 药品需求预测：输入药品编码 + 周期 + 季节情景，预测周期总需求与高峰日；
 *  - 库存优化建议：基于预测需求与采购提前期，给出安全库存/再订货点/建议补货量；
 *  - 不良反应预警自检：处方 × 患者画像 × 已现症状三方比对，分级预警（severe 即停发）。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态 loading / error（可重试）/ empty；
 *  - 显式标注「演示数据 · 纯函数推演，非 WebSocket 实时流」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type Seasonality = 'none' | 'winter_respiratory' | 'summer_gastro' | 'flu_peak' | 'year_round';
type RiskLevel = 'none' | 'mild' | 'moderate' | 'severe';
type PillarCode = 'dispense' | 'review' | 'stock' | 'medication';

interface PillarKpi { baselineRate: number; targetRate: number; reductionPctPoints: number; monitorNote: string; }
interface PillarInfo {
  code: PillarCode; name: string; description: string;
  capabilities: string[]; kpi: PillarKpi;
}
interface SmartPharmacySystem {
  pillars: PillarInfo[];
  overallErrorReductionPctPoints: number;
  valueStatement: string;
  guardrails: string[];
}
interface DemandForecast {
  drugId: string; periodDays: number; seasonality: Seasonality;
  baseDailyDemand: number; seasonalFactor: number; forecastDaily: number;
  periodTotal: number; peakDay: number; peakDaily: number; confidence: number; note: string;
}
interface InventoryPlan {
  drugId: string; dailyDemand: number; leadTimeDays: number; leadTimeDemand: number;
  safetyStock: number; reorderPoint: number; maxStock: number;
  suggestedOrderQty: number; daysOfCover: number; shortageAlert: string;
}
interface AdverseAlert {
  drugName: string; level: RiskLevel; triggers: string[];
  matchedSymptoms: string[]; suggestions: string[]; holdDispense: boolean;
}
interface SmartData {
  system: SmartPharmacySystem;
  demand: DemandForecast | null;
  inventory: InventoryPlan | null;
  adverse: AdverseAlert | null;
  generatedAt: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = { deep: '#0B2A4A', accent: '#1E5AA8', bg: '#f5f7fa', grid: '#e6ebf2' };

const RISK_COLOR: Record<RiskLevel, string> = {
  none: '#52C41A', mild: '#1E5AA8', moderate: '#FA8C16', severe: '#CF1322',
};
const RISK_LABEL: Record<RiskLevel, string> = {
  none: '无风险', mild: '轻度', moderate: '中度', severe: '重度（停发）',
};

const SEASON_OPTIONS: { value: Seasonality; label: string }[] = [
  { value: 'none', label: '无明显季节波动' },
  { value: 'winter_respiratory', label: '冬季呼吸道高峰' },
  { value: 'summer_gastro', label: '夏季肠道高峰' },
  { value: 'flu_peak', label: '流感季高峰' },
  { value: 'year_round', label: '全年平稳（慢病）' },
];

const PILLAR_TAG: Record<PillarCode, string> = {
  dispense: '#0B2A4A', review: '#1E5AA8', stock: '#2F7A4E', medication: '#6B4FA0',
};

/* --------------------------------- 组件 --------------------------------- */

export default function PharmacyDeepPage() {
  const [data, setData] = useState<SmartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 需求预测/库存优化查询条件
  const [drugId, setDrugId] = useState('D-AMOX-001');
  const [period, setPeriod] = useState(14);
  const [seasonality, setSeasonality] = useState<Seasonality>('none');
  const [leadTime, setLeadTime] = useState(7);

  // 不良反应自检条件
  const [aeDrug, setAeDrug] = useState('阿司匹林肠溶片');
  const [aeAge, setAeAge] = useState(45);
  const [aePregnant, setAePregnant] = useState(false);
  const [aeRenal, setAeRenal] = useState(false);
  const [aeAllergy, setAeAllergy] = useState('');
  const [aeSymptoms, setAeSymptoms] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (drugId.trim()) qs.set('drugId', drugId.trim());
      qs.set('period', String(period));
      qs.set('seasonality', seasonality);
      qs.set('leadTime', String(leadTime));
      if (aeDrug.trim()) {
        qs.set('ae', '1');
        qs.set('drugName', aeDrug.trim());
        qs.set('age', String(aeAge));
        if (aePregnant) qs.set('pregnant', '1');
        if (aeRenal) qs.set('renal', '1');
        if (aeAllergy.trim()) qs.set('allergies', aeAllergy.trim());
        if (aeSymptoms.trim()) qs.set('symptoms', aeSymptoms.trim());
      }
      const resp = await fetch(`/api/v1/pharmacy/smart?${qs.toString()}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '拉取智能药房数据失败');
        return;
      }
      setData(json.data as SmartData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [drugId, period, seasonality, leadTime, aeDrug, aeAge, aePregnant, aeRenal, aeAllergy, aeSymptoms]);

  useEffect(() => {
    void load();
  }, [load]);

  const invColumns = [
    { title: '指标', dataIndex: 'k', key: 'k' },
    { title: '数值', dataIndex: 'v', key: 'v' },
    { title: '说明', dataIndex: 'note', key: 'note' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            智能药房深化 · 真减差错
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            智能摆药（四码复核）/ 智能审方（AI 前置+药师签核）/ 智能库存（效期+自动补货）/ 智能用药（相互作用+特殊人群）
            · 演示数据 · 纯函数推演，非 WebSocket 实时流
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="智能药房的目标不是多一块屏：摆药四码逐包机扫、AI 前置只拦硬性错误、库存到点自动补货、发药前不良反应三方核对——每一项都直接对着差错率下降。AI 不自动发药，处方生效必须有人审签。"
          style={{ marginBottom: 16 }}
        />

        {/* 查询条件 */}
        <Card size="small" style={{ marginBottom: 16 }} title={<Text strong style={{ color: VI.deep }}>需求预测 / 库存优化 / 不良反应自检</Text>}>
          <Space wrap size={[12, 12]}>
            <Text strong style={{ color: VI.deep }}>药品编码：</Text>
            <Input style={{ width: 160 }} value={drugId} onChange={(e) => setDrugId(e.target.value)} placeholder="如 D-AMOX-001" />
            <Text strong style={{ color: VI.deep }}>周期：</Text>
            <Select style={{ width: 110 }} value={period} onChange={(v) => setPeriod(v)}
              options={[7, 14, 30, 90].map((d) => ({ value: d, label: `${d} 天` }))} />
            <Text strong style={{ color: VI.deep }}>季节：</Text>
            <Select style={{ width: 180 }} value={seasonality} onChange={(v) => setSeasonality(v as Seasonality)} options={SEASON_OPTIONS} />
            <Text strong style={{ color: VI.deep }}>提前期：</Text>
            <Select style={{ width: 100 }} value={leadTime} onChange={(v) => setLeadTime(v)}
              options={[3, 7, 14, 21].map((d) => ({ value: d, label: `${d} 天` }))} />
          </Space>
          <div style={{ marginTop: 12, borderTop: `1px dashed ${VI.grid}`, paddingTop: 12 }}>
            <Space wrap size={[12, 12]}>
              <Text strong style={{ color: VI.deep }}>自检药品：</Text>
              <Input style={{ width: 180 }} value={aeDrug} onChange={(e) => setAeDrug(e.target.value)} placeholder="药品名（清空=不检测）" />
              <Text strong style={{ color: VI.deep }}>年龄：</Text>
              <Input type="number" style={{ width: 80 }} value={aeAge} onChange={(e) => setAeAge(Number(e.target.value))} />
              <Space size={4}>
                <Text>妊娠/哺乳</Text>
                <Switch size="small" checked={aePregnant} onChange={setAePregnant} />
              </Space>
              <Space size={4}>
                <Text>肾功能不全</Text>
                <Switch size="small" checked={aeRenal} onChange={setAeRenal} />
              </Space>
              <Text strong style={{ color: VI.deep }}>过敏史：</Text>
              <Input style={{ width: 140 }} value={aeAllergy} onChange={(e) => setAeAllergy(e.target.value)} placeholder="逗号分隔" />
              <Text strong style={{ color: VI.deep }}>已现症状：</Text>
              <Input style={{ width: 180 }} value={aeSymptoms} onChange={(e) => setAeSymptoms(e.target.value)} placeholder="如 皮疹,瘙痒" />
              <Button type="primary" style={{ background: VI.deep }} onClick={() => void load()}>查询</Button>
            </Space>
          </div>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="构建智能药房体系…" />
          </div>
        )}
        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void load()}>重试</Button>} />
        )}

        {!loading && !error && data && (
          <>
            {/* 总览 KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="综合差错率下降" value={data.system.overallErrorReductionPctPoints} suffix="个百分点"
                  valueStyle={{ color: VI.deep }} /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="能力域" value={data.system.pillars.length} suffix="个" /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="安全红线" value={data.system.guardrails.length} suffix="条" /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="预测周期" value={data.demand ? data.demand.periodDays : 0} suffix="天" /></Card>
              </Col>
            </Row>

            <Alert type="success" showIcon message={data.system.valueStatement} style={{ marginBottom: 16 }} />

            {/* 四大能力域 */}
            <Row gutter={[16, 16]}>
              {data.system.pillars.map((p) => (
                <Col xs={24} lg={12} key={p.code}>
                  <Card
                    size="small"
                    title={
                      <span style={{ color: '#fff' }}>
                        <Tag color={PILLAR_TAG[p.code]} style={{ marginRight: 8 }}>{p.name}</Tag>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{p.description}</Text>
                      </span>
                    }
                    headStyle={{ background: PILLAR_TAG[p.code] }}
                  >
                    <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>
                      {p.capabilities.map((c) => <li key={c} style={{ fontSize: 13, lineHeight: 1.9 }}>{c}</li>)}
                    </ul>
                    <Row gutter={12}>
                      <Col span={8}><Statistic title="人工基线差错率" value={p.kpi.baselineRate} suffix="%" /></Col>
                      <Col span={8}><Statistic title="智能目标" value={p.kpi.targetRate} suffix="%" valueStyle={{ color: '#52C41A' }} /></Col>
                      <Col span={8}><Statistic title="下降" value={p.kpi.reductionPctPoints} suffix="个百分点" valueStyle={{ color: VI.accent }} /></Col>
                    </Row>
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                      监控口径：{p.kpi.monitorNote}
                    </Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 需求预测 + 库存优化 */}
            {data.demand && data.inventory && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: '#fff' }}>药品需求预测 · {data.demand.drugId}</span>}
                    headStyle={{ background: VI.deep }} size="small">
                    <Row gutter={12}>
                      <Col span={6}><Statistic title="预测日均" value={data.demand.forecastDaily} suffix="件" /></Col>
                      <Col span={6}><Statistic title="周期总需求" value={data.demand.periodTotal} suffix="件" /></Col>
                      <Col span={6}><Statistic title="高峰日" value={`第${data.demand.peakDay}天`} /></Col>
                      <Col span={6}><Statistic title="置信度" value={(data.demand.confidence * 100).toFixed(0)} suffix="%" /></Col>
                    </Row>
                    <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                      {data.demand.note}（基线 {data.demand.baseDailyDemand} 件/日 × 季节系数 {data.demand.seasonalFactor}）
                    </Paragraph>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={<span style={{ color: '#fff' }}>库存优化建议 · {data.inventory.drugId}</span>}
                    headStyle={{ background: VI.accent }} size="small">
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="k"
                      columns={invColumns}
                      dataSource={[
                        { k: '提前期需求', v: data.inventory.leadTimeDemand, note: `日均 ${data.inventory.dailyDemand} × 提前期 ${data.inventory.leadTimeDays} 天` },
                        { k: '安全库存', v: data.inventory.safetyStock, note: '应对需求波动与供应延迟' },
                        { k: '再订货点', v: data.inventory.reorderPoint, note: '库存≤此点即自动补货' },
                        { k: '最高库存上限', v: data.inventory.maxStock, note: '补货后可覆盖约 ' + data.inventory.daysOfCover + ' 天' },
                        { k: '建议补货量', v: data.inventory.suggestedOrderQty, note: '补到上限与再订货点差额' },
                      ]}
                    />
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                      {data.inventory.shortageAlert}
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            )}

            {/* 不良反应预警自检 */}
            {data.adverse && (
              <Card style={{ marginTop: 16 }} size="small"
                title={<span style={{ color: '#fff' }}>不良反应预警自检 · {data.adverse.drugName}</span>}
                headStyle={{ background: data.adverse.level === 'none' ? '#2F7A4E' : RISK_COLOR[data.adverse.level] }}>
                <Space style={{ marginBottom: 12 }}>
                  <Text strong>风险分级：</Text>
                  <Tag color={RISK_COLOR[data.adverse.level]}>{RISK_LABEL[data.adverse.level]}</Tag>
                  {data.adverse.holdDispense && <Tag color="red">必须暂停发药待药师/医生确认</Tag>}
                </Space>
                <Row gutter={16}>
                  <Col xs={24} lg={12}>
                    <Text strong style={{ color: VI.deep }}>命中风险因子：</Text>
                    {(data.adverse.triggers ?? []).length === 0
                      ? <Paragraph type="secondary" style={{ fontSize: 12 }}>无（画像与处方无冲突）</Paragraph>
                      : (
                        <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                          {(data.adverse.triggers ?? []).map((t) => <li key={t} style={{ fontSize: 13 }}>{t}</li>)}
                        </ul>
                      )}
                  </Col>
                  <Col xs={24} lg={12}>
                    <Text strong style={{ color: VI.deep }}>处置建议：</Text>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                      {(data.adverse.suggestions ?? []).map((s) => <li key={s} style={{ fontSize: 13 }}>{s}</li>)}
                    </ul>
                    {(data.adverse.matchedSymptoms ?? []).length > 0 && (
                      <>
                        <Text strong style={{ color: VI.deep }}>症状匹配：</Text>
                        <div>{(data.adverse.matchedSymptoms ?? []).map((s) => <Tag key={s} color={RISK_COLOR[data.adverse?.level ?? 'none']}>{s}</Tag>)}</div>
                      </>
                    )}
                  </Col>
                </Row>
              </Card>
            )}

            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center', fontSize: 12 }}>
              安全红线：AI 不自动发药不自动改方 · 四码不符即锁机 · 过期批次系统级锁库 · 不良反应留痕可追溯
            </Paragraph>
          </>
        )}

        <Paragraph type="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
          © {new Date().getFullYear()} 杭州健澜科技有限公司 · 智能药房深化（摆药/审方/库存/用药，真减差错）
        </Paragraph>
      </Content>
    </Layout>
  );
}
