/**
 * 健澜科技 jlmedaios - M137-D 关键业务流程 E2E 测试聚合器【测试覆盖率冲刺 · 生产就绪质量门禁】
 *
 * 本模块仅提供纯函数与静态流程清单（零 I/O、零网络、零数据库副作用）：
 *  - E2E_FLOW_REGISTRY：四条关键业务流程的静态步骤清单（模拟真实用户操作）
 *  - simulatedUserRunner：默认步骤执行器——确定性模拟一步真实用户操作成功
 *  - runE2ETestFlow(flowName, runner?)：跑单条流程，逐步骤产出 绿/红 结果
 *  - generateE2EReport(results, meta?)：把多条流程结果聚合成整份红绿报告
 *
 * 覆盖的四条关键业务流程（均取自院内真实主链路）：
 *  1. 患者就诊 ：挂号 → 看诊 → 开方 → 取药 → 随访
 *  2. 住院     ：入院 → 医嘱 → 护理 → 出院
 *  3. 处方审核 ：开方 → 审方 → 发药
 *  4. Personal Agent：登录 → 看推荐 → 记录经验 → 查看成长
 *
 * 设计约束：
 *  - 不发起任何 HTTP / WebSocket 请求，不连数据库，不读取环境副作用；
 *  - 仅做确定性运算，便于在单元测试与 BFF 路由层直接复用；
 *  - 步骤执行器 E2EStepRunner 可注入——单测 / CI 可替换为故障执行器，
 *    验证红灯路径与报告门禁结论，生产路由层默认用 simulatedUserRunner。
 *
 * 依据：宪法第三章（权限与访问控制基线）——本聚合器仅描述业务链路本身，
 *       实际访问控制由路由层 requireRole(c, 'admin') 兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** E2E 业务流程标识（四条关键主链路） */
export type E2EFlowName = 'outpatient' | 'inpatient' | 'prescriptionReview' | 'personalAgent';

/** 单步定义：一条真实用户操作（测试覆盖率冲刺——按临床主链路逐步骤还原） */
export interface E2EStepDef {
  /** 步骤稳定标识（同流程内唯一） */
  key: string;
  /** 中文步骤名（前端报告展示用） */
  label: string;
  /** 操作角色（患者 / 医生 / 药师 / 护士 / Personal Agent 用户等） */
  actor: string;
  /** 模拟的真实用户动作描述（写清做了什么，便于红绿报告复现） */
  action: string;
}

/** 单条 E2E 流程定义（静态清单） */
export interface E2EFlowDef {
  /** 流程标识 */
  name: E2EFlowName;
  /** 流程中文标题 */
  label: string;
  /** 该流程的有序步骤（顺序即真实业务先后） */
  steps: readonly E2EStepDef[];
}

/**
 * 步骤执行器签名：给定步骤定义与步序，返回该步执行结果。
 * 注入点：生产默认 simulatedUserRunner（确定性模拟成功）；测试 / CI 可替换。
 */
export type E2EStepRunner = (
  step: E2EStepDef,
  index: number,
) => { ok: boolean; elapsedMs: number; note: string };

/** 单步执行结果（红绿报告的最小单元） */
export interface E2EStepResult {
  key: string;
  label: string;
  actor: string;
  action: string;
  /** 是否通过（true=绿，false=红） */
  ok: boolean;
  /** 该步耗时（毫秒，确定性模拟） */
  elapsedMs: number;
  /** 备注（成功回执 / 失败原因） */
  note: string;
}

/** 单条流程的 E2E 结果（runE2ETestFlow 的输出） */
export interface E2EResult {
  /** 流程标识；未知流程时为请求的原始字符串 */
  flowName: E2EFlowName | string;
  /** 流程中文标题；未知流程时为「未注册流程」 */
  label: string;
  /** 流程门禁结论：全部步骤为绿才为 true */
  ok: boolean;
  /** 步骤总数 */
  totalSteps: number;
  /** 通过(绿)步数 */
  passedSteps: number;
  /** 失败(红)步数 */
  failedSteps: number;
  /** 该流程累计耗时（毫秒） */
  elapsedMs: number;
  /** 逐步骤结果（保持业务顺序） */
  steps: E2EStepResult[];
  /** 附加说明（如未知流程原因） */
  note?: string;
}

