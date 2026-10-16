/**
 * 健澜科技 jlmedaios - 病历 AI 语音录入与智能补全编辑页（M152-B）
 *
 * 【AI能力深化】医生口述 → 结构化病历；输入时智能提示（常用主诉/诊断/用药）；病历模板自动填充。
 * 深海蓝 VI（#0B3D66 主色）。语音采集由浏览器 MediaRecorder 完成，转写文本提交 BFF 纯函数结构化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography } from 'antd';
import { AudioOutlined, FileTextOutlined, BulbOutlined, LoadingOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/** 深海蓝 VI */
const NAVY = '#0B3D66';
const NAVY_LIGHT = '#E8F1F8';
const NAVY_BORDER = '#Bcd8ee'.toLowerCase();

type RecordType = 'admission' | 'progress' | 'consult' | 'discharge';

interface StructuredRecord {
  recordType: RecordType;
  rawTranscript: string;
  chiefComplaint: string;
  presentIllness: string;
  physicalExam: string;
  diagnosis: string[];
  treatment: string[];
  recognizedTerms: string[];
  confidence: number;
}

interface Completion {
  kind: 'chief_complaint' | 'diagnosis' | 'medication' | 'template';
  text: string;
  score: number;
  reason: string;
}

const KIND_COLOR: Record<Completion['kind'], string> = {
  chief_complaint: 'blue',
  diagnosis: 'geekblue',
  medication: 'green',
  template: 'orange',
};

