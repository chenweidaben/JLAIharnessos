/**
 * 健澜科技 jlmedaios - 医学影像 AI 辅助阅片页（M138-A · 新业务场景）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 *   POST /api/v1/imaging/ai/analyze  { studyType, imageFeatures }
 *
 * 深海蓝 VI：主色 #0B3D6B。
 * 医疗安全红线：AI 仅辅助；结果必须由医师点击「确认采纳」或「驳回」后方可作为诊断依据。
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Row, Select, Space, Spin, Statistic, Tag, Typography, message,
} from 'antd';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

type StudyType = 'chest_xray' | 'ct' | 'xray';

interface FindingView {
  code: string;
  name: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  confidence: number;
  description: string;
}

interface SuggestionView {
  studyType: StudyType;
  findings: FindingView[];
  overallConfidence: number;
  normal: boolean;
  disclaimer: string;
}

interface ReportView {
  title: string;
  studyType: StudyType;
  findings: string[];
  impression: string;
  recommendations: string[];
  disclaimer: string;
}

interface AnalyzeResp {
  suggestion: SuggestionView;
  report: ReportView;
}

const STUDY_OPTIONS: { label: string; value: StudyType }[] = [
  { label: '胸片（肺炎/结节/积液）', value: 'chest_xray' },
  { label: 'CT（脑出血/骨折/占位）', value: 'ct' },
  { label: 'X光（骨折/肺炎）', value: 'xray' },
];

const SEVERITY_TAG: Record<string, { color: string; text: string }> = {
  normal: { color: 'default', text: '正常' },
  mild: { color: 'green', text: '轻度' },
  moderate: { color: 'orange', text: '中度' },
  severe: { color: 'red', text: '重度' },
};

type ConfirmStatus = 'pending' | 'confirmed' | 'rejected';

export default function ImagingAiPage() {
  const [studyType, setStudyType] = useState<StudyType>('chest_xray');
  const [opacity, setOpacity] = useState<number>(0);
  const [noduleSize, setNoduleSize] = useState<number>(0);
  const [effusion, setEffusion] = useState<boolean>(false);
  const [hemorrhage, setHemorrhage] = useState<boolean>(false);
  const [fracture, setFracture] = useState<boolean>(false);
  const [massSize, setMassSize] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<AnalyzeResp | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<ConfirmStatus>('pending');

  const buildFeatures = () => {
    return {
      opacityScore: opacity,
      noduleSizeMm: noduleSize,
      pleuralEffusion: effusion,
      intracranialHemorrhage: hemorrhage,
      fractureDetected: fracture,
      massSizeMm: massSize,
    };
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await post<AnalyzeResp>('/imaging/ai/analyze', {
        studyType,
        imageFeatures: buildFeatures(),
      });
      setResp(data);
      setConfirmStatus('pending');
      message.success('AI 初筛完成，请医师确认');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setConfirmStatus('confirmed');
    message.success('已确认采纳 AI 建议，记录将进入正式诊断流程');
  };

  const handleReject = () => {
    setConfirmStatus('rejected');
    message.info('已驳回 AI 建议，请在正式报告中手工书写');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          医学影像 AI 辅助阅片（M138-A）
        </Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="医疗安全红线：AI 仅作阅片建议，最终诊断由医师确认。"
        />

        <Card title="影像特征录入（模拟 PACS 结构化特征）" size="small" style={{ marginBottom: 16 }}>
          <Space wrap size="middle">
            <Select
              value={studyType}
              style={{ width: 280 }}
              options={STUDY_OPTIONS}
              onChange={(v) => setStudyType(v as StudyType)}
            />
            <Text>透亮度降低(0~1)</Text>
            <input
              type="range" min={0} max={1} step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
            <Text>{opacity.toFixed(2)}</Text>
            {(studyType === 'chest_xray') && (
              <>
                <Text>结节直径(mm)</Text>
                <input
                  type="number" min={0} max={80} step={1}
                  value={noduleSize}
                  onChange={(e) => setNoduleSize(Number(e.target.value))}
                />
                <Button size="small" onClick={() => setEffusion(!effusion)}>
                  胸腔积液：{effusion ? '有' : '无'}
                </Button>
              </>
            )}
            {studyType === 'ct' && (
              <>
                <Button size="small" onClick={() => setHemorrhage(!hemorrhage)}>
                  颅内出血：{hemorrhage ? '有' : '无'}
                </Button>
                <Button size="small" onClick={() => setFracture(!fracture)}>
                  骨折：{fracture ? '有' : '无'}
                </Button>
                <Text>占位直径(mm)</Text>
                <input
                  type="number" min={0} max={120} step={1}
                  value={massSize}
                  onChange={(e) => setMassSize(Number(e.target.value))}
                />
              </>
            )}
            {studyType === 'xray' && (
              <Button size="small" onClick={() => setFracture(!fracture)}>
                骨折：{fracture ? '有' : '无'}
              </Button>
            )}
            <Button type="primary" loading={loading} onClick={handleAnalyze}
              style={{ background: '#0B3D6B', borderColor: '#0B3D6B' }}>
              开始 AI 分析
            </Button>
          </Space>
        </Card>

        <Spin spinning={loading}>
          {!resp ? (
            <Card size="small"><Text type="secondary">录入影像特征后点击「开始 AI 分析」。</Text></Card>
          ) : (
            <Row gutter={16}>
              <Col span={12}>
                <Card title="AI 建议（待医师确认）" size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16} style={{ marginBottom: 12 }}>
                    <Col span={12}>
                      <Statistic title="整体置信度"
                        value={((resp.suggestion.overallConfidence ?? 0) * 100).toFixed(0)}
                        suffix="%" />
                    </Col>
                    <Col span={12}>
                      {resp.suggestion.normal
                        ? <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>未见明显异常</Tag>
                        : <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
                            检出 {resp.suggestion.findings.length} 项疑似异常
                          </Tag>}
                    </Col>
                  </Row>
                  {resp.suggestion.findings.map((f) => {
                    const sev = SEVERITY_TAG[f.severity] ?? { color: 'default', text: f.severity };
                    return (
                      <div key={f.code} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <Space>
                          <Tag color={sev.color}>{sev.text}</Tag>
                          <Text strong>{f.name}</Text>
                          <Text type="secondary">置信度 {(f.confidence * 100).toFixed(0)}%</Text>
                        </Space>
                        <div><Text type="secondary" style={{ fontSize: 12 }}>{f.description}</Text></div>
                      </div>
                    );
                  })}
                  <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                    {resp.suggestion.disclaimer}
                  </Paragraph>
                </Card>

                <Card title="医生确认" size="small">
                  {confirmStatus === 'pending' && (
                    <Space>
                      <Button type="primary" onClick={handleConfirm}
                        style={{ background: '#0B3D6B', borderColor: '#0B3D6B' }}>
                        确认采纳 AI 建议
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
                <Card title={resp.report.title} size="small">
                  <Title level={5} style={{ marginTop: 0 }}>所见</Title>
                  <ul>{resp.report.findings.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  <Title level={5}>印象</Title>
                  <Paragraph strong>{resp.report.impression}</Paragraph>
                  <Title level={5}>建议</Title>
                  <ul>{resp.report.recommendations.map((t, i) => <li key={i}>{t}</li>)}</ul>
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