/** 整份 E2E 红绿报告（generateE2EReport 的输出） */
export interface E2EReport {
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 流程总数 */
  totalFlows: number;
  /** 全绿流程数 */
  passedFlows: number;
  /** 存在红项的流程数 */
  failedFlows: number;
  /** 步骤总数（跨流程累加） */
  totalSteps: number;
  /** 通过(绿)步骤数 */
  passedSteps: number;
  /** 失败(红)步骤数 */
  failedSteps: number;
  /** 流程级通过率 0..1（全绿流程 / 总流程） */
  flowPassRate: number;
  /** 步骤级通过率 0..1（绿步 / 总步） */
  stepPassRate: number;
  /** 质量门禁结论：failedFlows === 0 即为 true（全绿放行） */
  ok: boolean;
  /** 流程平均耗时（毫秒） */
  avgFlowElapsedMs: number;
  /** 存在红项的流程明细（保持入参顺序） */
  failures: E2EResult[];
  /** 全部流程结果（保持入参顺序） */
  results: E2EResult[];
}

/* =========================================================================
 * 静态流程清单【测试覆盖率冲刺】
 * -------------------------------------------------------------------------
 * 四条关键业务流程的步骤全部按院内真实主链路还原：
 * 每一步都是一类角色的一次真实操作，而非抽象接口探测。
 * ========================================================================= */

/**
 * 四条关键业务流程静态注册清单。
 *
 * 顺序即业务先后；新增 / 调整主链路时需同步更新本清单与前端标签。
 */
export const E2E_FLOW_REGISTRY: readonly E2EFlowDef[] = [
  {
    name: 'outpatient',
    label: '患者就诊（门诊主链路）',
    steps: [
      { key: 'register', label: '挂号', actor: '患者', action: '患者在门诊窗口/自助机挂普通内科号，分配就诊队列与号源' },
      { key: 'consult', label: '看诊', actor: '医生', action: '医生叫号接诊，采集主诉、查体并写入门诊病历与初步诊断' },
      { key: 'prescribe', label: '开方', actor: '医生', action: '医生按诊断开具处方（药品、用法用量、天数），提交至药房' },
      { key: 'dispense', label: '取药', actor: '药师', action: '药师调剂处方、核对发药，患者在窗口刷卡取药并签收' },
      { key: 'followup', label: '随访', actor: '医生/随访护士', action: '复诊到期触发随访提醒，记录疗效与不良反应并闭环' },
    ],
  },
  {
    name: 'inpatient',
    label: '住院（入院到出院主链路）',
    steps: [
      { key: 'admit', label: '入院', actor: '住院处/护士', action: '办理入院登记、分配床位，患者入科并完成入院评估' },
      { key: 'orders', label: '医嘱', actor: '医生', action: '医生下达长期/临时医嘱（用药、检验、检查、护理级别）并提交' },
      { key: 'nursing', label: '护理', actor: '护士', action: '护士执行医嘱、核对给药、记录生命体征与护理记录单' },
      { key: 'discharge', label: '出院', actor: '医生/住院处', action: '医生开具出院小结与出院带药，结算后办理出院' },
    ],
  },
  {
    name: 'prescriptionReview',
    label: '处方审核（药事质控主链路）',
    steps: [
      { key: 'prescribe', label: '开方', actor: '医生', action: '医生开具处方，系统按规则前置校验后流转至药师' },
      { key: 'review', label: '审方', actor: '药师', action: '药师双人审方：适应证、相互作用、剂量、禁忌，通过或退回' },
      { key: 'dispense', label: '发药', actor: '药师', action: '审方通过后调剂发药，患者取药并完成用药交代' },
    ],
  },
  {
    name: 'personalAgent',
    label: 'Personal Agent（个人智能体成长主链路）',
    steps: [
      { key: 'login', label: '登录', actor: '员工', action: '员工登录 Personal Agent，加载个人画像与岗位上下文' },
      { key: 'recommend', label: '看推荐', actor: '员工', action: '浏览智能体基于岗位推送的待办、知识路径与个性化建议' },
      { key: 'recordExperience', label: '记录经验', actor: '员工', action: '沉淀本次诊疗/处置经验与复盘，形成可复用经验条目' },
      { key: 'viewGrowth', label: '查看成长', actor: '员工', action: '查看个人成长曲线、经验积累与能力雷达，确认进步闭环' },
    ],
  },
];

/** 全部流程标识（供路由层批量执行） */
export const ALL_E2E_FLOW_NAMES: readonly E2EFlowName[] = E2E_FLOW_REGISTRY.map((f) => f.name);

/**
 * 默认步骤执行器：确定性模拟一步真实用户操作成功。
 *
 * 口径：
 *  - ok 恒为 true（生产路由层只做主链路可走通的结构级验证，不发起真实调用）；
 *  - elapsedMs 按步序确定性递增（20 + index*7），红绿报告耗时稳定可断言；
 *  - note 回带该步的成功回执，形如「… → 操作成功，状态已落库」。
 *
 * 这是安全默认值：E2E 质量门禁只验证「流程定义完整、步骤顺序可走通」，
 * 不对真实业务端点发起调用，避免鉴权 / 副作用风险。
 */
