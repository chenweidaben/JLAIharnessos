/**
 * 健澜科技杠OS — 医学知识图谱
 *
 * 内存型属性图（adjacency list），支持：
 *  - 实体/关系/属性增删查、去重合并；
 *  - CMeKG（疾病-症状-药物-检查）、TCM-MKG（证候-方剂-中药-腧穴）开放数据导入适配；
 *  - 多跳邻居、最短路径、按关系类型扩展，供混合检索的 graph 路召回。
 *
 * 数据合规：CMeKG/TCM-MKG 等仅提供下载脚本与格式适配器，不在仓库内打包受限大文件。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { type GraphEntity, type GraphRelation, type SourceProvenance, type EntityType } from '../types';
import { shortId } from '../util';

export interface GraphImportPayload {
  sourceId: string;
  entities: Array<{ name: string; type: EntityType; aliases?: string[]; codes?: GraphEntity['codes']; properties?: Record<string, string | number | boolean> }>;
  relations?: Array<{ from: string; to: string; type: string; weight?: number; properties?: Record<string, string | number | boolean> }>;
  provenance: SourceProvenance;
}

interface Edge {
  relation: GraphRelation;
  toId: string;
}

export class KnowledgeGraph {
  readonly entities = new Map<string, GraphEntity>();
  readonly relations = new Map<string, GraphRelation>();
  private nameIndex = new Map<string, string>();
  private adjacency = new Map<string, Edge[]>();

  // --------------------------------------------------------------------------
  // 实体
  // --------------------------------------------------------------------------

  /** 按规范名/别名查找实体 id */
  resolve(name: string): string | undefined {
    const key = name.trim().toLowerCase();
    return this.nameIndex.get(key);
  }

  upsertEntity(input: Omit<GraphEntity, 'id' | 'provenance'> & { id?: string; provenance?: SourceProvenance }, provenance: SourceProvenance): GraphEntity {
    const existingId = this.resolve(input.name);
    if (existingId) {
      const existing = this.entities.get(existingId)!;
      existing.aliases = [...new Set([...existing.aliases, ...input.aliases])];
      existing.codes = { ...existing.codes, ...input.codes };
      existing.properties = { ...existing.properties, ...input.properties };
      for (const a of input.aliases) this.nameIndex.set(a.toLowerCase(), existing.id);
      return existing;
    }
    const id = input.id ?? shortId('ent');
    const entity: GraphEntity = {
      id,
      name: input.name,
      type: input.type,
      aliases: input.aliases ?? [],
      codes: input.codes ?? {},
      properties: input.properties ?? {},
      provenance: input.provenance ?? provenance,
    };
    this.entities.set(id, entity);
    this.nameIndex.set(entity.name.toLowerCase(), id);
    for (const a of entity.aliases) this.nameIndex.set(a.toLowerCase(), id);
    this.adjacency.set(id, []);
    return entity;
  }

  getEntity(id: string): GraphEntity | undefined {
    return this.entities.get(id);
  }

  // --------------------------------------------------------------------------
  // 关系
  // --------------------------------------------------------------------------

  addRelation(from: string, to: string, type: string, provenance: SourceProvenance, weight = 0.8, properties?: GraphRelation['properties']): GraphRelation | undefined {
    if (!this.entities.has(from) || !this.entities.has(to)) return undefined;
    // 去重：同源同类型同端点
    for (const e of this.adjacency.get(from) ?? []) {
      if (e.toId === to && e.relation.type === type) {
        e.relation.weight = Math.max(e.relation.weight, weight);
        return e.relation;
      }
    }
    const rel: GraphRelation = { id: shortId('rel'), fromId: from, toId: to, type, weight, properties, provenance };
    this.relations.set(rel.id, rel);
    this.adjacency.get(from)?.push({ relation: rel, toId: to });
    return rel;
  }

  neighbors(entityId: string, relationTypes?: string[]): Array<{ entity: GraphEntity; relation: GraphRelation }> {
    const edges = this.adjacency.get(entityId) ?? [];
    return edges
      .filter((e) => !relationTypes || relationTypes.includes(e.relation.type))
      .map((e) => ({ entity: this.entities.get(e.toId)!, relation: e.relation }))
      .filter((x) => x.entity);
  }

  /** BFS 多跳扩展，返回命中实体与路径（用于图谱召回与解释） */
  expand(startName: string, maxHops = 2, relationTypes?: string[]): Array<{ entity: GraphEntity; path: string[]; depth: number }> {
    const startId = this.resolve(startName);
    if (!startId) return [];
    const visited = new Set<string>([startId]);
    const out: Array<{ entity: GraphEntity; path: string[]; depth: number }> = [];
    const queue: Array<{ id: string; depth: number; path: string[] }> = [
      { id: startId, depth: 0, path: [startName] },
    ];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.depth >= maxHops) continue;
      for (const n of this.neighbors(cur.id, relationTypes)) {
        if (visited.has(n.entity.id)) continue;
        visited.add(n.entity.id);
        const path = [...cur.path, n.relation.type, n.entity.name];
        out.push({ entity: n.entity, path, depth: cur.depth + 1 });
        queue.push({ id: n.entity.id, depth: cur.depth + 1, path });
      }
    }
    return out;
  }

  /** 两实体间最短路径（BFS），无可达路径返回空 */
  shortestPath(fromName: string, toName: string): string[] {
    const from = this.resolve(fromName);
    const to = this.resolve(toName);
    if (!from || !to) return [];
    const prev = new Map<string, { from: string; rel: string; name: string }>();
    const seen = new Set<string>([from]);
    const queue = [from];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === to) {
        const path: string[] = [];
        let node: string | undefined = to;
        while (node && node !== from) {
          const p = prev.get(node);
          if (!p) break;
          path.unshift(p.name, p.rel);
          node = p.from;
        }
        path.unshift(fromName);
        return path;
      }
      for (const n of this.neighbors(cur)) {
        if (seen.has(n.entity.id)) continue;
        seen.add(n.entity.id);
        prev.set(n.entity.id, { from: cur, rel: n.relation.type, name: n.entity.name });
        queue.push(n.entity.id);
      }
    }
    return [];
  }

  // --------------------------------------------------------------------------
  // 导入适配
  // --------------------------------------------------------------------------

  /** 通用导入：CMeKG / TCM-MKG 等只需把开放数据转换为 GraphImportPayload */
  importPayload(payload: GraphImportPayload): { entities: number; relations: number } {
    const idByName = new Map<string, string>();
    for (const e of payload.entities) {
      const ent = this.upsertEntity(
        {
          name: e.name,
          type: e.type,
          aliases: e.aliases ?? [],
          codes: e.codes ?? {},
          properties: e.properties ?? {},
        },
        payload.provenance,
      );
      idByName.set(e.name, ent.id);
    }
    let relCount = 0;
    for (const r of payload.relations ?? []) {
      const f = idByName.get(r.from) ?? this.resolve(r.from);
      const t = idByName.get(r.to) ?? this.resolve(r.to);
      if (f && t && this.addRelation(f, t, r.type, payload.provenance, r.weight ?? 0.8, r.properties)) relCount++;
    }
    return { entities: idByName.size, relations: relCount };
  }

  stats(): { entities: number; relations: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const e of this.entities.values()) byType[e.type] = (byType[e.type] ?? 0) + 1;
    return { entities: this.entities.size, relations: this.relations.size, byType };
  }
}
