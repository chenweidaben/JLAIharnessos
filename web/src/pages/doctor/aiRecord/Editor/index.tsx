/**
 * 健澜科技 jlmedaios - M144-B AI 病历自动生成 · 医师编辑页
 *
 * 【AI核心能力深化】医生修改后用于模型优化：
 *   - 医师录入就诊 ID 与自由口述/批注，一键 AI 起稿六段病历；
 *   - 六段（主诉/现病史/既往史/体格检查/初步诊断/处理意见）逐段可编辑；
 *   - 提交修改复核后，逐段 diff 留痕（修改前 → 修改后），作为模型优化学习信号。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Layout,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { RobotOutlined, SaveOutlined, DiffOutlined } from '@ant-design/icons';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const GREEN = '#52c41a';

/** 六段（与 BFF generateMedicalRecord.sections 对齐） */
type SectionKey =
  | 'chiefComplaint'
  | 'presentIllness'
  | 'pastHistory'
  | 'physicalExam'
  | 'diagnosis'
  | 'treatmentPlan';

const SECTION_LABELS: Record<SectionKey, string> = {
  chiefComplaint: '主诉',
  presentIllness: '现病史',
  pastHistory: '既往史',
  physicalExam: '体格检查',
  diagnosis: '初步诊断',
  treatmentPlan: '处理意见',
};

type Sections = Record<SectionKey, string>;

interface DraftData {
  id: string;
  visitId: string;
  patientIdMasked: string;
  sections: Sections;
  content: string;
  disclaimer: string;
  modelVersion: string;
}

interface SectionDiffItem {
  section: SectionKey;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

const EMPTY_SECTIONS: Sections = {
  chiefComplaint: '',
  presentIllness: '',
  pastHistory: '',
  physicalExam: '',
  diagnosis: '',
  treatmentPlan: '',
};

export default function AiRecordEditorPage() {
  const [visitId, setVisitId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [dept, setDept] = useState<string>('');

  const [draft, setDraft] = useState<DraftData | null>(null);
  const [sections, setSections] = useState<Sections>(EMPTY_SECTIONS);
  const [beforeSections, setBeforeSections] = useState<Sections | null>(null);
  const [diffList, setDiffList] = useState<SectionDiffItem[]>([]);

  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  /** AI 起稿 */
  const handleGenerate = async () => {
    if (!visitId.trim()) {
      message.warning('请先填写就诊 ID');
      return;
    }
    setGenerating(true);
    setDiffList([]);
    try {
      const data = await post<DraftData>('/ai/generate-record', {
        visitId: visitId.trim(),
        doctorNotes: notes,
        patientInfo: {
          gender: gender.trim() || undefined,
          age: age ? Number(age) : undefined,
          department: dept.trim() || undefined,
        },
      });
      setDraft(data);
      setSections({ ...data.sections });
      setBeforeSections({ ...data.sections });
      message.success('AI 病历草稿已生成，请逐段核对修改');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'AI 病历生成失败');
    } finally {
      setGenerating(false);
    }
  };

  /** 逐段更新 */
  const updateSection = (key: SectionKey, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  /** 提交修改复核：diff 留痕 + 学习信号回传 */
  const handleSubmit = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await post<{ recordId: string }>(`/ai/generate-record/${draft.id}/improve`, {
        sections,
        note: '医师复核修改后提交',
      });
      // 前端本地计算 diff 用于展示（与 BFF computeSectionDiff 口径一致）
      const before = beforeSections ?? draft.sections;
      const diff: SectionDiffItem[] = (Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => ({
        section: k,
        label: SECTION_LABELS[k],
        before: before[k] ?? '',
        after: sections[k] ?? '',
        changed: (before[k] ?? '').trim() !== (sections[k] ?? '').trim(),
      }));
      setDiffList(diff);
      setBeforeSections({ ...sections });
      message.success(`修改已留痕，已用于病历生成模型优化（recordId=${res.recordId}）`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '提交修改复核失败');
    } finally {
      setSaving(false);
    }
  };

