/**
 * 健澜科技 jlmedaios - 医学影像 AI 能力深化 · 病灶级阅片页（M152-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 *   POST /imaging/ai/lesion  { modality, studyUid, imageFeatures }
 *
 * 深海蓝 VI：主色 #0B3D6B。
 * 医疗安全红线：AI 只是辅助，辅助诊断，最终由医生确认；
 *               结果须由医师点击「确认采纳」或「驳回」后方可作为诊断依据。
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Row, Select, Space, Spin, Statistic, Tag, Typography, message,
} from 'antd';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

type ImagingModality = 'CT' | 'MRI' | 'X-ray' | 'Ultrasound';

interface LesionFindingView {
  lesionCode: string;
  lesionName: string;
  lesionLocation: string;
  lesionSize: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe';
  differentialList: string[];
  description: string;
}

interface LesionAnalysisView {
  modality: ImagingModality;
  lesionDetected: boolean;
  lesions: LesionFindingView[];
  overallConfidence: number;
  differentialList: string[];
  disclaimer: string;
}

interface ReportSectionView {
  title: string;
  items: string[];
}

interface StructuredReportView {
  reportId: string;
  studyUid: string;
  modality: ImagingModality;
  sections: ReportSectionView[];
  impression: string;
  differentialDiagnosis: string[];
  recommendation: string[];
  disclaimer: string;
}

interface LesionResp {
  analysis: LesionAnalysisView;
  report: StructuredReportView;
}

const MODALITY_OPTIONS: { label: string; value: ImagingModality }[] = [
  { label: 'CT（肺/腹/骨）', value: 'CT' },
  { label: 'MRI（脑/软组织）', value: 'MRI' },
  { label: 'X 线（骨/胸片）', value: 'X-ray' },
  { label: '超声（腹/小器官）', value: 'Ultrasound' },
];

const BOUNDARY_OPTIONS = [
  { label: '清晰', value: 'clear' },
  { label: '模糊', value: 'blurred' },
  { label: '毛刺状', value: 'spiculated' },
  { label: '不规则', value: 'irregular' },
];

const ECHO_OPTIONS: { label: string; value: string }[] = [
  { label: '低密/低信号', value: 'low' },
  { label: '等密/等信号', value: 'iso' },
  { label: '高密/高信号', value: 'high' },
  { label: '混合', value: 'mixed' },
  { label: '无回声(囊肿)', value: 'anechoic' },
  { label: '低回声', value: 'hypoechoic' },
  { label: '高回声', value: 'hyperechoic' },
];

const SEVERITY_TAG: Record<string, { color: string; text: string }> = {
  mild: { color: 'green', text: '轻度' },
  moderate: { color: 'orange', text: '中度' },
  severe: { color: 'red', text: '重度' },
};

type ConfirmStatus = 'pending' | 'confirmed' | 'rejected';

export default function ImagingAiReviewPage() {
  const [modality, setModality] = useState<ImagingModality>('CT');
  const [studyUid, setStudyUid] = useState<string>('STUDY-DEMO-0001');
  const [lesionDetected, setLesionDetected] = useState<boolean>(true);
  const [location, setLocation] = useState<string>('右肺上叶');
  const [sizeMm, setSizeMm] = useState<number>(20);
  const [boundary, setBoundary] = useState<string>('spiculated');
  const [density, setDensity] = useState<string>('low');
  const [lymph, setLymph] = useState<boolean>(false);
  const [edema, setEdema] = useState<boolean>(false);
  const [calc, setCalc] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<LesionResp | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>('pending');

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await post<LesionResp>('/imaging/ai/lesion', {
        modality,
        studyUid,
        imageFeatures: {
          lesionDetected,
          lesionLocation: location,
          lesionSizeMm: sizeMm,
          boundary: boundary as 'clear' | 'blurred' | 'spiculated' | 'irregular',
          densityOrSignal: density as
            | 'low' | 'iso' | 'high' | 'mixed'
            | 'anechoic' | 'hypoechoic' | 'hyperechoic' | 'mixed-echo',
          lymphNodeEnlarged: lymph,
          perilesionalEdema: edema,
          calcification: calc,
        },
      });
      setResp(data);
      setConfirmStatus('pending');
      message.success('AI 病灶级分析完成，请医师确认');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setConfirmStatus('confirmed');
    message.success('已确认采纳 AI 结果，记录将进入正式诊断流程');
  };

  const handleReject = () => {
    setConfirmStatus('rejected');
    message.info('已驳回 AI 结果，请在正式报告中手工书写');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          影像 AI 病灶级阅片（M152-A · AI能力深化）
        </Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="医疗安全红线：AI 只是辅助，辅助诊断，最终由医生确认。"
        />

        <Card title="检查与病灶特征录入（模拟 PACS 结构化特征）" size="small" style={{ marginBottom: 16 }}>
          <Space wrap size="middle">
            <Select
              value={modality}
              style={{ width: 220 }}
              options={MODALITY_OPTIONS}
              onChange={(v) => setModality(v as ImagingModality)}
            />
            <Text>检查号 studyUid</Text>
            <input
              type="text"
              value={studyUid}
              onChange={(e) => setStudyUid(e.target.value)}
              style={{ width: 180 }}
            />
            <Button size="small" onClick={() => setLesionDetected(!lesionDetected)}>
              检出病灶：{lesionDetected ? '是' : '否'}
            </Button>
            <Text>解剖定位</Text>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: 140 }} />
            <Text>最大径(mm)</Text>
            <input type="number" min={0} max={200} value={sizeMm} onChange={(e) => setSizeMm(Number(e.target.value))} />
            <Select value={boundary} style={{ width: 130 }} options={BOUNDARY_OPTIONS} onChange={setBoundary} />
            <Select value={density} style={{ width: 150 }} options={ECHO_OPTIONS} onChange={setDensity} />
            <Button size="small" onClick={() => setLymph(!lymph)}>肿大淋巴结：{lymph ? '有' : '无'}</Button>
            <Button size="small" onClick={() => setEdema(!edema)}>瘤周水肿：{edema ? '有' : '无'}</Button>
            <Button size="small" onClick={() => setCalc(!calc)}>钙化：{calc ? '有' : '无'}</Button>
            <Button type="primary" loading={loading} onClick={handleAnalyze}
              style={{ background: '#0B3D6B', borderColor: '#0B3D6B' }}>
              开始 AI 病灶分析
            </Button>
          </Space>
        </Card>

        <Spin spinning={loading}>
          {!resp ? (
            <Card size="small"><Text type="secondary">录入检查号与病灶特征后点击「开始 AI 病灶分析」。</Text></Card>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Card title="AI 病灶分析（待医师确认）" size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col span={12}>
                      <Statistic title="整体置信度"
                        value={((resp.analysis.overallConfidence ?? 0) * 100).toFixed(0)}
                        suffix="%" />
                    </Col>
                    <Col span={12}>
                      {!resp.analysis.lesionDetected
                        ? <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>未见明确病灶</Tag>
                        : <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
                            检出 {resp.analysis.lesions.length} 处病灶
                          </Tag>}
                    </Col>
                  </Row>
                  {resp.analysis.lesions.map((l) => {
                    const sev = SEVERITY_TAG[l.severity] ?? { color: 'default', text: l.severity };
                    return (
                      <div key={l.lesionCode} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <Space wrap>
                          <Tag color={sev.color}>{sev.text}</Tag>
                          <Text strong>{l.lesionName}</Text>
                          <Text type="secondary">定位：{l.lesionLocation}</Text>
                          <Text type="secondary">大小：{l.lesionSize}</Text>
                          <Text type="secondary">置信度 {(l.confidence * 100).toFixed(0)}%</Text>
                        </Space>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>{l.description}</Text></div>
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>鉴别诊断：</Text>
                          {l.differentialList.map((d) => <Tag key={d} style={{ marginLeft: 4 }}>{d}</Tag>)}
                        </div>
                      </div>
                    );
                  })}
                  <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                    {resp.analysis.disclaimer}
                  </Paragraph>
                </Card>

                <Card title="医生确认" size="small">
                  {confirmStatus === 'pending' && (
                    <Space>
                      <Button type="primary" onClick={handleConfirm}
                        style={{ background: '#0B3D6B', borderColor: '#0B3D6B' }}>
                        确认采纳 AI 结果
                      </Button>
                      <Button danger onClick={handleReject}>驳回</Button>
                    </Space>
                  )}
                  {confirmStatus === 'confirmed' && (
                    <Alert type="success" showIcon message="已确认采纳，记录进入正式诊断流程。" />
                  )}
                  {confirmStatus === 'rejected' && (
                    <Alert type="info" showIcon message="已驳回，请医师手工书写正式报告。" />
                  )}
                </Card>
              </Col>

              <Col span={12}>
                <Card title={`结构化报告草稿（${resp.report.reportId}）`} size="small">
                  <Title level={5} style={{ marginTop: 0 }}>印象</Title>
                  <Paragraph strong>{resp.report.impression}</Paragraph>
                  {resp.report.sections.map((s) => (
                    <div key={s.title}>
                      <Title level={5}>{s.title}</Title>
                      <ul>{s.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    </div>
                  ))}
                  <Title level={5}>建议</Title>
                  <ul>{resp.report.recommendation.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  <Paragraph type="secondary" style={{ fontSize: 12 }}>{resp.report.disclaimer}</Paragraph>
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
