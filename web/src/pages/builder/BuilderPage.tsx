/**
 * 健澜科技杠OS - 低代码智能体编排画布
 *
 * 三栏：节点面板 / React Flow 画布 / 属性面板；顶部工具栏支持撤销重做、
 * 实时校验、智能体设置、导入 agent.yaml、导出 YAML/JSON。
 *
 * Copyright (c) 2026 健澜科技.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Button,
  Space,
  Tag,
  Typography,
  Drawer,
  Alert,
  List,
  message,
  Segmented,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  RedoOutlined,
  SettingOutlined,
  UndoOutlined,
  UploadOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import FlowCanvasNode from './components/FlowCanvasNode';
import NodePalette from './components/NodePalette';
import PropertyPanel from './components/PropertyPanel';
import AgentMetaDrawer from './components/AgentMetaDrawer';
import { useBuilderStore } from './builderStore';
import { builderToPackage, parsePackageText, toYaml } from './graph';
import { BUILTIN_PACKAGES } from '@/mock/agentMarket';
import type { NodeType } from '@/types/builder';

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Canvas() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useBuilderStore((s) => s.nodes);
  const edges = useBuilderStore((s) => s.edges);
  const meta = useBuilderStore((s) => s.meta);
  const validation = useBuilderStore((s) => s.validation);
  const onNodesChange = useBuilderStore((s) => s.onNodesChange);
  const onEdgesChange = useBuilderStore((s) => s.onEdgesChange);
  const connect = useBuilderStore((s) => s.connect);
  const addNode = useBuilderStore((s) => s.addNode);
  const selectNode = useBuilderStore((s) => s.selectNode);
  const validate = useBuilderStore((s) => s.validate);
  const loadPackage = useBuilderStore((s) => s.loadPackage);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);

  const [metaOpen, setMetaOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [exportFmt, setExportFmt] = useState<'yaml' | 'json'>('yaml');

  const nodeTypes = useMemo(() => ({ medicalNode: FlowCanvasNode }), []);

  // 从市场进入：加载内置模板
  useEffect(() => {
    if (agentId && agentId !== loaded && BUILTIN_PACKAGES[agentId]) {
      loadPackage(BUILTIN_PACKAGES[agentId]);
      setLoaded(agentId);
    }
  }, [agentId, loaded, loadPackage]);

  const onConnect = useCallback((conn: Connection) => connect(conn), [connect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  const errorCount = validation.issues.filter((i) => i.severity === 'error').length;
  const warnCount = validation.issues.filter((i) => i.severity === 'warning').length;

  const handleExport = (fmt: 'yaml' | 'json') => {
    const result = validate();
    const pkg = builderToPackage(useBuilderStore.getState().nodes, useBuilderStore.getState().edges, useBuilderStore.getState().meta);
    if (fmt === 'yaml') download(`${meta.id}.agent.yaml`, toYaml(pkg), 'text/yaml');
    else download(`${meta.id}.agent.json`, JSON.stringify(pkg, null, 2), 'application/json');
    if (!result.valid) message.warning(`已导出，但仍有 ${errorCount} 个错误需修复后才能发布`);
    else message.success('已导出智能体包');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const pkg = parsePackageText(text);
      loadPackage(pkg);
      message.success('已导入智能体包');
    } catch (e) {
      message.error(`导入失败：${(e as Error).message}`);
    }
    return false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f7fa' }}>
      {/* 顶部工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: '#0A4D8C',
          color: '#fff',
        }}
      >
        <Button type="text" style={{ color: '#fff' }} icon={<ArrowLeftOutlined />} onClick={() => navigate('/builder/market')}>
          市场
        </Button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
        <Typography.Text strong style={{ color: '#fff', fontSize: 15 }}>
          {meta.name}
        </Typography.Text>
        <Tag color={meta.riskLevel === 'high' ? 'red' : meta.riskLevel === 'medium' ? 'orange' : 'green'} style={{ border: 'none' }}>
          {meta.riskLevel}
        </Tag>
        <span style={{ flex: 1 }} />
        <Space>
          <Button size="small" icon={<UndoOutlined />} onClick={undo}>撤销</Button>
          <Button size="small" icon={<RedoOutlined />} onClick={redo}>重做</Button>
          <Button
            size="small"
            icon={errorCount === 0 ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            danger={errorCount > 0}
            onClick={() => { validate(); setIssuesOpen(true); }}
          >
            校验 {errorCount > 0 ? `${errorCount}错` : warnCount > 0 ? `${warnCount}警` : '通过'}
          </Button>
          <Button size="small" icon={<SettingOutlined />} onClick={() => setMetaOpen(true)}>设置</Button>
          <Upload accept=".yaml,.yml,.json" showUploadList={false} beforeUpload={handleImportFile}>
            <Button size="small" icon={<UploadOutlined />}>导入</Button>
          </Upload>
          <Segmented
            size="small"
            value={exportFmt}
            options={[{ label: 'YAML', value: 'yaml' }, { label: 'JSON', value: 'json' }]}
            onChange={(v) => setExportFmt(v as 'yaml' | 'json')}
          />
          <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => handleExport(exportFmt)}>
            导出
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 232, background: '#fff', borderRight: '1px solid #e8edf3' }}>
          <NodePalette />
        </div>
        <div ref={wrapperRef} style={{ flex: 1, position: 'relative' }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            fitView
            deleteKeyCode={['Delete', 'Backspace']}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color="#dbe4ee" />
            <Controls />
            <MiniMap nodeColor={(n) => {
              const t = (n.data as { nodeType?: string })?.nodeType ?? '';
              const map: Record<string, string> = { start: '#0A4D8C', end: '#5b6b7c', llm: '#1677ff', tool: '#13a8a8', rag: '#722ed1', human: '#f5222d' };
              return map[t] ?? '#b8c4d2';
            }} />
          </ReactFlow>
        </div>
        <div style={{ width: 340, background: '#fff', borderLeft: '1px solid #e8edf3' }}>
          <PropertyPanel />
        </div>
      </div>

      <AgentMetaDrawer open={metaOpen} onClose={() => setMetaOpen(false)} />

      <Drawer title="校验结果" open={issuesOpen} onClose={() => setIssuesOpen(false)} width={480}>
        {validation.issues.length === 0 ? (
          <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="校验通过，工作流结构合法、引用完整，可导出发布。" />
        ) : (
          <>
            <Alert
              type={errorCount > 0 ? 'error' : 'warning'}
              showIcon
              style={{ marginBottom: 12 }}
              message={`${errorCount} 个错误，${warnCount} 个警告`}
              description="错误会阻断发布；警告为建议项。点击条目可定位节点。"
            />
            <List
              size="small"
              dataSource={validation.issues}
              renderItem={(it) => (
                <List.Item
                  style={{ cursor: it.nodeId ? 'pointer' : 'default' }}
                  onClick={() => { if (it.nodeId) { selectNode(it.nodeId); setIssuesOpen(false); } }}
                >
                  <List.Item.Meta
                    avatar={it.severity === 'error' ? <ExclamationCircleOutlined style={{ color: '#f5222d' }} /> : <WarningOutlined style={{ color: '#faad14' }} />}
                    title={<Typography.Text style={{ fontSize: 13 }}>{it.message}</Typography.Text>}
                    description={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{it.code}{it.nodeId ? ` · ${it.nodeId}` : ''}{it.suggestion ? ` · 建议：${it.suggestion}` : ''}</Typography.Text>}
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <ReactFlowProvider>
      <div style={{ height: 'calc(100vh - 0px)' }}>
        <Canvas />
      </div>
    </ReactFlowProvider>
  );
}
