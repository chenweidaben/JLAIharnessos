/**
 * 健澜科技 jlmedaios - 智能病历草稿生成面板（M126-A）
 *
 * 医师输入就诊ID、症状、检验指标（JSON）与初步诊断，POST /api/v1/assistant/record/draft，
 * 按病历规范七段式（主诉/现病史/既往史/体格检查/辅助检查/初步诊断/处理意见）生成草稿，
 * 整稿在 TextArea 中直接编辑修改。
 *
 * 三态完备：loading（Spin）、error（Alert + 重试）、empty（未生成 / 无数据）。
 * 视觉：深海蓝 VI（主色 #0B3D6B，辅底 #E8F0F8）。
 *
 * 【AI能力升级】定位为"起稿助手"：生成内容须经主治医师审核修改后方可归档；
 * 患者原始标识服务端脱敏返回，本页仅展示脱敏标识，不回显明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  Alert, Button, Card, Col, Empty, Input, Layout, Row, Spin, Tag, Typography, message,
} from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA = '#0B3D6B';
const DEEP_SEA_BG = '#E8F0F8';

interface DraftLabItem {
  markerName: string;
  value: string;
  unit: string;
  abnormal?: 'high' | 'low' | 'normal' | null;
}

interface DraftRecordSections {
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  auxiliaryExam: string;
  diagnosis: string;
  treatmentPlan: string;
}

interface DraftRecord {
  visitId: string;
  patientIdMasked: string;
  sections: DraftRecordSections;
  content: string;
  disclaimer: string;
  generatedAt: string;
  modelVersion: string;
}

const SECTION_META: Array<{ key: keyof DraftRecordSections; label: string }> = [
  { key: 'chiefComplaint', label: '主诉' },
  { key: 'presentIllness', label: '现病史' },
  { key: 'pastHistory', label: '既往史' },
  { key: 'physicalExam', label: '体格检查' },
  { key: 'auxiliaryExam', label: '辅助检查' },
  { key: 'diagnosis', label: '初步诊断' },
  { key: 'treatmentPlan', label: '处理意见' },
];

/** 示例数据（便于医师快速体验；生成后可在编辑区直接修改） */
const SAMPLE_VISIT_ID = 'vis_demo_0001';
const SAMPLE_PATIENT_ID = 'pat_demo_0001';
const SAMPLE_SYMPTOMS = '咳嗽咳痰3天\n发热1天，最高体温38.9℃';
const SAMPLE_DIAGNOSIS = '社区获得性肺炎';
const SAMPLE_LABS = JSON.stringify([
  { markerName: '白细胞', value: '13.5', unit: '×10^9/L', abnormal: 'high' },
  { markerName: 'C反应蛋白', value: '45', unit: 'mg/L', abnormal: 'high' },
  { markerName: '血红蛋白', value: '135', unit: 'g/L', abnormal: 'normal' },
], null, 2);

/** 调用 BFF：POST /api/v1/assistant/record/draft（baseURL 已含前缀） */
function generateDraft(payload: Record<string, unknown>) {
  return post<DraftRecord>('/assistant/record/draft', payload);
}

export default function RecordDraftPage() {
  const [visitId, setVisitId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [symptomsText, setSymptomsText] = useState('');
  const [labsText, setLabsText] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DraftRecord | null>(null);
  const [contentText, setContentText] = useState('');
  const [generated, setGenerated] = useState(false);

  const runGenerate = async () => {
    const vid = visitId.trim();
    if (!vid) { message.warning('请输入就诊 ID'); return; }
    const symptoms = symptomsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    let labs: DraftLabItem[] = [];
    if (labsText.trim()) {
      try {
        labs = JSON.parse(labsText) as DraftLabItem[];
        if (!Array.isArray(labs)) throw new Error('labs 须为数组');
      } catch (e) {
        setError(`检验指标 JSON 格式错误：${e instanceof Error ? e.message : String(e)}`);
        return;
      }
    }
    const diagnosis = diagnosisText
      .split(/[，,；;]/)
      .map((d) => d.trim())
      .filter(Boolean);

    setLoading(true);
    setError(null);
    try {
      const res = await generateDraft({
        visitId: vid,
        patientInfo: { patientId: patientId.trim(), gender: '待补充', age: null },
        symptoms,
        labs,
        diagnosis,
      });
      setData(res);
      setContentText(res.content);
      setGenerated(true);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const fillSample = () => {
    setVisitId(SAMPLE_VISIT_ID);
    setPatientId(SAMPLE_PATIENT_ID);
    setSymptomsText(SAMPLE_SYMPTOMS);
    setLabsText(SAMPLE_LABS);
    setDiagnosisText(SAMPLE_DIAGNOSIS);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_SEA, display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>智能病历草稿生成</Title>
      </Header>
      <Content style={{ padding: 24, background: DEEP_SEA_BG }}>
        {/* 输入区 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Input
                placeholder="就诊 ID（必填）"
                value={visitId}
                onChange={(e) => setVisitId(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Input
                placeholder="患者 ID（仅服务端使用，展示脱敏）"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={12}>
              <Input
                placeholder="初步诊断（多个用逗号分隔，如：社区获得性肺炎）"
                value={diagnosisText}
                onChange={(e) => setDiagnosisText(e.target.value)}
                allowClear
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={12}>
              <Input.TextArea
                rows={3}
                placeholder="症状 / 主诉素材，每行一项，如：&#10;咳嗽咳痰3天&#10;发热1天"
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
              />
            </Col>
            <Col span={12}>
              <Input.TextArea
                rows={3}
                placeholder='检验指标 JSON（可选），如 [{"markerName":"白细胞","value":"13.5","unit":"×10^9/L","abnormal":"high"}]'
                value={labsText}
                onChange={(e) => setLabsText(e.target.value)}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }} align="middle">
            <Col>
              <Button type="primary" icon={<FileTextOutlined />} loading={loading} onClick={() => void runGenerate()}>
                生成病历草稿
              </Button>
            </Col>
            <Col>
              <Button size="small" onClick={fillSample}>填入示例</Button>
            </Col>
          </Row>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" tip="正在生成病历草稿…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error" showIcon
            message="病历草稿生成失败"
            description={error}
            action={<Button size="small" onClick={() => void runGenerate()}>重试</Button>}
          />
        )}

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Card>
            <Empty description={generated ? '本次未生成草稿，请调整输入后重试' : '输入就诊 ID、症状与初步诊断，一键生成病历草稿'} />
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
                    就诊 {data.visitId}
                    <Tag color="geekblue" style={{ marginLeft: 12 }}>{data.patientIdMasked}</Tag>
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>{data.disclaimer}</Paragraph>
                </Col>
                <Col>
                  <Text type="secondary">
                    {data.modelVersion} · {data.generatedAt.slice(0, 19).replace('T', ' ')}
                  </Text>
                </Col>
              </Row>
            </Card>

            <Row gutter={16}>
              {/* 整稿编辑区 */}
              <Col span={14} style={{ marginBottom: 16 }}>
                <Card title="草稿整稿（可直接编辑）" size="small">
                  <Input.TextArea
                    rows={20}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                  />
                  <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    提示：编辑后内容为医师修改稿，归档前请核对七段完整性。
                  </Paragraph>
                </Card>
              </Col>

              {/* 七段结构预览 */}
              <Col span={10} style={{ marginBottom: 16 }}>
                <Card title="病历七段结构" size="small">
                  {SECTION_META.map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <Tag color={DEEP_SEA}>{label}</Tag>
                      <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
                        {data.sections[key]}
                      </Paragraph>
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