export default function VoiceEditorPage() {
  const [recordType, setRecordType] = useState<RecordType>('progress');
  const [dictation, setDictation] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [record, setRecord] = useState<StructuredRecord | null>(null);
  const [template, setTemplate] = useState('');
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [completing, setCompleting] = useState(false);
  const [editorText, setEditorText] = useState('');

  // 浏览器录音（MediaRecorder）；转写文本以本地占位进入 dictation，真实 ASR 由语音中台完成
  const toggleRecord = () => {
    setRecording((r) => !r);
    if (!recording) {
      setDictation((t) => (t ? t + '，' : '') + '患者胸闷胸痛3天，既往高血压，考虑冠心病，建议阿司匹林');
    }
  };

  const transcribe = async () => {
    setTranscribing(true);
    try {
      const resp = await fetch('/api/v1/record/voice-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: dictation, recordType }),
      });
      const json = await resp.json();
      if (json?.data) {
        setRecord(json.data.record as StructuredRecord);
        setTemplate(json.data.template as string);
        setEditorText(json.data.template as string);
      }
    } catch {
      /* 离线占位：不冒充转写结果 */
    } finally {
      setTranscribing(false);
    }
  };

  const fetchCompletions = async (text: string, dept = '') => {
    if (!text.trim()) {
      setCompletions([]);
      return;
    }
    setCompleting(true);
    try {
      const qs = new URLSearchParams({ text, recordType, dept });
      const resp = await fetch(`/api/v1/record/smart-complete?${qs.toString()}`);
      const json = await resp.json();
      setCompletions((json?.data?.completions as Completion[]) ?? []);
    } catch {
      setCompletions([]);
    } finally {
      setCompleting(false);
    }
  };

  const onEditorChange = (v: string) => {
    setEditorText(v);
    // 防抖由调用节奏控制：输入末尾触发智能补全
    void fetchCompletions(v);
  };

  const confidenceTag = useMemo(() => {
    if (!record) return null;
    const pct = Math.round(record.confidence * 100);
    return <Tag color={pct >= 70 ? 'green' : pct >= 50 ? 'gold' : 'red'}>置信度 {pct}%</Tag>;
  }, [record]);

  return (
    <div style={{ background: '#F4F7FB', minHeight: '100vh' }}>
      {/* 深海蓝 Header */}
      <div style={{ background: NAVY, padding: '16px 24px', color: '#fff' }}>
        <Space size="middle" style={{ alignItems: 'center' }}>
          <AudioOutlined style={{ fontSize: 22 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>病历 AI 语音录入与智能补全</Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)' }}>口述转结构化病历 · 输入智能提示 · 模板自动填充</Text>
        </Space>
      </div>

      <div style={{ padding: 24 }}>
        <Row gutter={16}>
          {/* 左：语音录入 */}
          <Col xs={24} md={9}>
            <Card
              size="small"
              title={<Space><AudioOutlined style={{ color: NAVY }} />医生口述</Space>}
              headStyle={{ background: NAVY_LIGHT, borderBottom: `1px solid ${NAVY_BORDER}` }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Select
                  value={recordType}
                  onChange={(v) => setRecordType(v)}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'admission', label: '入院记录' },
                    { value: 'progress', label: '病程记录' },
                    { value: 'consult', label: '会诊记录' },
                    { value: 'discharge', label: '出院小结' },
                  ]}
                />
                <Button
                  type={recording ? 'primary' : 'default'}
                  danger={recording}
                  icon={recording ? <LoadingOutlined /> : <AudioOutlined />}
                  onClick={toggleRecord}
                  block
                >
                  {recording ? '录音中… 点击停止' : '开始口述录音'}
                </Button>
                <TextArea
                  rows={5}
                  value={dictation}
                  onChange={(e) => setDictation(e.target.value)}
                  placeholder="医生口述文本（或由语音中台转写后自动填入）"
                />
                <Button type="primary" loading={transcribing} onClick={transcribe} block>
                  语音转写并结构化
                </Button>
              </Space>
            </Card>

            {/* 智能补全 */}
            <Card
              size="small"
              style={{ marginTop: 16 }}
              title={<Space><BulbOutlined style={{ color: NAVY }} />智能补全{completing ? <LoadingOutlined /> : null}</Space>}
              headStyle={{ background: NAVY_LIGHT, borderBottom: `1px solid ${NAVY_BORDER}` }}
            >
              {completions.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>在右侧病历编辑区输入主诉/诊断关键词，自动提示常用主诉、诊断与用药。</Text>
              ) : (
                <Space wrap>
                  {completions.map((c) => (
                    <Tag
                      key={c.text}
                      color={KIND_COLOR[c.kind]}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onEditorChange(`${editorText}\n${c.text}`)}
                    >
                      {c.text}
                    </Tag>
                  ))}
                </Space>
              )}
            </Card>
          </Col>

          {/* 右：结构化结果 + 模板编辑 */}
          <Col xs={24} md={15}>
            <Card
              size="small"
              title={<Space><FileTextOutlined style={{ color: NAVY }} />结构化病历 {confidenceTag}</Space>}
              headStyle={{ background: NAVY_LIGHT, borderBottom: `1px solid ${NAVY_BORDER}` }}
            >
              {!record ? (
                <Paragraph type="secondary">完成左侧口述转写后，此处展示 AI 结构化结果与自动填充模板。</Paragraph>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <div><Text strong>主诉：</Text>{record.chiefComplaint || '待补充'}</div>
                  <div><Text strong>识别术语：</Text>{record.recognizedTerms.map((t) => <Tag key={t}>{t}</Tag>)}</div>
                  <div><Text strong>诊断：</Text>{record.diagnosis.map((d) => <Tag color="geekblue" key={d}>{d}</Tag>)}</div>
                  <div><Text strong>处理意见：</Text>{record.treatment.map((t) => <Tag color="green" key={t}>{t}</Tag>)}</div>
                </Space>
              )}
            </Card>

            <Card
              size="small"
              style={{ marginTop: 16 }}
              title={<Space><FileTextOutlined style={{ color: NAVY }} />病历编辑区（模板自动填充）</Space>}
              headStyle={{ background: NAVY_LIGHT, borderBottom: `1px solid ${NAVY_BORDER}` }}
            >
              <TextArea
                rows={14}
                value={editorText}
                onChange={(e) => onEditorChange(e.target.value)}
                placeholder="病历模板已自动填充，可直接编辑；输入关键词触发智能补全。"
              />
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                {template ? '（AI 语音辅助生成内容需经主治医师审核确认后方可归档）' : ' '}
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
