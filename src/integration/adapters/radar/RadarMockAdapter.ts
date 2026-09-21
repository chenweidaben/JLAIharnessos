/**
 * 健澜科技数智医院智能体 - RADAR Mock 适配器（确定性降级）
 *
 * 当 Python 推理服务不可用（连接拒绝 / 超时 / 熔断打开）时，由 BFF 层
 * 直接返回与 demo CSV 同源的确定性数值，保证前端闭环不白屏。
 * 绝不臆造字段，数据全部来自 radarData（.radar-contract.json）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AdapterMetadata } from '../../types';
import { createDefaultAdapterConfig } from '../AdapterConfig';
import { BaseAdapter } from '../BaseAdapter';
import {
  buildCatalog,
  buildFindings,
  type RadarCatalog,
  type RadarResult,
} from './radarData';

/**
 * RADAR Mock 适配器
 *
 * 无外部依赖，纯内存返回契约规定的静态目录与确定性 demo 结果。
 */
export class RadarMockAdapter extends BaseAdapter {
  constructor() {
    super(
      createDefaultAdapterConfig({
        id: 'radar-mock',
        type: 'generic',
        vendor: 'damo-radar',
        version: 'eaec6129',
        name: 'DAMO-RADAR 内置降级适配器',
        endpoint: 'mock://radar',
        timeout: 1000,
        auth: { type: 'none' },
      }),
    );
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'generic',
      vendor: 'damo-radar',
      version: 'eaec6129',
      name: 'DAMO-RADAR 内置降级适配器',
      description: '推理服务不可用时返回与 demo CSV 同源的 18 器官/146 发现确定性结果',
      supportedProtocols: ['mock'],
    };
  }

  /** 静态目录（18 器官 / 146 发现） */
  getCatalog(): RadarCatalog {
    return buildCatalog();
  }

  /** 确定性 demo 推理结果（146 findings） */
  getDemoResult(studyUid: string): RadarResult {
    return buildFindings(studyUid, 'demo');
  }
}
