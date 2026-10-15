/**
 * 健澜科技 jlmedaios - 全系统路由回归冒烟测试聚合器
 *
 * 本模块仅提供纯函数：
 *  - classifyStatus: 把 HTTP 状态码归一为冒烟结论（pass / auth / forbidden / fail）
 *  - summarize:      对一批路由冒烟结果做汇总（总数 / 通过 / 失败 / 失败清单）
 *
 * 设计约束：
 *  - 不发起任何 HTTP 请求，不连接数据库，不读取环境副作用；
 *  - 仅做确定性运算，便于在单元测试与 BFF 路由层直接复用；
 *  - 路由层（routes/smokeTest.ts）以「静态已知清单」遍历结果作为入参，
 *    本模块只负责归类与汇总，不关心路由清单来源。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 冒烟结论四分类 */
export type SmokeStatus = 'pass' | 'auth' | 'forbidden' | 'fail';

/**
 * 单条路由冒烟结果。
 *
 * 说明：这是「静态遍历与已知清单比对」得出的合成结果，并非真实 HTTP 响应。
 *  - status = 200：路由存在且结构合法（通过）
 *  - status = 401：路由受登录保护（预期鉴权拦截，非故障）
 *  - status = 403：路由受 RBAC 保护（预期权限拦截，非故障）
 *  - status = 500：路由缺失 / 重复 / 前缀漂移（回归故障）
 */
export interface SmokeRouteResult {
  /** HTTP 方法（冒烟只覆盖 GET） */
  method: string;
  /** 路由路径模式，如 /api/v1/admin/users/:id */
  path: string;
  /** 静态比对得出的合成状态码 */
  status: number;
  /** 备注（失败原因、说明等） */
  note?: string;
}

/** 冒烟汇总结果 */
export interface SmokeSummary {
  /** 参与统计的路由总数 */
  total: number;
  /** 通过数（状态分类为 pass） */
  pass: number;
  /** 失败数（状态分类为 fail） */
  fail: number;
  /** 失败明细清单（保持入参顺序） */
  failures: SmokeRouteResult[];
}

/**
 * 将 HTTP 状态码归类为冒烟结论。
 *
 * 映射规则：
 *  - 2xx（含 200）            → 'pass'       路由可用
 *  - 401                      → 'auth'       未登录（预期鉴权拦截，非路由故障）
 *  - 403                      → 'forbidden'  权限不足（预期 RBAC 拦截，非路由故障）
 *  - 5xx（含 500）            → 'fail'       服务端错误 / 路由缺失
 *  - 其余（400 / 404 / 429 等）→ 'fail'       保守口径按失败处理
 *
 * @param status HTTP 状态码（静态比对时为合成状态码）
 * @returns 归一化结论
 *
 * @example
 * classifyStatus(200); // 'pass'
 * classifyStatus(401);  // 'auth'
 * classifyStatus(403);  // 'forbidden'
 * classifyStatus(500);  // 'fail'
 */
export function classifyStatus(status: number): SmokeStatus {
  if (status >= 200 && status < 300) return 'pass';
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status >= 500 && status < 600) return 'fail';
  return 'fail';
}

/**
 * 对一批路由冒烟结果做汇总。
 *
 * 统计口径：
 *  - total：结果总数（入参长度）
 *  - pass：分类为 'pass' 的条数
 *  - fail：分类为 'fail' 的条数
 *  - failures：所有 'fail' 结果的明细（保持原顺序）
 *
 * 注意：'auth' / 'forbidden' 属预期鉴权拦截，既不计入 pass 也不计入 fail，
 * 因此 pass + fail 可能小于 total。
 *
 * @param results 单条路由冒烟结果数组
 * @returns 汇总对象
 *
 * @example
 * summarize([
 *   { method: 'GET', path: '/a', status: 200 },
 *   { method: 'GET', path: '/b', status: 500, note: 'missing' },
 * ]);
 * // { total: 2, pass: 1, fail: 1, failures: [{ method:'GET', path:'/b', status:500, note:'missing' }] }
 */
export function summarize(results: readonly SmokeRouteResult[]): SmokeSummary {
  let pass = 0;
  const failures: SmokeRouteResult[] = [];
  for (const r of results) {
    const cat = classifyStatus(r.status);
    if (cat === 'pass') {
      pass += 1;
    } else if (cat === 'fail') {
      failures.push(r);
    }
  }
  return {
    total: results.length,
    pass,
    fail: failures.length,
    failures,
  };
}
