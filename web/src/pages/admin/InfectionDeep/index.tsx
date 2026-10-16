/**
 * 健澜科技 jlmedaios - M179-B 医院院感管理深化页（护理院感医保药事，仅 admin）
 *
 * 院感监测要真预警，不能等暴发：
 *  - 四大管理维度盘点：院感监测（手卫生/环境卫生/消毒灭菌/MDRO）/
 *    院感病例（诊断/上报/流调/处置）/ 暴发预警（聚集/同源性/控制）/
 *    培训考核（院感知识/防护技能/考核合格）；
 *  - 手卫生监测：按科室 × 周期统计五时刻依从率，目标 ≥95%（WS/T 313）；
 *  - 暴发识别：72h 窗内 ≥3 例聚集，叠加同种同源即判暴发疑似；
 *  - 周期报告：SSI / CLABSI / VAP / MDRO 四类国家指标发生率。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态 loading / error（可重试）/ empty；
 *  - 显式标注「演示数据 · 纯函数推演，非 WebSocket 实时流」；
 *  - 预警仅提示，最终暴发判定与处置由院感科专职人员签认。
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
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

interface InfDimensionKpi { nationalTarget: string; monitorNote: string; }
interface InfDimension {
  code: string; name: string; description: string;
  actions: string[]; kpi: InfDimensionKpi;
}
interface DeepSystem {
  dimensions: InfDimension[];
  nationalStandard: string;
  valueStatement: string;
  guardrails: string[];
}
interface HandResult {
  dept: string; period: string; observed: number; compliant: number;
  rate: number; target: string; pass: boolean; moments: string[]; gaps: string[];
}
interface OutbreakResult {
  dept: string; windowHours: number; threshold: number; caseCount: number;
  cluster: boolean; homology: 'same' | 'different' | 'unknown'; outbreak: boolean;
  involvedTypes: string[]; involvedStrains: string[];
  alerts: string[]; controlAdvice: string[];
}
interface InfectionReport {
  period: string;
  counts: { ssi: number; clabsi: number; vap: number; mdro: number };
  denominators: { surgeries: number; centralLineDays: number; ventilatorDays: number; patientDays: number };
  rates: { ssiRatePercent: number; clabsiPerMille: number; vapPerMille: number; mdroPerMille: number };
  handHygieneRate: number; outbreakAlerts: number; trainingPassRate: number;
  conclusion: string; recommendations: string[];
}
interface DeepData {
  system: DeepSystem;
  hand: HandResult;
  outbreak: OutbreakResult;
  report: InfectionReport;
  generatedAt: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = { deep: '#0B2A4A', accent: '#1E5AA8', bg: '#f5f7fa', grid: '#e6ebf2' };

const DIM_COLOR: Record<string, string> = {
  monitoring: '#0B2A4A', cases: '#1E5AA8', outbreak: '#B07A1E', training: '#2F7A4E',
};

const HOMOLOGY_COLOR: Record<string, string> = {
  same: 'red', different: 'orange', unknown: 'default',
};
const HOMOLOGY_LABEL: Record<string, string> = {
  same: '同种同源', different: '菌株不同', unknown: '未分型',
};

/* --------------------------------- 组件 --------------------------------- */

