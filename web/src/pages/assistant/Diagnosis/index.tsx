/**
 * 健澜科技 jlmedaios - 智能诊断建议面板（M126-B）
 *
 * 医师输入患者 ID / 症状 / 检验 / 病史，POST /api/v1/assistant/diagnosis/suggest，
 * 展示：Top3 可能诊断（按概率）+ 支持依据 + 鉴别检查建议 + 危险警示。
 *
 * 三态完备：loading（Spin）、error（Alert + 重试）、empty（未查询 / 无数据）。
 * 视觉：深海蓝 VI（主色 #0B3D6B，辅底 #E8F0F8）。
 *
 * 定位：AI 辅助鉴别，输出为"可能方向"而非确诊；红旗症状须立即人工急诊。
 * 数据安全要求：依据宪法第七章，患者标识服务端脱敏返回，本页不展示明文 ID。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, List, Progress, Row, Spin, Tag, Typography, message,
} from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA = '#0B3D6B';
const DEEP_SEA_BG = '#E8F0F8';

interface DiagnosisSymptomInput {
  name: string;
  severity?: number;
  onset?: string;
}

interface DiagnosisLabInput {
  markerCode: string;
  markerName?: string;
  value: number;
  unit?: string;
  refLow?: number | null;
  refHigh?: number | null;
}

interface DiagnosisCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  probability: number;
  supportingEvidence: string[];
  differentialExams: string[];
}

interface DiagnosisWarning {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}

interface Suggestions {
  patientIdMasked: string;
  candidates: DiagnosisCandidate[];
  warnings: DiagnosisWarning[];
  generatedAt: string;
  disclaimer: string;
}

const WARNING_TAG: Record<DiagnosisWarning['level'], { color: string; label: string; alert: 'error' | 'warning' | 'info' }> = {
  critical: { color: 'red', label: '危急', alert: 'error' },
  high: { color: 'orange', label: '高危', alert: 'warning' },
  info: { color: 'default', label: '提示', alert: 'info' },
};

/** 示例数据（便于医师快速体验；可自由编辑） */
const SAMPLE_SYMPTOMS = JSON.stringify([
  { name: '发热', severity: 6, onset: '38.5℃ 持续1天' },
  { name: '咳嗽', severity: 5, onset: '咳黄痰' },
  { name: '气促', severity: 4 },
], null, 2);

const SAMPLE_LABS = JSON.stringify([
  { markerCode: 'WBC', markerName: '白细胞', value: 13.5, unit: '10^9/L', refLow: 4, refHigh: 10 },
  { markerCode: 'NEUT', markerName: '中性粒细胞', value: 11.2, unit: '10^9/L', refLow: 2, refHigh: 7 },
  { markerCode: 'CRP', markerName: 'C反应蛋白', value: 45, unit: 'mg/L', refLow: 0, refHigh: 10 },
], null, 2);

/** 调用 BFF：POST /api/v1/assistant/diagnosis/suggest（baseURL 已含前缀） */
function suggestDiagnosis(
  patientId: string,
  symptoms: DiagnosisSymptomInput[],
  labResults: DiagnosisLabInput[],
  history: { chronicDiseases: string[]; notes: string },
) {
  return post<Suggestions>('/assistant/diagnosis/suggest', { patientId, symptoms, labResults, history });
}

