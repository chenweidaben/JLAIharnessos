/**
 * 健澜科技 jlmedaios - M176-B 医院抗菌药物管理深化页（临床核心深化，仅 admin）
 *
 * 抗菌药物管理要国家口径：国卫办医发〔2015〕42号《抗菌药物临床应用指导原则
 * （2015年版）》：
 *  - 六大管理维度盘点：分级管理（非限制/限制/特殊使用）/ 使用率监测
 *    （门诊≤20%、住院≤60%、I类切口≤30%）/ 使用强度（AUD≤40 DDDs/100人天）/
 *    微生物送检率（治疗性≥30%、限制级≥50%、特殊级≥80%）/ 合理性评价
 *    （适应症/选药/剂量/疗程）/ 围术期预防用药（时机30~60min、疗程≤24~48h）；
 *  - 药品分级自检：输入通用名即判非限制/限制/特殊使用级；
 *  - DDDs/AUD 推演：内置确定性样例，总DDDs + 分级分布 + 使用强度；
 *  - 合理性评价自检：处方 × 患者画像 × 送检结果三方比对，输出不合理项明细。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态 loading / error（可重试）/ empty；
 *  - 显式标注「演示数据 · 纯函数推演，非 WebSocket 实时流」；
 *  - AI 不自主开抗菌药，特殊使用级须会诊审批，评价结论由药师签名生效。
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

type AntibioticLevel = 'unrestricted' | 'restricted' | 'special';
type IssueSeverity = 'error' | 'warn';

interface AbxDimensionKpi { nationalTarget: string; monitorNote: string; }
interface AbxDimension {
  code: string; name: string; description: string;
  actions: string[]; kpi: AbxDimensionKpi;
}
interface DeepSystem {
  dimensions: AbxDimension[];
  nationalStandard: string;
  valueStatement: string;
  guardrails: string[];
}
interface Classification {
  drugName: string; level: AntibioticLevel; levelName: string;
  matchedKeyword: string; ruleNote: string;
}
interface DddsItem { drugName: string; totalAmountG: number; ddd: number; ddds: number; level: AntibioticLevel; }
interface DddsSummary {
  totalDdds: number;
  byLevel: Record<AntibioticLevel, number>;
  byPurpose: { therapeutic: number; prophylactic: number };
  aud: number; patientDays: number; items: DddsItem[]; note: string;
}
interface RationalityIssue { code: string; severity: IssueSeverity; message: string; }
interface RationalityResult {
  rational: boolean; score: number; issues: RationalityIssue[];
  summary: string; standard: string;
}
interface DeepData {
  system: DeepSystem;
  classification: Classification | null;
  ddds: DddsSummary | null;
  rationality: RationalityResult | null;
  generatedAt: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = { deep: '#0B2A4A', accent: '#1E5AA8', bg: '#f5f7fa', grid: '#e6ebf2' };

const LEVEL_COLOR: Record<AntibioticLevel, string> = {
  unrestricted: '#52C41A', restricted: '#FA8C16', special: '#CF1322',
};
const LEVEL_LABEL: Record<AntibioticLevel, string> = {
  unrestricted: '非限制使用级', restricted: '限制使用级', special: '特殊使用级',
};
const DIM_COLOR: Record<string, string> = {
  classification: '#0B2A4A', utilization_rate: '#1E5AA8', intensity: '#2F7A4E',
  culture_rate: '#6B4FA0', rationality: '#B07A1E', perioperative: '#137A8A',
};

/* --------------------------------- 组件 --------------------------------- */

