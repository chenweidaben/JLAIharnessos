/**
 * 健澜科技 jlmedaios - 轻量 Saga 编排器（纯函数式，无外部依赖）
 *
 * 用于"跨步骤、需补偿"的长事务（如收费结算 / 退费）：
 *  - 顺序执行每个步骤的 action；
 *  - 任一步骤失败时，按"已成功步骤"的逆序执行其 compensate；
 *  - 补偿本身也失败时抛出 SagaCompensationError（需人工介入，不能静默吞掉）。
 *
 * 设计说明：
 *  - 本编排器不绑定数据库；调用方决定事务边界。
 *  - 对于"单库本地一致性"，可把 saga 放在一个数据库事务内（失败整体回滚），
 *    编排器提供清晰的步骤/补偿结构与可独立测试的失败语义；
 *  - 对于"跨服务/跨事务"，每个 action 独立提交，compensate 为已提交的反向动作
 *    （如收费已成功后，退费即为其补偿）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** Saga 步骤：action 正向动作，compensate 可选补偿动作。 */
export interface SagaStep<T> {
  name: string;
  action: (ctx: T) => Promise<void> | void;
  compensate?: (ctx: T) => Promise<void> | void;
}

export interface SagaExecution {
  /** 全部步骤是否成功完成 */
  completed: boolean;
  /** 已成功执行（可能需要补偿）的步骤名，按执行顺序 */
  executedSteps: string[];
  /** 已执行补偿的步骤名，按补偿顺序（逆序） */
  compensatedSteps: string[];
  /** 触发失败的步骤名（仅失败时） */
  failureStep?: string;
  /** 原始失败原因（仅失败时） */
  cause?: unknown;
}

/** Saga 正向步骤失败（已尝试补偿）。 */
export class SagaExecutionError extends Error {
  constructor(
    public failureStep: string,
    public execution: SagaExecution,
    public cause: unknown,
  ) {
    super(`Saga 在步骤「${failureStep}」失败：${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'SagaExecutionError';
  }
}

/** Saga 补偿动作自身失败（状态可能不一致，需人工介入）。 */
export class SagaCompensationError extends Error {
  constructor(
    public failureStep: string,
    public compensationStep: string,
    public execution: SagaExecution,
    public cause: unknown,
    public compensationCause: unknown,
  ) {
    super(
      `Saga 在步骤「${failureStep}」失败，且补偿「${compensationStep}」也失败：` +
        `${compensationCause instanceof Error ? compensationCause.message : String(compensationCause)}`,
    );
    this.name = 'SagaCompensationError';
  }
}

export interface SagaHooks<T> {
  /** 每个步骤开始前回调（用于落 saga 日志）。 */
  onStepStart?: (step: SagaStep<T>, direction: 'forward' | 'compensate') => Promise<void> | void;
  /** 每个步骤结束后回调。 */
  onStepSuccess?: (step: SagaStep<T>, direction: 'forward' | 'compensate') => Promise<void> | void;
}

/**
 * 执行 Saga。
 *
 * @returns 全部成功时返回 completed:true 的执行记录；
 * @throws SagaExecutionError 正向失败且补偿完成；
 *         SagaCompensationError 补偿也失败。
 */
export async function runSaga<T>(
  steps: SagaStep<T>[],
  ctx: T,
  hooks?: SagaHooks<T>,
): Promise<SagaExecution> {
  const executed: SagaStep<T>[] = [];

  for (const step of steps) {
    try {
      await hooks?.onStepStart?.(step, 'forward');
      await step.action(ctx);
      await hooks?.onStepSuccess?.(step, 'forward');
      executed.push(step);
    } catch (cause) {
      // 正向失败：逆序补偿已成功步骤
      const compensatedSteps: string[] = [];
      for (let i = executed.length - 1; i >= 0; i--) {
        const s = executed[i];
        if (!s.compensate) continue;
        try {
          await hooks?.onStepStart?.(s, 'compensate');
          await s.compensate(ctx);
          await hooks?.onStepSuccess?.(s, 'compensate');
          compensatedSteps.push(s.name);
        } catch (compensationCause) {
          const execution: SagaExecution = {
            completed: false,
            executedSteps: executed.map((x) => x.name),
            compensatedSteps,
            failureStep: step.name,
            cause,
          };
          throw new SagaCompensationError(
            step.name, s.name, execution, cause, compensationCause,
          );
        }
      }
      const execution: SagaExecution = {
        completed: false,
        executedSteps: executed.map((x) => x.name),
        compensatedSteps,
        failureStep: step.name,
        cause,
      };
      throw new SagaExecutionError(step.name, execution, cause);
    }
  }

  return {
    completed: true,
    executedSteps: executed.map((x) => x.name),
    compensatedSteps: [],
  };
}
