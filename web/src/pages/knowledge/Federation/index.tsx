/**
 * 健澜科技 jlmedaios - 跨科室知识联邦页（M146-C，越用越聪明深化）
 *
 * 面向授权医师的院内跨科知识联邦：
 *  - 三组指南背书的跨科映射：心内科→急诊科 / 内分泌→营养科 / 外科→麻醉科；
 *  - 科室对联邦检索：选择两科室 + 场景关键词，返回带证据强度（confidence）的
 *    可信知识关系，<0.5 的关联后端已不下发（宁少勿滥）；
 *  - 症状→疾病关联：同一条关系上同时命中症状与疾病才推荐，杜绝乱推荐；
 *  - 疾病图谱节点：以疾病为中心展开其全部跨科协同边。
 *
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，警示橙 #d46b08。
 * 固定免责声明：「仅供参考，不构成医疗建议」。
 *
 * 后端：GET /api/v1/knowledge/federate。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Badge, Button, Card, Col, Empty, Input, Layout, List, Progress, Row, Select, Spin, Tag, Typography,
} from 'antd';
import {
  ApartmentOutlined, AuditOutlined, HeartOutlined, SearchOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';

/** 跨科映射白名单（与后端 CROSS_DEPT_MAP 对齐，展示用） */
const DEPT_PAIRS = [
  { deptA: 'DEP-CARDIO', deptB: 'DEP-ED', label: '心内科 → 急诊科', scene: '胸痛中心绿色通道 / 急性心衰抢救' },
  { deptA: 'DEP-ENDO', deptB: 'DEP-NUTRITION', label: '内分泌 → 营养科', scene: '糖尿病医学营养治疗 / 体重管理' },
  { deptA: 'DEP-SURG', deptB: 'DEP-ANES', label: '外科 → 麻醉科', scene: '围术期评估 / 术后镇痛' },
] as const;

/** 关系类型中文标签 */
const REL_TYPE_LABEL: Record<string, string> = {
  emergency_link: '急诊联动',
  nutrition_care: '营养协同',
  perioperative: '围术期协同',
  consult: '跨科会诊',
};

/** 与后端 Relation 对齐 */
interface Relation {
  id: string;
  deptA: string;
  deptAName: string;
  deptB: string;
  deptBName: string;
  relationType: string;
  condition: string;
  description: string;
  confidence: number;
  evidence: string;
  diseaseIds: string[];
  symptoms: string[];
}

/** 科室联邦模式响应 */
interface FederationView {
  mode: 'federation' | 'relations' | 'graphNode';
  minConfidence: number;
  count: number;
  relations: Relation[];
  disclaimer: string;
}

/** 图谱节点模式响应 */
interface GraphNodeView {
  mode: 'graphNode';
  minConfidence: number;
  node: {
    diseaseId: string;
    name: string;
    primaryDept: string;
    description: string;
    matched: boolean;
    relations: Relation[];
  };
  disclaimer: string;
}

/** 疾病下拉选项（与后端 DISEASE_REGISTRY 对齐） */
const DISEASE_OPTIONS = [
  { value: 'DIS-ACS', label: '急性冠脉综合征' },
  { value: 'DIS-HF-ACUTE', label: '急性心力衰竭' },
  { value: 'DIS-ARRHY', label: '恶性心律失常' },
  { value: 'DIS-T2DM', label: '2型糖尿病' },
  { value: 'DIS-OBESITY', label: '肥胖症' },
  { value: 'DIS-DN', label: '糖尿病肾病' },
  { value: 'DIS-GDM', label: '妊娠期糖尿病' },
  { value: 'DIS-SURG-ABDO', label: '腹部外科手术' },
  { value: 'DIS-CARDIAC-SURG-RISK', label: '合并心血管病的外科手术' },
  { value: 'DIS-POSTOP-PAIN', label: '外科术后疼痛' },
];

