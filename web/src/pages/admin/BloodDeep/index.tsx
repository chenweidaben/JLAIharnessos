/**
 * 健澜科技 jlmedaios - M176-D 医院输血管理深化页（临床核心深化，仅 admin）
 *
 * 「输血管理要零差错，人命关天」：
 *  - 四维度体系总览：适应症 / 输血前评估 / 输血过程 / 输血后评价，零差错红线；
 *  - 输血适应症评估：输入 Hb/PLT/血压/心率/失血量，给出指征分级与推荐成分血；
 *  - 输血反应监测：勾选/输入症状群，映射反应类型并给出即刻处置（致命反应红色告警）；
 *  - 输血疗效评价：对照输注前后 Hb/PLT，判定显效/有效/无效并估算用血成本。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8，告警 #C0392B）；
 *  - 三态 loading / error（可重试）/ empty；
 *  - 显式标注「演示数据 · 纯函数推演，医嘱仍需医生签核」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Descriptions, InputNumber, Layout, List, Row,
  Select, Space, Spin, Statistic, Tag, Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

interface BloodDimension {
  code: string;
  name: string;
  controls: string[];
  kpi: { baselineErrorRatePct: number; targetErrorRatePct: number; guardrail: string };
}
interface DeepSystem {
  dimensions: BloodDimension[];
  overallErrorReductionPctPoints: number;
  valueStatement: string;
  guardrails: string[];
  demo: boolean;
}
interface Indication {
  patientId: string;
  level: 'none' | 'elective' | 'urgent' | 'contraindicated';
  component: string;
  suggestedDose: string;
  shockIndex: number;
  reasons: string[];
  contraindications: string[];
  preChecklist: string[];
}
interface Reaction {
  transfusionId: string;
  type: string;
  severity: string;
  symptoms: string[];
  actions: string[];
  fatal: boolean;
  report: string[];
}
interface Effect {
  transfusionId: string;
  grade: string;
  hbDelta: number;
  pltDelta: number | null;
  metExpected: boolean;
  estimatedCostCny: number;
  conclusions: string[];
}
interface DeepResp {
  system: DeepSystem;
  indication: Indication | null;
  reaction: Reaction | null;
  effect: Effect | null;
}

const LEVEL_COLOR: Record<string, string> = {
  none: 'default', elective: 'blue', urgent: 'red', contraindicated: 'orange',
};
const SEV_COLOR: Record<string, string> = {
  none: 'default', mild: 'gold', moderate: 'orange', severe: 'red',
};

const SYMPTOM_OPTIONS = [
  '腰痛', '寒战', '高热', '血压骤降', '茶色尿', '皮疹', '瘙痒', '荨麻疹',
  '呼吸困难', '发绀', '粉红色泡沫痰', '端坐呼吸', '术野渗血',
];

/* ------------------------------ 页面 ------------------------------ */

