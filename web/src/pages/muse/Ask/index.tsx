/**
 * 健澜科技 jlmedaios - 智能经验问答（Ask Muse，M118-B，依据宪法第七章）
 *
 * 对话框界面：员工以自然语言提问（如「高警示药品怎么双人核对」），后端在医院层
 * 已脱敏知识库中关键词匹配 + 角色/科室加权，返回可读答案、可溯源来源与置信度。
 *
 * 三态：loading（思考中）/ error（请求失败）/ empty（尚未提问或无命中）。
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9，教训红 #cf1322。
 *
 * 后端权限码：medmuse:view（POST /api/v1/muse/ask）。
 * 医疗安全：答案为院内经验辅助参考，不替代临床判断（依据宪法第七章）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useRef, useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Select, Space, Spin, Tag, Typography,
} from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';
const LESSON_RED = '#cf1322';

/** 提问人角色选项（与后端 KnowledgeRole 对齐） */
const ROLE_OPTIONS = [
  { value: 'doctor', label: '医生' },
  { value: 'nurse', label: '护士' },
  { value: 'pharma', label: '药师' },
  { value: 'admin', label: '行政质控' },
];

/** 科室选项（演示态；生产可由字典接口下发） */
const DEPT_OPTIONS = [
  { value: '', label: '全院（不按科室加权）' },
  { value: 'cardio', label: '心内科 cardio' },
  { value: 'nursing', label: '护理部 nursing' },
  { value: 'pharma', label: '药剂科 pharma' },
  { value: 'admin', label: '行政质控 admin' },
];

/** 来源角色中文映射 */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharma: '药师',
  admin: '行政质控',
};

/** 答案来源（与后端 ExperienceQaSource 对齐） */
interface ExperienceQaSource {
  id: string;
  title: string;
  sourceRole: string;
  deptCode: string;
  isLesson: boolean;
  score: number;
}

/** 问答响应信封 */
interface AskExperienceResponse {
  query: string;
  answer: string;
  sources: ExperienceQaSource[];
  confidence: number;
  matched: boolean;
}

/** 单条对话气泡 */
interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  sources?: ExperienceQaSource[];
  confidence?: number;
}

/** 置信度颜色：高绿 / 中蓝 / 低灰 */
function confidenceTagColor(c: number): string {
  if (c >= 0.7) return 'green';
  if (c >= 0.4) return 'blue';
  return 'default';
}

export default function MuseAskPage() {
  const [input, setInput] = useState('');
  const [staffRole, setStaffRole] = useState<string>('doctor');
  const [deptCode, setDeptCode] = useState<string>('');
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
      const resp = await post<AskExperienceResponse>('/muse/ask', {
        query: q,
        staffRole,
        deptCode: deptCode || undefined,
      });
      setTurns((ts) => [
        ...ts,
        {
          role: 'assistant',
          text: resp.answer,
          sources: resp.sources,
          confidence: resp.confidence,
        },
      ]);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '智能经验问答失败');
    } finally {
      setLoading(false);
      // 滚动到底部
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [input, loading, staffRole, deptCode]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          智能经验问答 · Ask Muse
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* 提问人身份（用于角色 / 科室加权） */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap size={[12, 8]}>
            <Text type="secondary" style={{ fontSize: 13 }}>我的身份：</Text>
            <Select
              value={staffRole}
              onChange={(v) => setStaffRole(v)}
              options={ROLE_OPTIONS}
              style={{ width: 130 }}
            />
            <Select
              value={deptCode}
              onChange={(v) => setDeptCode(v)}
              options={DEPT_OPTIONS}
              style={{ width: 220 }}
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
                    输入您在临床 / 护理 / 药事 / 质控中遇到的问题，例如：
                    <br />
                    「高警示药品怎么双人核对」「跌倒高危如何交班」「皮试阳性怎么闭环」
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
                          {t.role === 'user' ? '我' : 'Ask Muse'}
                        </Text>
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
                          <Text type="secondary" style={{ fontSize: 12 }}>来源：</Text>
                          {t.sources.map((s) => (
                            <div key={s.id} style={{ marginTop: 4 }}>
                              <Tag color={s.isLesson ? 'red' : 'blue'} style={{ marginInlineEnd: 4 }}>
                                {s.isLesson ? '教训' : '经验'}
                              </Tag>
                              <Text style={{ fontSize: 12, color: s.isLesson ? LESSON_RED : DEEP_BG }}>
                                《{s.title}》
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {' '}· {ROLE_LABEL[s.sourceRole] ?? s.sourceRole} · {s.deptCode}
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
                      <Text type="secondary" style={{ marginLeft: 8 }}>正在检索院内知识库…</Text>
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
            placeholder="用自然语言描述您遇到的问题…"
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

        <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
          依据宪法第七章：以上答案来自医院层已脱敏经验条目，仅供学习参考，不替代临床判断与医嘱。
        </Paragraph>
      </Content>
    </Layout>
  );
}
