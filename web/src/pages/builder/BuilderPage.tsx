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
  Modal,
  Radio,
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  RedoOutlined,
  SaveOutlined,
  SendOutlined,
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
import {
  getBuilderAgentApi,
  publishDraftApi,
  saveDraftApi,
} from '@/services/api/agentBuilder';
import type { BumpKind } from '@/types/agentBuilder';
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
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [bump, setBump] = useState<BumpKind>('minor');
  const [changelog, setChangelog] = useState('');

  const nodeTypes = useMemo(() => ({ medicalNode: FlowCanvasNode }), []);

  // 从市场进入：new=空白；内置模板加载 mock；其余从真实后端加载草稿。
  useEffect(() => {
    if (!agentId || agentId === loaded) return;
    let cancelled = false;
    const apply = async () => {
      if (agentId === 'new') {
        useBuilderStore.getState().reset();
      } else if (BUILTIN_PACKAGES[agentId]) {
        loadPackage(BUILTIN_PACKAGES[agentId]);
      } else {
        try {
          const detail = await getBuilderAgentApi(agentId);
          if (cancelled) return;
          if (detail.draft) {
            loadPackage({
              packageFormatVersion: '1.0.0',
              agent: detail.draft.definition,
              prompts: detail.draft.prompts,
            });
          } else {
            message.warning('该智能体暂无草稿，已打开空白画布');
          }
        } catch {
          if (!cancelled) message.error('加载智能体失败，请返回市场重试');
        }
      }
      if (!cancelled) setLoaded(agentId);
    };
    void apply();
    return () => {
      cancelled = true;
    };
  }, [agentId, loaded, loadPackage]);

  /** 组装当前画布为智能体包 */
  const buildCurrentPackage = () => {
    const s = useBuilderStore.getState();
    return builderToPackage(s.nodes, s.edges, s.meta);
  };

  /** 保存草稿 */
  const handleSave = async (silent = false): Promise<string | null> => {
    setSaving(true);
    try {
      const res = await saveDraftApi(buildCurrentPackage());
      if (!silent) {
        message.success(res.created ? '已创建并保存草稿' : '草稿已保存');
      }
      // 新建后把 URL 替换为真实标识，避免重复创建
      if (agentId === 'new') {
        navigate(`/builder/edit/${res.agentId}`, { replace: true });
      }
      return res.agentId;
    } catch (e) {
      message.error(`保存失败：${(e as Error).message}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** 打开发布弹窗（先静默保存） */
  const handlePublishClick = async () => {
    const id = await handleSave(true);
    if (!id) {
      message.error('请先成功保存草稿再发布');
      return;
    }
    setChangelog('');
    setPublishOpen(true);
  };

  /** 确认发布 */
  const confirmPublish = async () => {
    const fallbackId = String(buildCurrentPackage().agent.id);
    const targetId = agentId === 'new' || !agentId ? fallbackId : agentId;
    setPublishing(true);
    try {
      const res = await publishDraftApi(targetId, { bump, changelog: changelog || undefined });
      message.success(`已发布 v${res.version}（校验和 ${res.checksum.slice(0, 12)}…）`);
      setPublishOpen(false);
      useBuilderStore.getState().loadPackage(buildCurrentPackage());
    } catch (e) {
      message.error(`发布失败：${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

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

  // 双击画布空白处放置节点：类型取节点库点选的 paletteType，未选时默认添加「大模型」。
  // 用 wrapper 上的原生 capture 监听（早于 React Flow pane 的双击缩放，且不受其内部
  // stopPropagation 影响）；命中空白底板后阻止默认缩放，改为放置节点。
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // 节点位于与 pane 平级的 viewport 层，控件/小地图在 panel 层；
      // target 落在 pane 且不属于这些元素，即代表双击的是空白底板。
      if (!target.closest('.react-flow__pane')) return;
      if (target.closest('.react-flow__node, .react-flow__controls, .react-flow__minimap, .react-flow__panel')) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const chosen = useBuilderStore.getState().paletteType ?? 'llm';
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(chosen, position);
      if (!useBuilderStore.getState().paletteType) {
        message.info('未在左侧点选节点类型，已默认添加「大模型」节点');
      }
    };
    el.addEventListener('dblclick', handler, true);
    return () => el.removeEventListener('dblclick', handler, true);
  }, [screenToFlowPosition, addNode]);

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
          <Button
            size="small"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => handleSave()}
          >
            保存
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<SendOutlined />}
            onClick={handlePublishClick}
          >
            发布
          </Button>
          <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => handleExport(exportFmt)}>
            导出
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 232, background: '#fff', borderRight: '1px solid #e8edf3' }}>
          <NodePalette />
        </div>
        <div
          ref={wrapperRef}
          style={{ flex: 1, position: 'relative' }}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
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

      <Modal
        title="发布智能体"
        open={publishOpen}
        onOk={confirmPublish}
        onCancel={() => setPublishOpen(false)}
        confirmLoading={publishing}
        okText="确认发布"
        cancelText="取消"
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="发布前已自动保存草稿。发布将创建一个正式版本，纳入版本管理与审计。"
        />
        <Typography.Text strong>版本递增方式</Typography.Text>
        <Radio.Group
          style={{ display: 'block', margin: '8px 0 16px' }}
          value={bump}
          onChange={(e) => setBump(e.target.value as BumpKind)}
        >
          <Radio value="major">主版本（major）：不兼容的重大变更</Radio>
          <Radio value="minor">次版本（minor）：向下兼容的功能新增</Radio>
          <Radio value="patch">修订（patch）：向下兼容的问题修复</Radio>
        </Radio.Group>
        <Typography.Text strong>变更说明（可选）</Typography.Text>
        <Input.TextArea
          style={{ marginTop: 8 }}
          rows={3}
          placeholder="描述本次发布的主要变更，便于追溯"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
        />
      </Modal>

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
