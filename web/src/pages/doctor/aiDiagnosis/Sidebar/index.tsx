/**
 * 健澜科技 jlmedaios - AI核心能力深化（M144-A）：门诊医生助手侧边栏
 *
 * 【使用场景】门诊医生在诊间录入主诉/症状后，侧边栏实时给出：
 *   Top3 可能诊断（带置信度）/ 鉴别诊断 / 建议检查 / 治疗方向 / 红旗提示。
 *
 * 医疗安全红线：AI 只是建议，最终决定权在医生；
 *   医生「采纳 Top1 / 修改后采纳 / 驳回」都会回写留痕，回流用于模型优化。
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
  Divider,
  Input,
  Progress,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { post } from '@/services/request';
import { useAuthStore } from '@/store/authStore';

const { Title, Text, Paragraph } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';
const GREEN = '#52c41a';
const RED = '#f5222d';
const GOLD = '#faad14';

/* 与 BFF POST /api/v1/ai/diagnose 响应 data 对齐 */
interface AiCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  confidence: number;
  evidence: string[];
}
interface AiRiskWarning {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}
interface Suggestion {
  suggestionId: string;
  topCandidates: AiCandidate[];
  differential: string[];
  suggestedExams: string[];
  treatmentDirections: string[];
  riskWarnings: AiRiskWarning[];
  disclaimer: string;
}

interface DoctorStats {
  total: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  top1MatchRate: number;
}

/** 置信度条颜色：高=绿、中=蓝、低=灰 */
function confidenceColor(conf: number): string {
  if (conf >= 0.66) return GREEN;
  if (conf >= 0.4) return ACCENT;
  return '#bfbfbf';
}