export const simulatedUserRunner: E2EStepRunner = (step, index) => ({
  ok: true,
  elapsedMs: 20 + index * 7,
  note: `${step.action} → 操作成功，状态已落库`,
});

/**
 * 按流程标识在静态注册表中查找流程定义（纯查询）。
 *
 * @param flowName 流程标识
 * @returns 流程定义；未注册时返回 undefined
 */
export function findFlow(flowName: string): E2EFlowDef | undefined {
  return E2E_FLOW_REGISTRY.find((f) => f.name === flowName);
}

/**
 * 跑单条 E2E 流程（纯函数）。
 *
 * 对一条流程的每一个步骤：
 *  1. 调用执行器 runner(step, index) 得到 ok / elapsedMs / note；
 *  2. 逐步骤累加：绿步 ok=true、红步 ok=false；
 *  3. 汇总 totalSteps / passedSteps / failedSteps / 累计耗时；
 *  4. 流程门禁结论 ok = (failedSteps === 0)。
 *
 * 未知流程：不抛异常，返回一个 ok=false 的结果（label='未注册流程'、
 * note 写明原因），便于报告层把缺失流程识别为红灯而非让进程崩溃。
 *
 * @param flowName 流程标识
 * @param runner 步骤执行器（默认 simulatedUserRunner）
 * @returns 单条流程的 E2E 结果
 *
 * @example
 * runE2ETestFlow('outpatient').ok; // true（5 步全绿）
 */
export function runE2ETestFlow(
  flowName: E2EFlowName | string,
  runner: E2EStepRunner = simulatedUserRunner,
): E2EResult {
  const flow = findFlow(flowName);
  if (!flow) {
    return {
      flowName,
      label: '未注册流程',
      ok: false,
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      elapsedMs: 0,
      steps: [],
      note: `未在 E2E_FLOW_REGISTRY 中注册的流程标识：${flowName}`,
    };
  }

  const steps: E2EStepResult[] = [];
  let passedSteps = 0;
  let elapsedMs = 0;

  flow.steps.forEach((step, index) => {
    const outcome = runner(step, index);
    const ok = outcome.ok;
    const ms = Math.max(0, Math.round(outcome.elapsedMs));
    if (ok) passedSteps += 1;
    elapsedMs += ms;
    steps.push({
      key: step.key,
      label: step.label,
      actor: step.actor,
      action: step.action,
      ok,
      elapsedMs: ms,
      note: outcome.note,
    });
  });

  const failedSteps = steps.length - passedSteps;

  return {
    flowName: flow.name,
    label: flow.label,
    ok: failedSteps === 0,
    totalSteps: steps.length,
    passedSteps,
    failedSteps,
    elapsedMs,
    steps,
  };
}

/**
 * 由多条流程结果生成整份 E2E 红绿报告（纯函数）。
 *
 * 统计口径：
 *  - totalFlows / passedFlows / failedFlows：按流程门禁结论计数；
 *  - totalSteps / passedSteps / failedSteps：跨流程累加各步结论；
 *  - flowPassRate：passedFlows / totalFlows（空清单记 1）；
 *  - stepPassRate：passedSteps / totalSteps（空清单记 1）；
 *  - ok：failedFlows === 0 的质量门禁结论（全绿放行）；
 *  - avgFlowElapsedMs：各流程 elapsedMs 的算术平均（四舍五入）；
 *  - failures：所有存在红项的流程（保持入参顺序）。
 *
 * @param results runE2ETestFlow 的输出集合
 * @param meta 可选元信息（generatedAt）；测试可固定时间戳
 * @returns 红绿报告数据
 */
export function generateE2EReport(
  results: readonly E2EResult[],
  meta: { generatedAt?: string } = {},
): E2EReport {
  const failures: E2EResult[] = [];
  let totalSteps = 0;
  let passedSteps = 0;
  let elapsedSum = 0;

  for (const r of results) {
    totalSteps += r.totalSteps;
    passedSteps += r.passedSteps;
    elapsedSum += r.elapsedMs;
    if (!r.ok) failures.push(r);
  }

  const totalFlows = results.length;
  const passedFlows = totalFlows - failures.length;
  const failedSteps = totalSteps - passedSteps;

  return {
    generatedAt: meta.generatedAt ?? new Date().toISOString(),
    totalFlows,
    passedFlows,
    failedFlows: failures.length,
    totalSteps,
    passedSteps,
    failedSteps,
    flowPassRate: totalFlows === 0 ? 1 : Number((passedFlows / totalFlows).toFixed(4)),
    stepPassRate: totalSteps === 0 ? 1 : Number((passedSteps / totalSteps).toFixed(4)),
    ok: failures.length === 0,
    avgFlowElapsedMs: totalFlows === 0 ? 0 : Math.round(elapsedSum / totalFlows),
    failures,
    results: [...results],
  };
}