/** 置信度配色：≥0.9 深海蓝、≥0.75 蓝、其余橙（均高于 0.5 红线） */
function confidenceColor(c: number): string {
  if (c >= 0.9) return DEEP_BG;
  if (c >= 0.75) return ACCENT;
  return '#d46b08';
}

/** 单条关系卡片 */
function RelationCard({ r }: { r: Relation }) {
  return (
    <Card size="small" style={{ marginBottom: 12, borderLeft: `4px solid ${confidenceColor(r.confidence)}` }}>
      <Row gutter={16}>
        <Col flex="auto">
          <Text strong>{r.deptAName}</Text>
          <Text type="secondary">  ⇄  </Text>
          <Text strong>{r.deptBName}</Text>
          <Tag color="geekblue" style={{ marginLeft: 8 }}>{REL_TYPE_LABEL[r.relationType] ?? r.relationType}</Tag>
          <Paragraph strong style={{ marginTop: 8, marginBottom: 4 }}>{r.condition}</Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 4, fontSize: 12 }}>{r.description}</Paragraph>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <AuditOutlined /> 证据：{r.evidence}
          </Text>
          <div style={{ marginTop: 8 }}>
            {r.symptoms.map((s) => <Tag key={s}>{s}</Tag>)}
          </div>
        </Col>
        <Col style={{ width: 140, textAlign: 'center' }}>
          <Progress
            type="dashboard"
            size={96}
            percent={Math.round(r.confidence * 100)}
            strokeColor={confidenceColor(r.confidence)}
            format={(p) => <Text strong style={{ color: confidenceColor(r.confidence) }}>{(p ?? 0) / 100}</Text>}
          />
          <div><Text type="secondary" style={{ fontSize: 12 }}>证据强度</Text></div>
        </Col>
      </Row>
    </Card>
  );
}

