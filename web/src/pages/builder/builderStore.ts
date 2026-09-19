/**
 * 健澜科技杠OS - 低代码画布状态管理（zustand）
 *
 * 集中管理节点/边/智能体元信息/选中态/校验结果，并提供撤销重做与
 * React Flow 受控变更回调。
 *
 * Copyright (c) 2026 健澜科技.
 */

import { create } from 'zustand';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import type {
  AgentMeta,
  BuilderEdge,
  BuilderNode,
  NodeConfig,
  NodeType,
  ValidationResult,
} from '@/types/builder';
import { NODE_TYPE_MAP } from './constants';
import { defaultAgentMeta, validateWorkflow } from './dag';
import { newNodeId, packageToBuilder, type AgentPackageJson } from './graph';

interface Snapshot {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
}

interface BuilderState {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  meta: AgentMeta;
  selectedNodeId: string | null;
  /** 节点库点选的待放置类型：选中后双击画布空白处即可放置（拖拽之外的第二条建模路径） */
  paletteType: NodeType | null;
  validation: ValidationResult;
  dirty: boolean;
  past: Snapshot[];
  future: Snapshot[];

  onNodesChange: (changes: NodeChange<BuilderNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BuilderEdge>[]) => void;
  connect: (conn: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => string;
  updateNodeConfig: (id: string, patch: Partial<NodeConfig>) => void;
  updateNodeName: (id: string, name: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setPaletteType: (type: NodeType | null) => void;
  updateMeta: (patch: Partial<AgentMeta>) => void;
  validate: () => ValidationResult;
  loadPackage: (pkg: AgentPackageJson) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
}

const clone = <T,>(v: T): T => structuredClone(v);

function snapshot(nodes: BuilderNode[], edges: BuilderEdge[]): Snapshot {
  return { nodes: clone(nodes), edges: clone(edges) };
}

function starterWorkflow(): { nodes: BuilderNode[]; edges: BuilderEdge[] } {
  const nodes: BuilderNode[] = [
    {
      id: 'start',
      type: 'medicalNode',
      position: { x: 80, y: 200 },
      data: { nodeType: 'start', name: '开始', config: {} },
    },
    {
      id: 'end',
      type: 'medicalNode',
      position: { x: 720, y: 200 },
      data: { nodeType: 'end', name: '结束', config: { outputMapping: { status: 'completed' } } },
    },
  ];
  return { nodes, edges: [] };
}

const initial = starterWorkflow();

export const useBuilderStore = create<BuilderState>((set, get) => {
  /** 在结构性变更前压入历史栈 */
  const pushHistory = (state: BuilderState): Partial<BuilderState> => ({
    past: [...state.past.slice(-49), snapshot(state.nodes, state.edges)],
    future: [],
    dirty: true,
  });

  const revalidate = (nodes: BuilderNode[], edges: BuilderEdge[], meta: AgentMeta): ValidationResult =>
    validateWorkflow(nodes, edges, meta);

  return {
    nodes: initial.nodes,
    edges: initial.edges,
    meta: defaultAgentMeta(),
    selectedNodeId: null,
    paletteType: null,
    validation: { valid: false, issues: [] },
    dirty: false,
    past: [],
    future: [],

    onNodesChange: (changes) => {
      set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as BuilderNode[] }));
    },
    onEdgesChange: (changes) => {
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges) as BuilderEdge[] }));
    },

    connect: (conn) => {
      if (!conn.source || !conn.target) return;
      set((s) => {
        const handle = (conn.sourceHandle as string | null) ?? 'out';
        const edge: BuilderEdge = {
          id: `e-${conn.source}-${handle}-${conn.target}-${Date.now()}`,
          source: conn.source,
          target: conn.target,
          sourceHandle: handle,
        };
        const edges = [...s.edges, edge];
        return {
          ...pushHistory(s),
          edges,
          validation: revalidate(s.nodes, edges, s.meta),
        };
      });
    },

    addNode: (type, position) => {
      const id = newNodeId(type, get().nodes);
      const meta = NODE_TYPE_MAP[type];
      const node: BuilderNode = {
        id,
        type: 'medicalNode',
        position,
        data: {
          nodeType: type,
          name: meta.label,
          config: clone(meta.defaultConfig),
        },
      };
      set((s) => {
        const nodes = [...s.nodes, node];
        return {
          ...pushHistory(s),
          nodes,
          selectedNodeId: id,
          validation: revalidate(nodes, s.edges, s.meta),
        };
      });
      return id;
    },

    updateNodeConfig: (id, patch) => {
      set((s) => {
        const nodes = s.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } } : n,
        );
        return { nodes, validation: revalidate(nodes, s.edges, s.meta), dirty: true };
      });
    },

    updateNodeName: (id, name) => {
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, name } } : n)),
        dirty: true,
      }));
    },

    removeNode: (id) => {
      const node = get().nodes.find((n) => n.id === id);
      if (!node) return;
      if (node.data.nodeType === 'start') return; // 入口不可删
      set((s) => {
        const nodes = s.nodes.filter((n) => n.id !== id);
        const edges = s.edges.filter((e) => e.source !== id && e.target !== id);
        return {
          ...pushHistory(s),
          nodes,
          edges,
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
          validation: revalidate(nodes, edges, s.meta),
        };
      });
    },

    duplicateNode: (id) => {
      const src = get().nodes.find((n) => n.id === id);
      if (!src) return;
      const newId = newNodeId(src.data.nodeType, get().nodes);
      const copy: BuilderNode = {
        ...clone(src),
        id: newId,
        position: { x: src.position.x + 40, y: src.position.y + 60 },
        data: { ...clone(src.data), name: `${src.data.name} 副本` },
      };
      set((s) => ({ ...pushHistory(s), nodes: [...s.nodes, copy], selectedNodeId: newId }));
    },

    selectNode: (id) => set({ selectedNodeId: id }),

    setPaletteType: (type) => set({ paletteType: type }),

    updateMeta: (patch) => {
      set((s) => {
        const meta = { ...s.meta, ...patch };
        return { meta, validation: revalidate(s.nodes, s.edges, meta), dirty: true };
      });
    },

    validate: () => {
      const r = revalidate(get().nodes, get().edges, get().meta);
      set({ validation: r });
      return r;
    },

    loadPackage: (pkg) => {
      const { nodes, edges, meta } = packageToBuilder(pkg);
      set({
        nodes,
        edges,
        meta,
        selectedNodeId: null,
        past: [],
        future: [],
        dirty: false,
        validation: validateWorkflow(nodes, edges, meta),
      });
    },

    reset: () => {
      const wf = starterWorkflow();
      set({
        ...wf,
        meta: defaultAgentMeta(),
        selectedNodeId: null,
        past: [],
        future: [],
        dirty: false,
        validation: { valid: false, issues: [] },
      });
    },

    undo: () => {
      const s = get();
      if (s.past.length === 0) return;
      const previous = s.past[s.past.length - 1];
      set({
        nodes: previous.nodes,
        edges: previous.edges,
        past: s.past.slice(0, -1),
        future: [snapshot(s.nodes, s.edges), ...s.future],
        selectedNodeId: null,
        validation: revalidate(previous.nodes, previous.edges, s.meta),
      });
    },

    redo: () => {
      const s = get();
      if (s.future.length === 0) return;
      const next = s.future[0];
      set({
        nodes: next.nodes,
        edges: next.edges,
        future: s.future.slice(1),
        past: [...s.past, snapshot(s.nodes, s.edges)],
        selectedNodeId: null,
        validation: revalidate(next.nodes, next.edges, s.meta),
      });
    },
  };
});
