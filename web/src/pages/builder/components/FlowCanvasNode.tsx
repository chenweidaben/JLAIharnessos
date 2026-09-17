/**
 * 健澜科技杠OS - 画布自定义节点
 * Copyright (c) 2026 健澜科技.
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  PlayCircleOutlined,
  StopOutlined,
  RobotOutlined,
  ToolOutlined,
  BookOutlined,
  BranchesOutlined,
  RetweetOutlined,
  DeploymentUnitOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  FunctionOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { BuilderNode } from '@/types/builder';

const ICONS: Record<string, React.ReactNode> = {
  PlayCircleOutlined: <PlayCircleOutlined />,
  StopOutlined: <StopOutlined />,
  RobotOutlined: <RobotOutlined />,
  ToolOutlined: <ToolOutlined />,
  BookOutlined: <BookOutlined />,
  BranchesOutlined: <BranchesOutlined />,
  RetweetOutlined: <RetweetOutlined />,
  DeploymentUnitOutlined: <DeploymentUnitOutlined />,
  UserSwitchOutlined: <UserSwitchOutlined />,
  TeamOutlined: <TeamOutlined />,
  FunctionOutlined: <FunctionOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
};

const NODE_STYLE: Record<string, { icon: string; color: string }> = {
  start: { icon: 'PlayCircleOutlined', color: '#0A4D8C' },
  end: { icon: 'StopOutlined', color: '#5b6b7c' },
  llm: { icon: 'RobotOutlined', color: '#1677ff' },
  tool: { icon: 'ToolOutlined', color: '#13a8a8' },
  rag: { icon: 'BookOutlined', color: '#722ed1' },
  condition: { icon: 'BranchesOutlined', color: '#fa8c16' },
  loop: { icon: 'RetweetOutlined', color: '#eb2f96' },
  parallel: { icon: 'DeploymentUnitOutlined', color: '#2f54eb' },
  human: { icon: 'UserSwitchOutlined', color: '#f5222d' },
  subagent: { icon: 'TeamOutlined', color: '#08979c' },
  code: { icon: 'FunctionOutlined', color: '#8c8c8c' },
  delay: { icon: 'ClockCircleOutlined', color: '#a0d911' },
};

/** 节点副标题：从 config 提炼关键信息 */
function subtitle(data: BuilderNode['data']): string {
  const c = data.config;
  switch (data.nodeType) {
    case 'llm':
      return c.model ? `模型 ${c.model}` : '';
    case 'tool':
      return (c.toolName as string) || '未选择工具';
    case 'rag':
      return (c.knowledgeBases as string[] | undefined)?.join('、') || '未选知识库';
    case 'condition':
      return c.mode === 'switch' ? `switch ${c.switchOn ?? ''}` : 'if-else';
    case 'loop':
      return c.loopMode === 'foreach' ? `foreach ${c.collection ?? ''}` : `while ${c.whileCondition ?? ''}`;
    case 'parallel':
      return `${c.parallelMode} · ${(c.parallelBranches ?? []).length} 分支`;
    case 'human':
      return (c.assigneeRoles as string[] | undefined)?.join('、') || '';
    case 'subagent':
      return (c.agentId as string) || '未选智能体';
    case 'delay':
      return c.durationMs ? `${c.durationMs} ms` : '';
    default:
      return '';
  }
}

function FlowCanvasNode({ data, selected }: NodeProps<BuilderNode>) {
  const nodeType = data.nodeType as string;
  const style = NODE_STYLE[nodeType] ?? { icon: 'FunctionOutlined', color: '#8c8c8c' };
  const isStart = nodeType === 'start';
  const isEnd = nodeType === 'end';
  const isCondition = nodeType === 'condition';
  const branches =
    isCondition
      ? [
          ...((data.config.branches as Array<{ name: string }>) ?? []).map((b) => b.name),
          ...(data.config.defaultPort ? [data.config.defaultPort as string] : []),
        ]
      : [];

  return (
    <div
      style={{
        minWidth: 168,
        borderRadius: 10,
        border: `2px solid ${selected ? style.color : '#d9e1ec'}`,
        boxShadow: selected ? `0 0 0 3px ${style.color}22` : '0 1px 4px rgba(16,42,72,0.08)',
        background: '#fff',
        overflow: 'hidden',
        fontSize: 12,
      }}
    >
      {!isStart && <Handle type="target" position={Position.Left} style={{ background: style.color }} />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          background: style.color,
          color: '#fff',
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 14 }}>{ICONS[style.icon]}</span>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.name}
        </span>
        {nodeType === 'human' && <WarningOutlined style={{ color: '#ffe7ba' }} />}
      </div>
      <div style={{ padding: '6px 10px', color: '#516070', minHeight: 22 }}>
        {subtitle(data) || '\u00A0'}
      </div>

      {!isEnd && !isCondition && (
        <Handle type="source" position={Position.Right} id="out" style={{ background: style.color }} />
      )}
      {isCondition &&
        branches.map((port, i) => (
          <Handle
            key={port}
            type="source"
            id={port}
            position={Position.Right}
            style={{
              top: `${((i + 1) / (branches.length + 1)) * 100}%`,
              background: style.color,
            }}
          />
        ))}
      {isCondition && (
        <div
          style={{
            position: 'absolute',
            right: -2,
            top: 26,
            bottom: 4,
            width: 52,
            pointerEvents: 'none',
          }}
        >
          {branches.map((port, i) => (
            <div
              key={port}
              style={{
                position: 'absolute',
                right: 8,
                top: `${((i + 1) / (branches.length + 1)) * 100}%`,
                transform: 'translateY(-50%)',
                color: style.color,
                fontSize: 11,
                whiteSpace: 'nowrap',
              }}
            >
              {port}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FlowCanvasNode);