  const changedCount = diffList.filter((d) => d.changed).length;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          <RobotOutlined style={{ marginRight: 8 }} />
          AI 病历自动生成（医师编辑）
        </Title>
        {draft && (
          <Tag color={MID_BLUE} style={{ marginRight: 12 }}>
            {draft.modelVersion} · {draft.patientIdMasked}
          </Tag>
        )}
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        <Row gutter={[16, 16]}>
          {/* 输入区 */}
          <Col xs={24} lg={8}>
            <Card title="起稿输入" style={{ borderRadius: 8 }}>
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                录入就诊 ID 与医师口述/批注，AI 将自动结构化为六段病历草稿。
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Input
                  placeholder="就诊 ID（必填），如 vis_0001"
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                />
                <TextArea
                  rows={5}
                  placeholder="医师口述/批注，逐行输入，例如：&#10;咳嗽咳痰3天，发热1天&#10;无胸闷胸痛"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Row gutter={8}>
                  <Col span={8}>
                    <Input placeholder="性别" value={gender} onChange={(e) => setGender(e.target.value)} />
                  </Col>
                  <Col span={8}>
                    <Input placeholder="年龄" value={age} onChange={(e) => setAge(e.target.value)} />
                  </Col>
                  <Col span={8}>
                    <Input placeholder="科室" value={dept} onChange={(e) => setDept(e.target.value)} />
                  </Col>
                </Row>
                <Button
                  type="primary"
                  block
                  icon={<RobotOutlined />}
                  loading={generating}
                  onClick={() => void handleGenerate()}
                  style={{ background: MID_BLUE, borderColor: MID_BLUE }}
                >
                  AI 生成草稿
                </Button>
              </Space>
            </Card>

            {/* 修改前后 diff */}
            {diffList.length > 0 && (
              <Card
                title={
                  <span>
                    <DiffOutlined style={{ marginRight: 6 }} />
                    修改前后留痕（{changedCount} 段已修改）
                  </span>
                }
                style={{ borderRadius: 8, marginTop: 16 }}
              >
                {diffList.map((d) => (
                  <div key={d.section} style={{ marginBottom: 12 }}>
                    <Space size={8}>
                      <Tag color={d.changed ? GREEN : 'default'}>
                        {d.label}
                      </Tag>
                      {d.changed && <Text type="secondary" style={{ fontSize: 12 }}>已修改 → 用于学习</Text>}
                    </Space>
                    {d.changed && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <div style={{ color: 'rgba(0,0,0,0.45)' }}>修改前：{d.before || '（空）'}</div>
                        <div style={{ color: DEEP_BG, marginTop: 4 }}>修改后：{d.after}</div>
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </Col>

          {/* 六段编辑区 */}
          <Col xs={24} lg={16}>
            <Card
              title="病历草稿（逐段核对修改）"
              style={{ borderRadius: 8 }}
              extra={
                draft ? (
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => void handleSubmit()}
                    style={{ background: ACCENT, borderColor: ACCENT }}
                  >
                    提交修改复核
                  </Button>
                ) : undefined
              }
            >
              {generating ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <Spin size="large" tip="AI 正在结构化病历…" />
                </div>
              ) : !draft ? (
                <Alert
                  type="info"
                  showIcon
                  message="尚未生成草稿"
                  description="在左侧填写就诊 ID 与口述内容，点击「AI 生成草稿」开始。"
                />
              ) : (
                <>
                  {draft.disclaimer && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      message={draft.disclaimer}
                    />
                  )}
                  {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <Text strong style={{ color: MID_BLUE, display: 'block', marginBottom: 4 }}>
                        {SECTION_LABELS[key]}
                      </Text>
                      <TextArea
                        rows={key === 'treatmentPlan' || key === 'presentIllness' ? 4 : 2}
                        value={sections[key]}
                        onChange={(e) => updateSection(key, e.target.value)}
                      />
                    </div>
                  ))}
                  <Divider style={{ margin: '12px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    提交后，医师修改将与 AI 原稿逐段 diff 留痕，并作为病历生成模型优化的监督样本。
                  </Text>
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