export default function DiagnosisSuggestionPage() {
  const [patientId, setPatientId] = useState('');
  const [symptomsText, setSymptomsText] = useState('');
  const [labsText, setLabsText] = useState('');
  const [chronic, setChronic] = useState('');
  const [histNotes, setHistNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Suggestions | null>(null);
  const [queried, setQueried] = useState(false);

  const runSuggest = async () => {
    const pid = patientId.trim();
    if (!pid) { message.warning('请输入患者 ID'); return; }
    let symptoms: DiagnosisSymptomInput[];
    let labResults: DiagnosisLabInput[] = [];
    try {
      symptoms = symptomsText.trim() ? (JSON.parse(symptomsText) as DiagnosisSymptomInput[]) : [];
      if (!Array.isArray(symptoms)) throw new Error('symptoms 须为数组');
      if (labsText.trim()) labResults = JSON.parse(labsText) as DiagnosisLabInput[];
    } catch (e) {
      setError(`输入 JSON 格式错误：${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const chronicDiseases = chronic.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
    setLoading(true);
    setError(null);
    setQueried(true);
    try {
      const res = await suggestDiagnosis(pid, symptoms, labResults, { chronicDiseases, notes: histNotes.trim() });
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>智能诊断建议</Title>
      </Header>
      <Content style={{ padding: 24, background: DEEP_SEA_BG }}>
        {/* 输入区 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Input
                placeholder="患者 ID（仅服务端使用，展示脱敏）"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={9}>
              <Input.TextArea
                rows={3}
                placeholder='症状 JSON，如 [{"name":"胸痛","severity":8,"onset":"压榨样"}]'
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
              />
            </Col>
            <Col span={9}>
              <Input.TextArea
                rows={3}
                placeholder='检验 JSON，如 [{"markerCode":"WBC","markerName":"白细胞","value":13.5,"unit":"10^9/L","refLow":4,"refHigh":10}]'
                value={labsText}
                onChange={(e) => setLabsText(e.target.value)}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={6}>
              <Input
                placeholder="既往慢病（逗号分隔，如 高血压,糖尿病）"
                value={chronic}
                onChange={(e) => setChronic(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={12}>
              <Input
                placeholder="补充病史备注（可选）"
                value={histNotes}
                onChange={(e) => setHistNotes(e.target.value)}
                allowClear
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }} align="middle">
            <Col>
              <Button type="primary" icon={<ExperimentOutlined />} loading={loading} onClick={() => void runSuggest()}>
                生成诊断建议
              </Button>
            </Col>
            <Col>
              <Button
                size="small"
                onClick={() => {
                  setSymptomsText(SAMPLE_SYMPTOMS); setLabsText(SAMPLE_LABS);
                  setPatientId('pat_demo_0001'); setChronic('高血压');
                }}
              >
                填入示例
              </Button>
            </Col>
          </Row>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" tip="正在鉴别诊断分析…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error" showIcon
            message="诊断建议生成失败"
            description={error}
            action={<Button size="small" onClick={() => void runSuggest()}>重试</Button>}
          />
        )}

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Card>
            <Empty description={queried ? '未生成诊断建议' : '输入患者 ID 与症状/检验，开始智能诊断建议'} />
          </Card>
        )}

        {/* 数据态 */}
        {!loading && !error && data && (
          <>
            {/* 结论条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Title level={5} style={{ marginBottom: 4 }}>
                    患者 {data.patientIdMasked}
                    <Tag color="blue" style={{ marginLeft: 12 }}>Top {data.candidates.length} 可能诊断</Tag>
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.disclaimer}</Paragraph>
                </Col>
                <Col>
                  <Text type="secondary">生成时间 {data.generatedAt.slice(0, 19).replace('T', ' ')}</Text>
                </Col>
              </Row>
            </Card>

            {/* 危险警示 */}
            {data.warnings.map((w, i) => (
              <Alert
                key={i}
                style={{ marginBottom: 12 }}
                type={WARNING_TAG[w.level].alert}
                showIcon
                message={<span><Tag color={WARNING_TAG[w.level].color}>{WARNING_TAG[w.level].label}</Tag>{w.title}</span>}
                description={w.detail}
              />
            ))}

            {/* Top3 可能诊断 */}
            <Row gutter={16}>
              {data.candidates.map((c) => (
                <Col span={8} key={c.rank} style={{ marginBottom: 16 }}>
                  <Card
                    size="small"
                    title={<span>#{c.rank} {c.diagnosis} <Text type="secondary" style={{ fontSize: 12 }}>{c.icd10}</Text></span>}
                  >
                    <Progress
                      percent={Math.round(c.probability * 100)}
                      strokeColor={DEEP_SEA}
                      size="small"
                    />
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 4 }}>支持依据</Paragraph>
                    <List
                      size="small"
                      dataSource={c.supportingEvidence}
                      renderItem={(ev) => <List.Item style={{ padding: '4px 0' }}><Text style={{ fontSize: 12 }}>{ev}</Text></List.Item>}
                    />
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 4 }}>鉴别检查建议</Paragraph>
                    <div>
                      {c.differentialExams.map((ex) => <Tag key={ex} style={{ marginBottom: 4 }}>{ex}</Tag>)}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 免责声明 */}
            <Card size="small">
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                免责声明：{data.disclaimer} 本面板输出仅供参考，不构成医疗建议。
              </Paragraph>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
