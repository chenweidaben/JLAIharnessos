/**
 * 健澜科技 jlmedaios - 医学知识智能问答对话框（M126-C，AI 能力升级）
 *
 * 面向临床医生 / 护士 / 药师的自然语言医学知识问答界面：
 * 提问 → 后端在院内医学知识种子库中做意图识别 + 关键词加权检索 →
 * 返回四段式答案（核心结论 / 关键要点 / 适用边界 / 证据来源）+ 可溯源来源。
 *
 * 三态：loading（正在检索）/ error（请求失败）/ empty（尚未提问）。
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，警示橙 #d46b08。
 * 固定免责声明：「仅供参考，不构成医疗建议」。
 *
 * 后端：POST /api/v1/assistant/knowledge/ask。
 * 医疗安全：答案为院内权威指南摘要的辅助参考，不替代临床判断与医嘱。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useRef, useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Select, Space, Spin, Tag, Typography,
} from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';

/** 科室选项（演示态；生产可由字典接口下发） */
const DEPT_OPTIONS = [
  { value: '', label: '全院（不按科室加权）' },
  { value: 'cardio', label: '心内科 cardio' },
  { value: 'endo', label: '内分泌科 endo' },
  { value: 'internal', label: '内科 internal' },
  { value: 'er', label: '急诊 er' },
  { value: 'surgery', label: '外科 surgery' },
  { value: 'nursing', label: '护理部 nursing' },
  { value: 'pharma', label: '药剂科 pharma' },
];

/** 年龄组选项 */
const AGE_GROUP_OPTIONS = [
  { value: '', label: '成人（默认）' },
  { value: 'pediatric', label: '儿童 pediatric' },
  { value: 'geriatric', label: '老年 geriatric' },
];

/** 意图中文标签 */
const INTENT_LABEL: Record<string, string> = {
  definition: '定义',
  diagnosis: '诊断',
  treatment: '治疗',
  prevention: '预防',
  caution: '注意事项',
  general: '通用',
};

/** 答案来源（与后端 MedicalKnowledgeSource 对齐） */
interface KnowledgeSource {
  id: string;
  title: string;
  category: string;
  matchedTopic: string;
  score: number;
  guideline: string;
}

/** 问答响应信封 */
interface AskKnowledgeResponse {
  question: string;
  answer: string;
  sources: KnowledgeSource[];
  confidence: number;
  intent: string;
  matched: boolean;
}

/** 单条对话气泡 */
interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  sources?: KnowledgeSource[];
  confidence?: number;
  intent?: string;
}

/** 置信度颜色：高绿 / 中蓝 / 低灰 */
function confidenceTagColor(c: number): string {
  if (c >= 0.7) return 'green';
  if (c >= 0.4) return 'blue';
  return 'default';
}