export default function AiDiagnosisSidebar() {
  const doctorId = useAuthStore((s) => s.user?.id ?? 'demo');

  const [symptomsText, setSymptomsText] = useState<string>('');
  const [age, setAge] = useState<string>('50');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [historyText, setHistoryText] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [feedbackDone, setFeedbackDone] = useState<string>('');

  /** 生成 AI 诊断建议 */
  const handleGenerate = async () => {
    setLoading(true);
    setFeedbackDone('');
    try {
      const symptoms = symptomsText
        .split(/[,，、\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
      const data = await post<Suggestion>('/ai/diagnose', {
        mode: 'generate',
        symptoms,
        patientAge: Number(age) || 0,
        patientGender: gender,
        history: {
          chronicDiseases: historyText
            .split(/[,，、\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setSuggestion(data);
    } catch (e) {
      setSuggestion(null);
      window.alert(e instanceof Error ? e.message : 'AI 诊断建议生成失败');
    } finally {
      setLoading(false);
    }
  };

  /** 医生采纳 / 修改 / 驳回，回写留痕 */
  const handleFeedback = async (action: 'accepted' | 'modified' | 'rejected') => {
    if (!suggestion) return;
    try {
      const data = await post<DoctorStats>('/ai/diagnose', {
        mode: 'feedback',
        userDiagnosis: action === 'accepted' ? suggestion.topCandidates[0]?.diagnosis ?? '' : '',
        suggestion,
        feedback: { doctorId, action },
      });
      setStats(data);
      setFeedbackDone(
        action === 'accepted' ? '已采纳 AI Top1，留痕完成'
          : action === 'modified' ? '已按修改后诊断留痕'
          : '已驳回该建议，留痕完成',
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '反馈留痕失败');
    }
  };

  return (
    <Card
      style={{ borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      {/* 头部：深海蓝 */}
      <div style={{ background: DEEP_BG, padding: '14px 16px' }}>
        <Title level={5} style={{ color: '#fff', margin: 0 }}>
          <ThunderboltOutlined style={{ color: ACCENT, marginRight: 8 }} />
          AI 诊断助手
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
          AI 仅供参考，最终诊断由您决定
        </Text>
      </div>

      <div style={{ padding: 16 }}>
        {/* 录入区 */}
        <Text strong style={{ color: DEEP_BG }}>主诉症状（逗号分隔）</Text>
        <Input.TextArea
          rows={2}
          value={symptomsText}
          onChange={(e) => setSymptomsText(e.target.value)}
          placeholder="如：胸痛、胸闷、压榨样"
          style={{ marginTop: 6 }}
        />
        <Space style={{ marginTop: 10, width: '100%' }} direction="vertical" size={8}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              addonBefore="年龄"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, ''))}
              style={{ width: '50%' }}
            />
            <Select
              style={{ width: '50%' }}
              placeholder="性别"
              value={gender || undefined}
              onChange={(v) => setGender(v ?? '')}
              options={[
                { value: 'male', label: '男' },
                { value: 'female', label: '女' },
              ]}
              allowClear
            />
          </Space.Compact>
          <Input
            addonBefore="既往史"
            value={historyText}
            onChange={(e) => setHistoryText(e.target.value)}
            placeholder="如：高血压、糖尿病、吸烟"
          />
        </Space>

        <Button
          type="primary"
          block
          loading={loading}
          onClick={() => void handleGenerate()}
          style={{ marginTop: 12, background: MID_BLUE, borderColor: MID_BLUE }}
        >
          生成诊断建议
        </Button>

        {/* 结果区 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin tip="AI 正在分析…" />
          </div>
        )}

        {!loading && suggestion && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Text strong style={{ color: DEEP_BG }}>Top3 可能诊断</Text>
            <div style={{ marginTop: 8 }}>
              {suggestion.topCandidates.map((c) => (
                <div
                  key={c.rank}
                  style={{
                    padding: '8px 10px',
                    marginBottom: 8,
                    background: '#f6f9fc',
                    borderRadius: 6,
                    borderLeft: `3px solid ${c.rank === 1 ? ACCENT : '#d9e6f2'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ color: DEEP_BG }}>
                      {c.rank}. {c.diagnosis}
                    </Text>
                    <Tag>{c.icd10}</Tag>
                  </div>
                  <Progress
                    percent={Math.round(c.confidence * 100)}
                    size="small"
                    strokeColor={confidenceColor(c.confidence)}
                  />
                  {c.evidence.slice(0, 3).map((ev, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'rgba(10,37,64,0.6)' }}>
                      · {ev}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {suggestion.differential.length > 0 && (
              <>
                <Text strong style={{ color: DEEP_BG }}>鉴别诊断</Text>
                <div style={{ marginTop: 6 }}>
                  {suggestion.differential.map((d) => <Tag key={d}>{d}</Tag>)}
                </div>
              </>
            )}

            <Text strong style={{ color: DEEP_BG, display: 'inline-block', marginTop: 8 }}>建议检查</Text>
            <div style={{ marginTop: 6 }}>
              {suggestion.suggestedExams.map((e) => (
                <Tag key={e} color="blue">{e}</Tag>
              ))}
            </div>

            <Text strong style={{ color: DEEP_BG, display: 'inline-block', marginTop: 8 }}>治疗方向</Text>
            <ul style={{ margin: '6px 0 0 18px', padding: 0, color: 'rgba(10,37,64,0.75)', fontSize: 13 }}>
              {suggestion.treatmentDirections.map((t) => <li key={t}>{t}</li>)}
            </ul>

            {suggestion.riskWarnings.map((w, i) => (
              <Alert
                key={i}
                style={{ marginTop: 10 }}
                type={w.level === 'critical' ? 'error' : w.level === 'high' ? 'warning' : 'info'}
                showIcon
                message={w.title}
                description={w.detail}
              />
            ))}

            <Paragraph style={{ marginTop: 10, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              {suggestion.disclaimer}
            </Paragraph>

            {/* 医生处置：采纳/修改/驳回 */}
            <Space style={{ marginTop: 4 }}>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                onClick={() => void handleFeedback('accepted')}
                style={{ background: GREEN, borderColor: GREEN }}>
                采纳 Top1
              </Button>
              <Button size="small" icon={<EditOutlined />}
                onClick={() => void handleFeedback('modified')}>
                修改后采纳
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => void handleFeedback('rejected')}>
                驳回
              </Button>
            </Space>

            {feedbackDone && (
              <Alert style={{ marginTop: 10 }} type="success" showIcon message={feedbackDone} />
            )}
            {stats && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(10,37,64,0.6)' }}>
                本医生累计留痕 {stats.total} 例 · 采纳率 {Math.round(stats.acceptanceRate * 100)}% ·
                Top1 命中率 {Math.round(stats.top1MatchRate * 100)}%
                <Tag color={GOLD} style={{ marginLeft: 8 }}>已回流模型优化</Tag>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
