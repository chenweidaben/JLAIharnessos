/**
 * 健澜科技 jlmedaios - 真实 LLM 深度对话页（M131-C，AI能力深化）。
 *
 * 面向临床医生/护士/药师的多轮大模型对话界面：
 * 提问 → POST /api/v1/assistant/llm/chat（SSE 流式）→ 逐帧打字机渲染回复。
 *
 * 模型后端可切换展示：OpenAI GPT-4 / 通义千问 / 本地 Ollama（由服务端配置落地，
 * 前端只透传 provider 参数；未配置上游时后端自动降级本地模板，交互体验一致）。
 *
 * 为什么用 fetch 读流而不是 EventSource：需要 POST body + Bearer Token + CSRF 头。
 *
 * 深海蓝 VI：顶栏 #0A2540，主色 #4A90D9。固定免责声明：仅供参考，不构成医疗建议。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Select, Space, Spin, Tag, Typography,
} from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { tokenStorage } from '@/utils/auth';
import { getCsrfToken } from '@/utils/cookie';
import { env } from '@/utils/config';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';

/** 模型后端选项（与后端 provider 参数对齐） */
const MODEL_OPTIONS = [
  { value: '', label: '默认（服务端配置）' },
  { value: 'openai', label: 'OpenAI GPT-4' },
  { value: 'qwen', label: '通义千问 Qwen' },
  { value: 'ollama', label: '本地 Ollama' },
];

/** 单条对话气泡 */
interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** 本轮回复是否走了降级兜底 */
  degraded?: boolean;
  /** 实际生效的模型名 */
  model?: string;
}

/** SSE 帧 */
interface StreamFrame {
  type?: 'delta' | 'meta' | string;
  text?: string;
  degraded?: boolean;
  model?: string;
  provider?: string;
  disclaimer?: string;
}

export default function AssistantLlmChatPage() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 卸载时中断在途流
  useEffect(() => () => abortRef.current?.abort(), []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const ask = useCallback(async () => {
    const q = input.trim();
    if (!q || streaming) return;
    setStreaming(true);
    setError(null);
    setTurns((ts) => [...ts, { role: 'user', text: q }, { role: 'assistant', text: '' }]);
    setInput('');
    scrollToBottom();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(`${env.apiBaseUrl}/assistant/llm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
          ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
        },
        body: JSON.stringify({ message: q, provider: provider || undefined }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        let msg = `对话请求异常（HTTP ${resp.status}）`;
        try {
          const j = (await resp.json()) as { message?: string };
          if (j?.message) msg = j.message;
        } catch {
          /* 非 JSON 错误体，忽略 */
        }
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let appended = '';

      // 把最新一条 assistant 气泡追加文本
      const appendDelta = (text: string) => {
        appended += text;
        setTurns((ts) => {
          const copy = [...ts];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, text: appended };
          return copy;
        });
        scrollToBottom();
      };
      const applyMeta = (frame: StreamFrame) => {
        setTurns((ts) => {
          const copy = [...ts];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = {
            ...last,
            degraded: frame.degraded,
            model: frame.model ?? last.model,
          };
          return copy;
        });
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const rawFrame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const dataLines = rawFrame
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''));
          if (dataLines.length === 0) continue;
          const dataStr = dataLines.join('\n');
          if (dataStr === '[DONE]') continue;
          try {
            const frame = JSON.parse(dataStr) as StreamFrame;
            if (frame.type === 'delta' && typeof frame.text === 'string') appendDelta(frame.text);
            else if (frame.type === 'meta') applyMeta(frame);
          } catch {
            /* 帧损坏忽略 */
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // 主动取消，不视为错误
      } else {
        setError(e instanceof Error ? e.message : 'LLM 对话失败');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      scrollToBottom();
    }
  }, [input, streaming, provider, scrollToBottom]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          深度大模型对话 · AI能力深化
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* 模型后端选择 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap size={[12, 8]}>
            <Text type="secondary" style={{ fontSize: 13 }}>推理后端：</Text>
            <Select
              value={provider}
              onChange={(v) => setProvider(v)}
              options={MODEL_OPTIONS}
              style={{ width: 220 }}
              disabled={streaming}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              支持 OpenAI GPT-4 / 通义千问 / 本地 Ollama；上游不可用时自动降级本地辅助模式。
            </Text>
          </Space>
        </Card>

        {/* 对话区 */}
        <Card style={{ marginBottom: 16, minHeight: 360 }} bodyStyle={{ padding: 16 }}>
          <div ref={listRef} style={{ maxHeight: 480, overflowY: 'auto' }}>
            {turns.length === 0 ? (
              <Empty
                description={
                  <span>
                    输入临床工作中遇到的问题，例如：
                    <br />
                    「高血压合并糖尿病的首选降压方案」「术后 VTE 预防要点」「抗菌药物围术期如何选择」
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
                        <Text style={{ fontSize: 12, color: t.role === 'user' ? '#d6e6ff' : '#8c8c8c' }}>
                          {t.role === 'user' ? '我' : '健澜医疗大模型'}
                        </Text>
                        {t.role === 'assistant' && t.degraded && (
                          <Tag color="warning" style={{ marginInlineStart: 0 }}>降级模式</Tag>
                        )}
                        {t.role === 'assistant' && t.model && (
                          <Tag color="geekblue" style={{ marginInlineStart: 0 }}>{t.model}</Tag>
                        )}
                      </Space>
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {t.text || (streaming && idx === turns.length - 1 ? '' : t.text)}
                      </Paragraph>
                    </div>
                  </div>
                ))}
                {streaming && (
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
                      <Text type="secondary" style={{ marginLeft: 8 }}>大模型正在生成回复…</Text>
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
            placeholder="用自然语言描述临床问题，回车发送…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={() => void ask()}
            disabled={streaming}
            allowClear
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => void ask()}
            loading={streaming}
            style={{ background: DEEP_BG, borderColor: DEEP_BG }}
          >
            发送
          </Button>
        </Space.Compact>

        {/* 固定免责声明 */}
        <Alert
          type="warning"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginTop: 12, fontSize: 12 }}
          message="免责声明"
          description="本回答由健澜医疗大模型基于输入内容自动生成，仅供参考，不构成医疗建议；具体诊疗请结合患者实际情况，以主管医师判断为准。"
        />
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          © 2026 杭州健澜科技有限公司
        </Paragraph>
      </Content>
    </Layout>
  );
}