export default function KnowledgeFederationPage() {
  const [deptA, setDeptA] = useState<string>('DEP-CARDIO');
  const [deptB, setDeptB] = useState<string>('DEP-ED');
  const [condition, setCondition] = useState('');
  const [symptom, setSymptom] = useState('');
  const [disease, setDisease] = useState('');
  const [graphDisease, setGraphDisease] = useState<string>('DIS-T2DM');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [node, setNode] = useState<GraphNodeView['node'] | null>(null);

  /** 科室对联邦检索 */
  const loadFederation = useCallback(async (a: string, b: string, cond: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<FederationView>('/knowledge/federate', { deptA: a, deptB: b, condition: cond });
      setRelations(data.relations ?? []);
      setDisclaimer(data.disclaimer ?? '');
      setNode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '跨科室知识联邦加载失败');
      setRelations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFederation(deptA, deptB, condition);
  }, [deptA, deptB, loadFederation]);

  /** 症状→疾病关联检索 */
  const searchRelations = useCallback(async () => {
    if (!symptom.trim() || !disease.trim()) {
      setError('症状与疾病须同时填写（跨科关联要准确，不靠单侧猜测）');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await get<FederationView>('/knowledge/federate', { symptom, disease });
      setRelations(data.relations ?? []);
      setDisclaimer(data.disclaimer ?? '');
      setNode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '知识关联检索失败');
      setRelations([]);
    } finally {
      setLoading(false);
    }
  }, [symptom, disease]);

  /** 疾病图谱节点 */
  const loadNode = useCallback(async (diseaseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<GraphNodeView>('/knowledge/federate', { diseaseId });
      setNode(data.node);
      setDisclaimer(data.disclaimer ?? '');
      setRelations([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '知识图谱节点加载失败');
      setNode(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          <ApartmentOutlined /> 跨科室知识联邦 · 越用越聪明
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* 三组跨科映射导览 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {DEPT_PAIRS.map((p) => (
            <Col span={8} key={p.deptA}>
              <Card
                size="small"
                hoverable
                onClick={() => { setDeptA(p.deptA); setDeptB(p.deptB); setCondition(''); }}
              >
                <Badge.Ribbon text="指南背书" color={ACCENT}>
                  <HeartOutlined style={{ color: ACCENT }} />
                  <Text strong> {p.label}</Text>
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                    {p.scene}
                  </Paragraph>
                </Badge.Ribbon>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 科室对联邦 */}
        <Card size="small" title={<><SearchOutlined /> 科室对知识联邦</>} style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={6}>
              <Select value={deptA} style={{ width: '100%' }} onChange={setDeptA}
                options={[{ value: 'DEP-CARDIO', label: '心内科' }, { value: 'DEP-ENDO', label: '内分泌科' }, { value: 'DEP-SURG', label: '外科' }]} />
            </Col>
            <Col span={6}>
              <Select value={deptB} style={{ width: '100%' }} onChange={setDeptB}
                options={[{ value: 'DEP-ED', label: '急诊科' }, { value: 'DEP-NUTRITION', label: '营养科' }, { value: 'DEP-ANES', label: '麻醉科' }]} />
            </Col>
            <Col span={8}>
              <Input placeholder="场景关键词（如：心衰 / 糖尿病 / 术前评估）"
                value={condition} onChange={(e) => setCondition(e.target.value)}
                onPressEnter={() => loadFederation(deptA, deptB, condition)} allowClear />
            </Col>
            <Col span={4}>
              <Button type="primary" style={{ background: ACCENT }} onClick={() => loadFederation(deptA, deptB, condition)}>
                联邦检索
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 症状→疾病关联 */}
        <Card size="small" title={<><SafetyCertificateOutlined /> 症状 → 疾病跨科关联</>} style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Input placeholder="症状关键词（如：压榨样胸痛 / 多饮）" value={symptom} onChange={(e) => setSymptom(e.target.value)} allowClear />
            </Col>
            <Col span={8}>
              <Input placeholder="疾病关键词（如：急性冠脉综合征 / 2型糖尿病）" value={disease} onChange={(e) => setDisease(e.target.value)} onPressEnter={searchRelations} allowClear />
            </Col>
            <Col span={4}>
              <Button onClick={searchRelations}>关联查询</Button>
            </Col>
          </Row>
        </Card>

        {/* 疾病图谱节点 */}
        <Card size="small" title="疾病中心图谱节点" style={{ marginBottom: 16 }}>
          <Row gutter={12}>
            <Col span={10}>
              <Select showSearch value={graphDisease} style={{ width: '100%' }} options={DISEASE_OPTIONS} onChange={(v) => setGraphDisease(v)} />
            </Col>
            <Col span={4}>
              <Button onClick={() => loadNode(graphDisease)}>构建节点</Button>
            </Col>
          </Row>
          {node && (
            node.matched ? (
              <div style={{ marginTop: 12 }}>
                <Paragraph strong style={{ marginBottom: 4 }}>{node.name} <Tag color="blue">主管科室：{node.primaryDept}</Tag></Paragraph>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>{node.description} · {node.relations.length} 条跨科协同边</Paragraph>
              </div>
            ) : (
              <Empty description="暂无可信跨科关联（不臆造推荐）" style={{ marginTop: 12 }} />
            )
          )}
        </Card>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

        {/* 结果列表 */}
        <Spin spinning={loading}>
          {relations.length === 0 && !node ? (
            <Empty description={loading ? '知识联邦加载中…' : '无可信跨科知识关系（confidence ≥ 0.5 才推荐）'} />
          ) : (
            <List
              header={<Text strong>共 {relations.length} 条可信跨科知识关系（证据强度 ≥ 0.5）</Text>}
              dataSource={relations}
              renderItem={(r) => <RelationCard key={r.id} r={r} />}
            />
          )}
        </Spin>

        {disclaimer && (
          <Alert type="warning" style={{ marginTop: 16 }}
            message={<Text type="warning" style={{ fontSize: 12 }}><SafetyCertificateOutlined /> {disclaimer}</Text>} />
        )}
      </Content>
    </Layout>
  );
}