export default function AssistantKnowledgePage() {
  const [input, setInput] = useState('');
  const [deptCode, setDeptCode] = useState<string>('');
  const [ageGroup, setAgeGroup] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    // 先把用户气泡入列，优化感知
    setTurns((ts) => [...ts, { role: 'user', text: q }]);
    try {
      const resp = await post<AskKnowledgeResponse>('/assistant/knowledge/ask', {
        question: q,
        deptCode: deptCode || undefined,
        context: ageGroup ? { ageGroup } : undefined,
      });
      setTurns((ts) => [
        ...ts,
        {
          role: 'assistant',
          text: resp.answer,
          sources: resp.sources,
          confidence: resp.confidence,
          intent: resp.intent,
        },
      ]);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '医学知识问答失败');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [input, loading, deptCode, ageGroup]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          医学知识助手 · AI 能力升级
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* 提问上下文（用于科室 / 年龄加权） */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap size={[12, 8]}>
            <Text type="secondary" style={{ fontSize: 13 }}>我的科室：</Text>
            <Select
              value={deptCode}
              onChange={(v) => setDeptCode(v)}
              options={DEPT_OPTIONS}
              style={{ width: 200 }}
            />
            <Text type="secondary" style={{ fontSize: 13 }}>患者人群：</Text>
            <Select
              value={ageGroup}
              onChange={(v) => setAgeGroup(v)}
              options={AGE_GROUP_OPTIONS}
              style={{ width: 160 }}
            />
          </Space>
        </Card>

        {/* 对话区 */}
        <Card
          style={{ marginBottom: 16, minHeight: 360 }}
          bodyStyle={{ padding: 16 }}
        >
          <div ref={listRef} style={{ maxHeight: 480, overflowY: 'auto' }}>
            {turns.length === 0 && !loading ? (
              <Empty
                description={
                  <span>
                    输入您在临床 / 护理 / 药事 / 院感中遇到的医学问题，例如：
                    <br />
                    「高血压诊断标准是什么」「术前禁食多久」「VTE 如何预防」「青霉素皮试怎么做」
                  </span>
                }
                style={{ padding: '48px 0' }}
              />
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {turns.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: t.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        background: t.role === 'user' ? ACCENT : '#fff',
                        color: t.role === 'user' ? '#fff' : '#333',
                        border: t.role === 'user' ? 'none' : `1px solid #e8eef5`,
                        borderRadius: 10,
                        padding: '10px 14px',
                      }}
                    >
                      <Space size={6} align="center" style={{ marginBottom: 4 }}>
                        {t.role === 'user' ? <UserOutlined /> : <RobotOutlined style={{ color: DEEP_BG }} />}
                        <Text
                          style={{
                            fontSize: 12,
                            color: t.role === 'user' ? '#d6e6ff' : '#8c8c8c',
                          }}
                        >
                          {t.role === 'user' ? '我' : '医学知识助手'}
                        </Text>
                        {t.intent && t.role === 'assistant' && (
                          <Tag color="geekblue" style={{ marginInlineStart: 0 }}>
                            {INTENT_LABEL[t.intent] ?? t.intent}
                          </Tag>
                        )}
                        {t.confidence !== undefined && (
                          <Tag color={confidenceTagColor(t.confidence)} style={{ marginInlineStart: 0 }}>
                            置信度 {(t.confidence * 100).toFixed(0)}%
                          </Tag>
                        )}
                      </Space>
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {t.text}
                      </Paragraph>
                      {t.sources && t.sources.length > 0 && (
                        <div style={{ marginTop: 8, borderTop: '1px dashed #e8eef5', paddingTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>溯源：</Text>
                          {t.sources.map((s) => (
                            <div key={s.id} style={{ marginTop: 4 }}>
                              <Tag color="blue" style={{ marginInlineEnd: 4 }}>
                                {s.matchedTopic}
                              </Tag>
                              <Text style={{ fontSize: 12, color: DEEP_BG }}>
                                《{s.title}》
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {' '}· {s.guideline}
                              </Text>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #e8eef5',
                        borderRadius: 10,
                        padding: '10px 14px',
                      }}
                    >
                      <Spin size="small" />
                      <Text type="secondary" style={{ marginLeft: 8 }}>正在检索院内医学知识库…</Text>
                    </div>
                  </div>
                )}
              </Space>
            )}
          </div>
        </Card>

        {error && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />
        )}

        {/* 输入区 */}
        <Space.Compact style={{ width: '100%' }} size="large">
          <Input
            placeholder="用自然语言描述您的医学问题…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={() => void ask()}
            disabled={loading}
            allowClear
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => void ask()}
            loading={loading}
            style={{ background: DEEP_BG, borderColor: DEEP_BG }}
          >
            提问
          </Button>
        </Space.Compact>

        {/* 固定免责声明 */}
        <Alert
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginTop: 12, fontSize: 12 }}
          message="免责声明"
          description="本答案由健澜医学知识助手基于院内权威指南摘要自动生成，仅供参考，不构成医疗建议；具体诊疗请结合患者实际情况与最新版指南，并以主管医师判断为准。"
        />
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          © 2026 杭州健澜科技有限公司
        </Paragraph>
      </Content>
    </Layout>
  );
}