export default function InfectionDeepPage() {
  const [data, setData] = useState<DeepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dept, setDept] = useState('ICU');
  const [period, setPeriod] = useState('2026-10');
  const [observed, setObserved] = useState<number>(200);
  const [compliant, setCompliant] = useState<number>(178);
  const [threshold, setThreshold] = useState<number>(3);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('dept', dept.trim() || '全院');
      qs.set('period', period.trim() || new Date().toISOString().slice(0, 7));
      qs.set('observed', String(observed));
      qs.set('compliant', String(compliant));
      qs.set('threshold', String(threshold));

      const resp = await fetch(`/api/v1/infection/deep?${qs.toString()}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '拉取院感管理数据失败');
        return;
      }
      setData(json.data as DeepData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [dept, period, observed, compliant, threshold]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            院感管理深化 · 真预警不等暴发
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            院感监测（手卫生/环境/消毒灭菌/MDRO）/ 院感病例（诊断/上报/流调/处置）/
            暴发预警（72h 聚集/同源性/控制）/ 培训考核 · 演示数据 · 纯函数推演，非 WebSocket 实时流
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="院感管理要真预警：手卫生依从率每日可测（≥95%）、72h 窗内同科室 ≥3 例自动标红、同种同源一判即启动暴发处置——把院感拦截在暴发之前，而不是暴发之后补登记。预警仅提示，最终处置由院感科专职人员签认。"
          style={{ marginBottom: 16 }}
        />

        {/* 查询条件 */}
        <Card size="small" style={{ marginBottom: 16 }}
          title={<Text strong style={{ color: VI.deep }}>手卫生监测 / 暴发识别条件</Text>}>
          <Space wrap size={[12, 12]}>
            <Text strong style={{ color: VI.deep }}>科室：</Text>
            <Input style={{ width: 140 }} value={dept} onChange={(e) => setDept(e.target.value)} />
            <Text strong style={{ color: VI.deep }}>周期：</Text>
            <Input style={{ width: 110 }} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-10" />
            <Text strong style={{ color: VI.deep }}>观察次数：</Text>
            <Input type="number" style={{ width: 90 }} value={observed} onChange={(e) => setObserved(Number(e.target.value))} />
            <Text strong style={{ color: VI.deep }}>合格次数：</Text>
            <Input type="number" style={{ width: 90 }} value={compliant} onChange={(e) => setCompliant(Number(e.target.value))} />
            <Text strong style={{ color: VI.deep }}>聚集阈值：</Text>
            <Input type="number" style={{ width: 70 }} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            <Button type="primary" style={{ background: VI.deep }} onClick={() => void load()}>查询</Button>
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="构建深度院感管理体系…" />
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
                <Card size="small"><Statistic title="管理维度" value={data.system.dimensions.length} suffix="个"
                  valueStyle={{ color: VI.deep }} /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="手卫生依从率" value={data.hand.rate} suffix="%"
                  valueStyle={{ color: data.hand.pass ? '#52C41A' : '#CF1322' }} /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="72h 聚集病例" value={data.outbreak.caseCount} suffix="例"
                  valueStyle={{ color: data.outbreak.cluster ? '#FA8C16' : '#52C41A' }} /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="暴发疑似" value={data.outbreak.outbreak ? '是' : '否'}
                  valueStyle={{ color: data.outbreak.outbreak ? '#CF1322' : '#52C41A' }} /></Card>
              </Col>
            </Row>

            <Alert type="success" showIcon message={data.system.valueStatement} style={{ marginBottom: 16 }} />
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              依据：{data.system.nationalStandard}
            </Paragraph>

            {/* 四大管理维度 */}
            <Row gutter={[16, 16]}>
              {data.system.dimensions.map((d) => (
                <Col xs={24} lg={12} key={d.code}>
                  <Card size="small"
                    title={
                      <span style={{ color: '#fff' }}>
                        <Tag color={DIM_COLOR[d.code] ?? VI.deep} style={{ marginRight: 8 }}>{d.name}</Tag>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{d.description}</Text>
                      </span>
                    }
                    headStyle={{ background: DIM_COLOR[d.code] ?? VI.deep }}
                  >
                    <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>
                      {d.actions.map((a) => <li key={a} style={{ fontSize: 13, lineHeight: 1.9 }}>{a}</li>)}
                    </ul>
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 4, fontSize: 12 }}>
                      国家口径目标：<Text strong style={{ color: VI.deep }}>{d.kpi.nationalTarget}</Text>
                    </Paragraph>
                    <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                      监控口径：{d.kpi.monitorNote}
                    </Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 手卫生 + 暴发识别 */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} lg={10}>
                <Card size="small" title={<span style={{ color: '#fff' }}>手卫生监测 · {data.hand.dept}（{data.hand.period}）</span>
                  headStyle={{ background: data.hand.pass ? '#2F7A4E' : '#B07A1E' }}>
                  <Row gutter={12}>
                    <Col span={8}><Statistic title="观察次数" value={data.hand.observed} /></Col>
                    <Col span={8}><Statistic title="合格次数" value={data.hand.compliant} /></Col>
                    <Col span={8}>
                      <Statistic title="依从率" value={data.hand.rate} suffix="%"
                        valueStyle={{ color: data.hand.pass ? '#52C41A' : '#CF1322' }} />
                    </Col>
                  </Row>
                  <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 8 }}>
                    目标 {data.hand.target} · {data.hand.pass ? <Tag color="green">达标</Tag> : <Tag color="red">未达标</Tag>}
                  </Paragraph>
                  <Text strong style={{ color: VI.deep, fontSize: 13 }}>五时刻：</Text>
                  <Space wrap style={{ marginTop: 4 }}>
                    {data.hand.moments.map((m) => (
                      <Tag key={m} color={data.hand.gaps.includes(m) ? 'orange' : 'blue'}>{m}</Tag>
                    ))}
                  </Space>
                  {data.hand.gaps.length > 0 && (
                    <Paragraph type="warning" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                      薄弱时刻：{data.hand.gaps.join('、')}
                    </Paragraph>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={14}>
                <Card size="small" title={<span style={{ color: '#fff' }}>暴发识别 · {data.outbreak.dept}（{data.outbreak.windowHours}h 窗 / 阈值 {data.outbreak.threshold}）</span>
                  headStyle={{ background: data.outbreak.outbreak ? '#CF1322' : data.outbreak.cluster ? '#FA8C16' : '#2F7A4E' }}>
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Text strong>聚集：</Text>
                    <Tag color={data.outbreak.cluster ? 'orange' : 'green'}>{data.outbreak.cluster ? `是（${data.outbreak.caseCount} 例）` : '否'}</Tag>
                    <Text strong>同源性：</Text>
                    <Tag color={HOMOLOGY_COLOR[data.outbreak.homology]}>{HOMOLOGY_LABEL[data.outbreak.homology]}</Tag>
                    <Text strong>暴发疑似：</Text>
                    <Tag color={data.outbreak.outbreak ? 'red' : 'default'}>{data.outbreak.outbreak ? '成立' : '不成立'}</Tag>
                  </Space>
                  {data.outbreak.involvedStrains.length > 0 && (
                    <Paragraph type="secondary" style={{ fontSize: 12 }}>
                      涉及菌株：{data.outbreak.involvedStrains.map((s) => <Tag key={s} color="red">{s}</Tag>)}
                    </Paragraph>
                  )}
                  <Text strong style={{ color: VI.deep, fontSize: 13 }}>预警信息：</Text>
                  <ul style={{ margin: '4px 0 12px 18px', padding: 0 }}>
                    {data.outbreak.alerts.map((a) => <li key={a} style={{ fontSize: 13, lineHeight: 1.8 }}>{a}</li>)}
                  </ul>
                  <Text strong style={{ color: VI.deep, fontSize: 13 }}>控制建议：</Text>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                    {data.outbreak.controlAdvice.map((a) => <li key={a} style={{ fontSize: 13, lineHeight: 1.8 }}>{a}</li>)}
                  </ul>
                </Card>
              </Col>
            </Row>

            {/* 周期院感报告 */}
            <Card style={{ marginTop: 16 }} size="small"
              title={<span style={{ color: '#fff' }}>周期院感报告 · {data.report.period}</span>}
              headStyle={{ background: VI.accent }}>
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col span={6}><Statistic title="SSI 手术部位感染率" value={data.report.rates.ssiRatePercent} suffix="%" /></Col>
                <Col span={6}><Statistic title="CLABSI 导管相关血流" value={data.report.rates.clabsiPerMille} suffix="‰" /></Col>
                <Col span={6}><Statistic title="VAP 呼吸机相关肺炎" value={data.report.rates.vapPerMille} suffix="‰" /></Col>
                <Col span={6}><Statistic title="MDRO 多重耐药菌" value={data.report.rates.mdroPerMille} suffix="‰" /></Col>
              </Row>
              <Paragraph type="secondary" style={{ marginBottom: 12 }}>{data.report.conclusion}</Paragraph>
              <Text strong style={{ color: VI.deep, fontSize: 13 }}>改进建议：</Text>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {data.report.recommendations.map((r) => <li key={r} style={{ fontSize: 13, lineHeight: 1.8 }}>{r}</li>)}
              </ul>
            </Card>

            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center', fontSize: 12 }}>
              安全红线：预警仅提示 · 不自动隔离/停药 · 暴发判定与处置由院感科签认 · AI 不自主下达抗菌药或隔离医嘱
            </Paragraph>
          </>
        )}

        <Paragraph type="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
          © {new Date().getFullYear()} 杭州健澜科技有限公司 · 院感管理深化（WS/T 312·313 口径）
        </Paragraph>
      </Content>
    </Layout>
  );
}