export default function AntibioticDeepPage() {
  const [data, setData] = useState<DeepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 分级/DDDs 条件
  const [drug, setDrug] = useState('美罗培南');

  // 合理性自检条件
  const [rxDrug, setRxDrug] = useState('头孢曲松钠');
  const [indication, setIndication] = useState(true);
  const [doseMg, setDoseMg] = useState(2000);
  const [recDoseMg, setRecDoseMg] = useState(2000);
  const [durationDays, setDurationDays] = useState(7);
  const [purpose, setPurpose] = useState<'therapeutic' | 'prophylactic'>('therapeutic');
  const [specialApproved, setSpecialApproved] = useState(false);
  const [timingMin, setTimingMin] = useState(45);
  const [periDurationH, setPeriDurationH] = useState(24);
  const [age, setAge] = useState(65);
  const [pregnant, setPregnant] = useState(false);
  const [renal, setRenal] = useState(true);
  const [allergies, setAllergies] = useState('');
  const [cultureSent, setCultureSent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (drug.trim()) qs.set('drug', drug.trim());
      qs.set('ddds', '1');
      qs.set('rx', '1');
      qs.set('drug2', rxDrug.trim() || '头孢曲松钠');
      qs.set('indication', indication ? '1' : '0');
      qs.set('doseMg', String(doseMg));
      qs.set('recommendedDoseMg', String(recDoseMg));
      qs.set('durationDays', String(durationDays));
      qs.set('purpose', purpose);
      qs.set('specialApproved', specialApproved ? '1' : '0');
      qs.set('timingMin', String(timingMin));
      qs.set('periDurationH', String(periDurationH));
      qs.set('age', String(age));
      if (pregnant) qs.set('pregnant', '1');
      if (renal) qs.set('renal', '1');
      if (allergies.trim()) qs.set('allergies', allergies.trim());
      qs.set('therapeutic', purpose === 'therapeutic' ? '1' : '0');
      if (cultureSent) qs.set('cultureSent', '1');

      const resp = await fetch(`/api/v1/pharmacy/antibiotic/deep?${qs.toString()}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '拉取抗菌药物管理数据失败');
        return;
      }
      setData(json.data as DeepData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [drug, rxDrug, indication, doseMg, recDoseMg, durationDays, purpose,
    specialApproved, timingMin, periDurationH, age, pregnant, renal, allergies, cultureSent]);

  useEffect(() => {
    void load();
  }, [load]);

  const dddsColumns = [
    { title: '药品', dataIndex: 'drugName', key: 'drugName' },
    {
      title: '分级', dataIndex: 'level', key: 'level',
      render: (l: AntibioticLevel) => <Tag color={LEVEL_COLOR[l]}>{LEVEL_LABEL[l]}</Tag>,
    },
    { title: '消耗量(g)', dataIndex: 'totalAmountG', key: 'totalAmountG' },
    { title: 'DDD(g/日)', dataIndex: 'ddd', key: 'ddd' },
    { title: 'DDDs', dataIndex: 'ddds', key: 'ddds' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            抗菌药物管理深化 · 国家口径
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            分级管理 / 使用率监测 / 使用强度 AUD / 微生物送检率 / 合理性评价 / 围术期预防用药
            · 演示数据 · 纯函数推演，非 WebSocket 实时流
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="抗菌药物管理的目标不是统计得多好看：开方即分级、用药即算强度、治疗前必送检、每张处方可点评——门诊≤20%、住院≤60%、AUD≤40、治疗送检≥30%，全部按国卫办医发〔2015〕42号口径可复算。AI 不自主开抗菌药，特殊使用级须会诊审批。"
          style={{ marginBottom: 16 }}
        />

        {/* 查询条件 */}
        <Card size="small" style={{ marginBottom: 16 }}
          title={<Text strong style={{ color: VI.deep }}>药品分级自检 / DDDs·AUD 推演 / 处方合理性自检</Text>}>
          <Space wrap size={[12, 12]}>
            <Text strong style={{ color: VI.deep }}>分级药品：</Text>
            <Input style={{ width: 180 }} value={drug} onChange={(e) => setDrug(e.target.value)}
              placeholder="如 美罗培南/头孢曲松/阿莫西林" />
          </Space>
          <div style={{ marginTop: 12, borderTop: `1px dashed ${VI.grid}`, paddingTop: 12 }}>
            <Space wrap size={[12, 12]}>
              <Text strong style={{ color: VI.deep }}>处方药品：</Text>
              <Input style={{ width: 160 }} value={rxDrug} onChange={(e) => setRxDrug(e.target.value)} />
              <Space size={4}><Text>有适应症</Text><Switch size="small" checked={indication} onChange={setIndication} /></Space>
              <Text strong style={{ color: VI.deep }}>日剂量mg：</Text>
              <Input type="number" style={{ width: 90 }} value={doseMg} onChange={(e) => setDoseMg(Number(e.target.value))} />
              <Text strong style={{ color: VI.deep }}>说明书上限mg：</Text>
              <Input type="number" style={{ width: 110 }} value={recDoseMg} onChange={(e) => setRecDoseMg(Number(e.target.value))} />
              <Text strong style={{ color: VI.deep }}>疗程天：</Text>
              <Input type="number" style={{ width: 70 }} value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
              <Text strong style={{ color: VI.deep }}>用途：</Text>
              <Select style={{ width: 130 }} value={purpose} onChange={(v) => setPurpose(v)}
                options={[
                  { value: 'therapeutic', label: '治疗性使用' },
                  { value: 'prophylactic', label: '围术期预防' },
                ]} />
              <Space size={4}><Text>特殊级已审批</Text><Switch size="small" checked={specialApproved} onChange={setSpecialApproved} /></Space>
            </Space>
            <Space wrap size={[12, 12]} style={{ marginTop: 8 }}>
              <Text strong style={{ color: VI.deep }}>切皮前min：</Text>
              <Input type="number" style={{ width: 80 }} value={timingMin} onChange={(e) => setTimingMin(Number(e.target.value))} />
              <Text strong style={{ color: VI.deep }}>预防h：</Text>
              <Input type="number" style={{ width: 80 }} value={periDurationH} onChange={(e) => setPeriDurationH(Number(e.target.value))} />
              <Text strong style={{ color: VI.deep }}>年龄：</Text>
              <Input type="number" style={{ width: 70 }} value={age} onChange={(e) => setAge(Number(e.target.value))} />
              <Space size={4}><Text>妊娠/哺乳</Text><Switch size="small" checked={pregnant} onChange={setPregnant} /></Space>
              <Space size={4}><Text>肾功能不全</Text><Switch size="small" checked={renal} onChange={setRenal} /></Space>
              <Text strong style={{ color: VI.deep }}>过敏史：</Text>
              <Input style={{ width: 120 }} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="如 青霉素" />
              <Space size={4}><Text>治疗前已送检</Text><Switch size="small" checked={cultureSent} onChange={setCultureSent} /></Space>
              <Button type="primary" style={{ background: VI.deep }} onClick={() => void load()}>查询</Button>
            </Space>
          </div>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="构建深度抗菌药物管理体系…" />
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
                <Card size="small"><Statistic title="安全红线" value={data.system.guardrails.length} suffix="条" /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="总 DDDs" value={data.ddds ? data.ddds.totalDdds : 0}
                  valueStyle={{ color: VI.accent }} /></Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small"><Statistic title="使用强度 AUD"
                  value={data.ddds ? data.ddds.aud : 0} suffix="DDDs/100人天"
                  valueStyle={{ color: data.ddds && data.ddds.aud > 40 ? '#CF1322' : '#52C41A' }} /></Card>
              </Col>
            </Row>

            <Alert type="success" showIcon message={data.system.valueStatement} style={{ marginBottom: 16 }} />
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              依据：{data.system.nationalStandard}
            </Paragraph>

            {/* 六大管理维度 */}
            <Row gutter={[16, 16]}>
              {data.system.dimensions.map((d) => (
                <Col xs={24} lg={12} key={d.code}>
                  <Card
                    size="small"
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

            {/* 药品分级 + DDDs 推演 */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {data.classification && (
                <Col xs={24} lg={8}>
                  <Card title={<span style={{ color: '#fff' }}>药品分级 · {data.classification.drugName}</span>}
                    headStyle={{ background: LEVEL_COLOR[data.classification.level] }} size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Text strong>分级：</Text>
                        <Tag color={LEVEL_COLOR[data.classification.level]} style={{ fontSize: 14 }}>
                          {data.classification.levelName}
                        </Tag>
                      </Space>
                      <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                        命中关键词：{data.classification.matchedKeyword}
                      </Paragraph>
                      <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                        管理要求：{data.classification.ruleNote}
                      </Paragraph>
                    </Space>
                  </Card>
                </Col>
              )}
              {data.ddds && (
                <Col xs={24} lg={16}>
                  <Card title={<span style={{ color: '#fff' }}>DDDs / 使用强度 AUD 推演（内置样例）</span>}
                    headStyle={{ background: VI.accent }} size="small">
                    <Table size="small" pagination={false} rowKey="drugName"
                      columns={dddsColumns} dataSource={data.ddds.items} />
                    <Row gutter={12} style={{ marginTop: 12 }}>
                      <Col span={6}><Statistic title="非限制级 DDDs" value={data.ddds.byLevel.unrestricted} /></Col>
                      <Col span={6}><Statistic title="限制级 DDDs" value={data.ddds.byLevel.restricted} /></Col>
                      <Col span={6}><Statistic title="特殊级 DDDs" value={data.ddds.byLevel.special}
                        valueStyle={{ color: '#CF1322' }} /></Col>
                      <Col span={6}><Statistic title="AUD" value={data.ddds.aud} suffix="/100人天"
                        valueStyle={{ color: data.ddds.aud > 40 ? '#CF1322' : '#52C41A' }} /></Col>
                    </Row>
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                      {data.ddds.note}
                    </Paragraph>
                  </Card>
                </Col>
              )}
            </Row>

            {/* 合理性评价自检 */}
            {data.rationality && (
              <Card style={{ marginTop: 16 }} size="small"
                title={<span style={{ color: '#fff' }}>处方合理性评价 · {rxDrug || '头孢曲松钠'}</span>}
                headStyle={{ background: data.rationality.rational ? '#2F7A4E' : '#CF1322' }}>
                <Space style={{ marginBottom: 12 }}>
                  <Text strong>评价结论：</Text>
                  <Tag color={data.rationality.rational ? 'green' : 'red'}>
                    {data.rationality.rational ? `合理（${data.rationality.score}分）` : `不合理（${data.rationality.score}分）`}
                  </Tag>
                </Space>
                <Paragraph type="secondary" style={{ marginBottom: 12 }}>{data.rationality.summary}</Paragraph>
                {data.rationality.issues.length === 0 ? (
                  <Paragraph type="secondary" style={{ fontSize: 12 }}>无不合理项。</Paragraph>
                ) : (
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="code"
                    columns={[
                      {
                        title: '级别', dataIndex: 'severity', key: 'severity',
                        render: (s: IssueSeverity) =>
                          <Tag color={s === 'error' ? 'red' : 'orange'}>{s === 'error' ? '硬性不合理' : '需关注'}</Tag>,
                      },
                      { title: '问题码', dataIndex: 'code', key: 'code' },
                      { title: '说明', dataIndex: 'message', key: 'message' },
                    ]}
                    dataSource={data.rationality.issues}
                  />
                )}
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                  依据：{data.rationality.standard}；评价为辅助判定，最终结论由药师签名后生效。
                </Paragraph>
              </Card>
            )}

            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center', fontSize: 12 }}>
              安全红线：AI 不自主开抗菌药 · 特殊使用级未会诊审批不得使用 · 治疗性使用前必送检 · 合理性点评留痕可追溯
            </Paragraph>
          </>
        )}

        <Paragraph type="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
          © {new Date().getFullYear()} 杭州健澜科技有限公司 · 抗菌药物管理深化（国卫办医发〔2015〕42号口径）
        </Paragraph>
      </Content>
    </Layout>
  );
}
