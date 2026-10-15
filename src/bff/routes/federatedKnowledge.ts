/**
 * 健澜科技 jlmedaios - 跨院知识联邦路由（M133-C，SaaS化+智慧度）
 *
 * GET /api/v1/federated/knowledge?type=pathway
 *   以本院为知识接收方，从联邦成员医院汇聚已脱敏的临床知识
 *   （路径/用药/诊断/教训），供主管医师跨院参考。
 *
 * 【SaaS化 + 智慧度】数据不出域：各院仅交换脱敏后的组织记忆，
 * 本院自身知识不回传；对端高成功率经验降序前置。
 *
 * 医疗安全：本端点只读；跨院知识为辅助参考，最终诊疗决策由主管医师作出。
 * 安全：出域知识已经 anonymizeKnowledge 脱敏，无患者/医生个人信息。
 * 权限：federated:knowledge:view（admin 全量放行）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  FEDERATED_KNOWLEDGE_PERMISSION,
  getFederatedKnowledgeView,
} from '../aggregators/federatedKnowledgeAggregator';

export const federatedKnowledgeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/federated/knowledge',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // 权限控制：跨院知识仅授权医师/管理员可浏览
      const denied = requirePermissionCode(c, FEDERATED_KNOWLEDGE_PERMISSION);
      if (denied) return denied;

      try {
        const type = c.query.get('type') ?? undefined;
        // from：本院（接收方）；peer：指定对端医院（缺省跨全部成员院）
        const requester = c.query.get('from') ?? undefined;
        const peer = c.query.get('peer') ?? undefined;
        const data = getFederatedKnowledgeView(type, requester, peer);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '跨院知识联邦加载失败'),
          500,
        );
      }
    },
  },
];
