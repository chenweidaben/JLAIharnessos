/**
 * 健澜科技 jlmedaios - 智能体运行触发面板（M4-C）
 *
 * 选择已发布智能体、填写输入（JSON），触发执行。
 * 仅列出已启用（enabled）智能体；运行结果由父页面展示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, Space, Spin, Tag, Typography } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import { listBuilderAgentsApi } from '@/services/api/agentBuilder';
import { useAgentRuntimeStore } from '@/store/agentRuntimeStore';
import type { AgentBuilderSummary } from '@/types/agentBuilder';

const { TextArea } = Input;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function RunPanel() {
  const { running, runAgent, error, clearError } = useAgentRuntimeStore();
  const [agents, setAgents] = useState<AgentBuilderSummary[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const list = await listBuilderAgentsApi();
      const runnable = list.filter((a) => a.status === 'enabled');
      setAgents(runnable);
      if (!selectedId && runnable.length > 0) setSelectedId(runnable[0].agentId);
    } catch (e) {
      setParseError(errMsg(e));
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    void loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = agents.find((a) => a.agentId === selectedId) ?? null;

  const onRun = async () => {
    if (!selectedId) return;
    setParseError(null);
    let input: Record<string, unknown> = {};
    if (inputText.trim()) {
      try {
        const parsed = JSON.parse(inputText);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setParseError('输入必须是 JSON 对象，如 {"question":"..."}');
          return;
        }
        input = parsed as Record<string, unknown>;
      } catch (e) {
        setParseError(`JSON 格式错误：${errMsg(e)}`);
        return;
      }
    }
    await runAgent(selectedId, { input });
  };

  return (
    <Card
      size="small"
      title="选择智能体并运行"
      extra={<Button type="link" size="small" onClick={() => void loadAgents()}>刷新</Button>}
    >
      <Spin spinning={loadingAgents}>
        {error && (
          <Alert
            className="mb-2"
            type="error"
            showIcon
            message={error}
            closable
            onClose={clearError}
          />
        )}
        {parseError && (
          <Alert className="mb-2" type="warning" showIcon message={parseError} closable onClose={() => setParseError(null)} />
        )}
        {agents.length === 0 && !loadingAgents ? (
          <Empty description="暂无已启用智能体，请先在智能体工作台发布" />
        ) : (
          <Space direction="vertical" className="w-full" size="small">
            <List
              size="small"
              dataSource={agents}
              className="max-h-56 overflow-auto"
              renderItem={(a) => (
                <List.Item
                  className={a.agentId === selectedId ? 'bg-jl-primary/10' : ''}
                  style={{ cursor: 'pointer', padding: '6px 8px' }}
                  onClick={() => setSelectedId(a.agentId)}
                >
                  <Space direction="vertical" size={0} className="w-full">
                    <Space wrap>
                      <Typography.Text strong>{a.name}</Typography.Text>
                      <Tag color={a.riskLevel === 'high' ? 'red' : a.riskLevel === 'medium' ? 'orange' : 'green'}>
                        {a.riskLevel}
                      </Tag>
                      {a.currentVersion && <Tag color="blue">v{a.currentVersion}</Tag>}
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {a.agentId} · {a.description}
                    </Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                输入（可选，JSON 对象）
              </Typography.Text>
              <TextArea
                rows={3}
                placeholder='{"question":"患者主诉..."}'
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                data-testid="run-input"
              />
            </div>
            <Button
              type="primary"
              icon={<CaretRightOutlined />}
              loading={running}
              disabled={!selected}
              onClick={() => void onRun()}
              data-testid="run-agent-btn"
            >
              运行{selected ? ` · ${selected.name}` : ''}
            </Button>
          </Space>
        )}
      </Spin>
    </Card>
  );
}