export default function BloodDeepPage() {
  const [data, setData] = useState<DeepResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 适应症输入
  const [patientId] = useState('P-1001');
  const [hb, setHb] = useState(58);
  const [plt, setPlt] = useState(90);
  const [sbp, setSbp] = useState(88);
  const [hr, setHr] = useState(118);
  const [weightKg, setWeightKg] = useState(60);
  const [lossMl, setLossMl] = useState(1500);
  const [scenario, setScenario] = useState('hemorrhage');
  const [activeBleeding] = useState(true);

  // 反应症状
  const [symptoms, setSymptoms] = useState<string[]>(['腰痛', '寒战', '血压骤降']);

  // 疗效
  const [preHb, setPreHb] = useState(58);
  const [postHb, setPostHb] = useState(78);
  const [units, setUnits] = useState(2);
  const [component, setComponent] = useState('rbc');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('patientId', patientId);
      qs.set('hb', String(hb));
      qs.set('plt', String(plt));
      qs.set('sbp', String(sbp));
      qs.set('hr', String(hr));
      qs.set('weightKg', String(weightKg));
      qs.set('scenario', scenario);
      qs.set('lossMl', String(lossMl));
      if (activeBleeding) qs.set('activeBleeding', '1');
      if (symptoms.length) qs.set('reactionSymptoms', symptoms.join(','));
      qs.set('preHb', String(preHb));
      qs.set('postHb', String(postHb));
      qs.set('units', String(units));
      qs.set('component', component);

      const resp = await fetch(`/api/v1/blood/deep?${qs.toString()}`);
      const json = await resp.json();
      if (!resp.ok || json.code !== 0) throw new Error(json.message ?? '加载失败');
      setData(json.data as DeepResp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [patientId, hb, plt, sbp, hr, weightKg, lossMl, scenario, activeBleeding, symptoms, preHb, postHb, units, component]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#F4F7FB' }}>
      <Content style={{ padding: 24 }}>
        <Title level={2} style={{ color: '#0B2A4A' }}>输血管理深化（零差错 · 临床核心深化）</Title>
        <Paragraph type="secondary">
          四阶段全闭环硬拦截：输血适应症 → 输血前评估 → 输血过程监测 → 输血后评价。
          演示数据 · 纯函数推演，医嘱仍需医生签核。
        </Paragraph>

        {error && (
          <Alert
            type="error" showIcon style={{ marginBottom: 16 }}
            message={error} action={<Button size="small" onClick={load}>重试</Button>}
          />
        )}

        <Spin spinning={loading}>
          {/* 输入区 */}
          <Card size="small" style={{ marginBottom: 16, borderTop: '3px solid #1E5AA8' }} title="评估参数（脱敏）">
            <Row gutter={[12, 12]}>
              <Col><InputNumber addonBefore="患者" value={patientId} disabled style={{ width: 130 }} /></Col>
              <Col><InputNumber addonBefore="Hb g/L" value={hb} onChange={(v) => setHb(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="PLT" value={plt} onChange={(v) => setPlt(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="SBP" value={sbp} onChange={(v) => setSbp(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="HR" value={hr} onChange={(v) => setHr(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="体重kg" value={weightKg} onChange={(v) => setWeightKg(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="失血mL" value={lossMl} onChange={(v) => setLossMl(v ?? 0)} /></Col>
              <Col>
                <Select value={scenario} style={{ width: 150 }} onChange={setScenario}
                  options={[
                    { value: 'hemorrhage', label: '出血' }, { value: 'surgery', label: '手术' },
                    { value: 'anemia', label: '贫血' }, { value: 'thrombocytopenia', label: '血小板减少' },
                    { value: 'coagulopathy', label: '凝血障碍' },
                  ]} />
              </Col>
              <Col>
                <Select mode="multiple" value={symptoms} style={{ minWidth: 260 }}
                  placeholder="反应症状" onChange={setSymptoms}
                  options={SYMPTOM_OPTIONS.map((s) => ({ value: s, label: s }))} />
              </Col>
              <Col><InputNumber addonBefore="前Hb" value={preHb} onChange={(v) => setPreHb(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="后Hb" value={postHb} onChange={(v) => setPostHb(v ?? 0)} /></Col>
              <Col><InputNumber addonBefore="U数" value={units} onChange={(v) => setUnits(v ?? 0)} /></Col>
              <Col>
                <Select value={component} style={{ width: 130 }} onChange={setComponent}
                  options={[
                    { value: 'rbc', label: '红细胞' }, { value: 'platelet', label: '血小板' },
                    { value: 'plasma', label: '血浆' }, { value: 'cryoprecipitate', label: '冷沉淀' },
                  ]} />
              </Col>
            </Row>
          </Card>

          {data && (
            <>
              {/* 体系总览 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Card size="small" bordered={false} style={{ background: '#0B2A4A', color: '#fff' }}>
                    <Space size="large">
                      <Statistic title="综合差错下降(百分点)" value={data.system.overallErrorReductionPctPoints} precision={1}
                        valueStyle={{ color: '#7FD1AE' }} />
                      <Text style={{ color: '#cfe1f5' }}>{data.system.valueStatement}</Text>
                    </Space>
                  </Card>
                </Col>
                {data.system.dimensions.map((d) => (
                  <Col span={6} key={d.code}>
                    <Card size="small" title={<Text strong style={{ color: '#0B2A4A' }}>{d.name}</Text>}
                      style={{ borderTop: '3px solid #1E5AA8', height: '100%' }}>
                      <List size="small" dataSource={d.controls}
                        renderItem={(c) => <List.Item style={{ padding: '4px 0' }}>• {c}</List.Item>} />
                      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                        基线 {d.kpi.baselineErrorRatePct}% → 目标 {d.kpi.targetErrorRatePct}%
                      </Paragraph>
                      <Text type="danger">红线：{d.kpi.guardrail}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Row gutter={[16, 16]}>
                {/* 适应症 */}
                <Col span={8}>
                  <Card size="small" title="输血适应症评估" style={{ borderTop: '3px solid #1E5AA8' }}>
                    {data.indication ? (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="指征分级">
                          <Tag color={LEVEL_COLOR[data.indication.level]}>{data.indication.level}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="推荐成分">{data.indication.component}</Descriptions.Item>
                        <Descriptions.Item label="剂量">{data.indication.suggestedDose}</Descriptions.Item>
                        <Descriptions.Item label="休克指数">{data.indication.shockIndex}</Descriptions.Item>
                      </Descriptions>
                    ) : <Text type="secondary">输入患者与化验后评估</Text>}
                  </Card>
                </Col>

                {/* 反应 */}
                <Col span={8}>
                  <Card size="small" title="输血反应监测" style={{ borderTop: '3px solid #C0392B' }}>
                    {data.reaction ? (
                      <>
                        <Space style={{ marginBottom: 8 }}>
                          <Tag color={SEV_COLOR[data.reaction.severity]}>{data.reaction.type}</Tag>
                          {data.reaction.fatal && <Tag color="red">致命 · 立即停血</Tag>}
                        </Space>
                        <List size="small" dataSource={data.reaction.actions}
                          renderItem={(a) => <List.Item style={{ padding: '4px 0' }}>➤ {a}</List.Item>} />
                      </>
                    ) : <Text type="secondary">无症状，常规监测</Text>}
                  </Card>
                </Col>

                {/* 疗效 */}
                <Col span={8}>
                  <Card size="small" title="输血疗效评价" style={{ borderTop: '3px solid #1E5AA8' }}>
                    {data.effect ? (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="结论">
                          <Tag color={data.effect.metExpected ? 'green' : 'red'}>{data.effect.grade}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Hb 增量">+{data.effect.hbDelta} g/L</Descriptions.Item>
                        {data.effect.pltDelta !== null && (
                          <Descriptions.Item label="PLT 增量">+{data.effect.pltDelta}</Descriptions.Item>
                        )}
                        <Descriptions.Item label="用血成本">¥{data.effect.estimatedCostCny}</Descriptions.Item>
                      </Descriptions>
                    ) : <Text type="secondary">输入前后 Hb 后评价</Text>}
                  </Card>
                </Col>
              </Row>

              <Alert style={{ marginTop: 16 }} type="warning" showIcon
                message="零差错红线：三查八对不通过血袋不出库；血型不合立即停血；一袋血不超过 4 小时；所有反应先停血并保留血袋送检。" />
            </>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
