/**
 * 健澜科技杠OS - 节点面板（拖拽源）
 * Copyright (c) 2026 健澜科技.
 */

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
} from '@ant-design/icons';
import { Typography } from 'antd';
import { NODE_TYPES } from '../constants';
import type { NodeType } from '@/types/builder';

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

const GROUPS: Array<{ name: string; types: NodeType[] }> = [
  { name: '流程', types: ['start', 'end', 'delay'] },
  { name: '智能能力', types: ['llm', 'tool', 'rag', 'subagent'] },
  { name: '控制', types: ['condition', 'loop', 'parallel', 'code'] },
  { name: '人机协同', types: ['human'] },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, type: NodeType) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        节点库
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        拖拽节点到画布，或点击画布空白处后双击添加。
      </Typography.Paragraph>
      {GROUPS.map((g) => (
        <div key={g.name} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8a97a6', marginBottom: 6 }}>{g.name}</div>
          {NODE_TYPES.filter((n) => g.types.includes(n.type)).map((n) => (
            <div
              key={n.type}
              draggable
              onDragStart={(e) => onDragStart(e, n.type)}
              title={n.description}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                marginBottom: 6,
                border: '1px solid #e3e9f2',
                borderRadius: 8,
                background: '#fff',
                cursor: 'grab',
                fontSize: 13,
                userSelect: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = n.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e3e9f2')}
            >
              <span style={{ color: n.color, fontSize: 15 }}>{ICONS[n.icon]}</span>
              <div>
                <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{n.label}</div>
                <div style={{ fontSize: 11, color: '#9aa7b5', lineHeight: 1.3 }}>{n.description}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
