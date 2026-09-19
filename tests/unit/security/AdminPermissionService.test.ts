/**
 * 健澜科技数智医院智能体（jlmedaios） - AdminPermissionService 单元测试
 *
 * 版权所有 (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';

import {
  DataScope,
  PermissionAction,
  PermissionDecision,
  PermissionDeniedError,
  PermissionModule,
  RoleCode,
  SecurityError,
} from '../../../src/security/types';
import { AdminPermissionService } from '../../../src/security/auth/AdminPermissionService';

const ADMIN = {
  userId: 'admin-1',
  userName: '系统管理员',
  roles: [RoleCode.SYSTEM_ADMIN] as RoleCode[],
};

const NURSE_OP = {
  userId: 'nurse-1',
  userName: '护士',
  roles: [RoleCode.NURSE] as RoleCode[],
};

/** 每个用例使用全新服务（全新覆盖层），保证隔离 */
function fresh(): AdminPermissionService {
  return new AdminPermissionService();
}

describe('AdminPermissionService - 只读查询', () => {
  test('listRoles 返回 12 个角色', () => {
    const svc = fresh();
    const roles = svc.listRoles();
    expect(roles.length).toBe(12);
  });

  test('listMatrix 返回生效矩阵与版本/模块/操作定义', () => {
    const svc = fresh();
    const view = svc.listMatrix();
    expect(view.version).toBe(0);
    expect(view.overlayCount).toBe(0);
    expect(view.entries.length).toBeGreaterThan(0);
    expect(view.modules[PermissionModule.PATIENT]).toBeDefined();
    expect(view.actions[PermissionAction.READ]).toBeDefined();
  });

  test('getEntry 无覆盖时 overlayActive=false', () => {
    const svc = fresh();
    const detail = svc.getEntry(PermissionModule.PATIENT, PermissionAction.READ);
    expect(detail.overlayActive).toBe(false);
    expect(detail.overlay).toBeNull();
  });

  test('getEntry 不存在的条目抛错', () => {
    const svc = fresh();
    // 构造一个不存在的 module/action 组合（PATIENT 无 APPROVE）
    expect(() => svc.getEntry(PermissionModule.PATIENT, PermissionAction.APPROVE)).toThrow();
  });
});

describe('AdminPermissionService - 越权写操作拒绝', () => {
  test('非 SYSTEM_ADMIN 调 grant 抛 PermissionDeniedError', () => {
    const svc = fresh();
    expect(() =>
      svc.grant(
        { role: RoleCode.GUEST, module: PermissionModule.LAB, action: PermissionAction.READ },
        NURSE_OP,
      ),
    ).toThrow(PermissionDeniedError);
  });

  test('非 SYSTEM_ADMIN 调 updateEntry 抛 PermissionDeniedError', () => {
    const svc = fresh();
    expect(() =>
      svc.updateEntry(
        { module: PermissionModule.LAB, action: PermissionAction.READ, riskLevel: 'high' },
        NURSE_OP,
      ),
    ).toThrow(PermissionDeniedError);
  });

  test('非 SYSTEM_ADMIN 调 revoke 抛 PermissionDeniedError', () => {
    const svc = fresh();
    expect(() =>
      svc.revoke(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, NURSE_OP),
    ).toThrow(PermissionDeniedError);
  });
});

describe('AdminPermissionService - 管理员写操作与审计', () => {
  test('grant 成功并落审计', () => {
    const svc = fresh();
    const detail = svc.grant(
      { role: RoleCode.GUEST, module: PermissionModule.LAB, action: PermissionAction.READ },
      ADMIN,
    );
    expect(detail.allowedRoles).toContain(RoleCode.GUEST);
    expect(detail.overlayActive).toBe(true);

    const audit = svc.getAuditLog();
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[audit.length - 1].operatorId).toBe(ADMIN.userId);
    expect(audit[audit.length - 1].action).toBe('grant');
  });

  test('revoke 成功', () => {
    const svc = fresh();
    svc.grant(
      { role: RoleCode.GUEST, module: PermissionModule.LAB, action: PermissionAction.READ },
      ADMIN,
    );
    const after = svc.revoke(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, ADMIN);
    expect(after.allowedRoles).not.toContain(RoleCode.GUEST);
  });

  test('非法风险等级抛 SecurityError', () => {
    const svc = fresh();
    expect(() =>
      svc.updateEntry(
        // @ts-expect-error 故意传入非法风险等级做负向测试
        { module: PermissionModule.LAB, action: PermissionAction.READ, riskLevel: 'bogus' },
        ADMIN,
      ),
    ).toThrow(SecurityError);
  });

  test('非法数据范围抛 SecurityError', () => {
    const svc = fresh();
    expect(() =>
      svc.updateEntry(
        // @ts-expect-error 故意传入非法数据范围
        { module: PermissionModule.LAB, action: PermissionAction.READ, defaultScope: 'nope' },
        ADMIN,
      ),
    ).toThrow(SecurityError);
  });
});

describe('AdminPermissionService - 医疗安全红线', () => {
  test('禁止把已强制 MFA 的高风险条目降级为不要求 MFA', () => {
    const svc = fresh();
    // PATIENT.EXPORT 基线 requireMfa=true
    expect(() =>
      svc.updateEntry(
        {
          module: PermissionModule.PATIENT,
          action: PermissionAction.EXPORT,
          requireMfa: false,
        },
        ADMIN,
      ),
    ).toThrow(PermissionDeniedError);
  });

  test('允许把未强制 MFA 的新覆盖设为 requireMfa=true', () => {
    const svc = fresh();
    const detail = svc.updateEntry(
      {
        module: PermissionModule.LAB,
        action: PermissionAction.READ,
        requireMfa: true,
      },
      ADMIN,
    );
    expect(detail.requireMfa).toBe(true);
  });
});

describe('AdminPermissionService - evaluate 运行时决策', () => {
  const guestUser = {
    userId: 'guest-1',
    userName: '访客',
    roles: [RoleCode.GUEST] as RoleCode[],
    department: 'public',
  };

  test('无覆盖时复用 PermissionChecker：访客读患者被拒', () => {
    const svc = fresh();
    const result = svc.evaluate({
      user: guestUser,
      module: PermissionModule.PATIENT,
      action: PermissionAction.READ,
    });
    expect(result.overlayActive).toBe(false);
    expect(result.decision).toBe(PermissionDecision.DENY);
  });

  test('覆盖授权后 evaluate 提升为允许；撤销后恢复拒绝', () => {
    const svc = fresh();
    // 运行时授权访客可读患者（SELF 范围）
    svc.grant(
      {
        role: RoleCode.GUEST,
        module: PermissionModule.PATIENT,
        action: PermissionAction.READ,
        scope: DataScope.SELF,
      },
      ADMIN,
    );

    const granted = svc.evaluate({
      user: guestUser,
      module: PermissionModule.PATIENT,
      action: PermissionAction.READ,
      resourceOwnerId: 'guest-1',
    });
    expect(granted.overlayActive).toBe(true);
    expect(granted.decision).toBe(PermissionDecision.ALLOW);

    // 撤销后
    svc.revoke(RoleCode.GUEST, PermissionModule.PATIENT, PermissionAction.READ, ADMIN);
    const revoked = svc.evaluate({
      user: guestUser,
      module: PermissionModule.PATIENT,
      action: PermissionAction.READ,
    });
    expect(revoked.decision).toBe(PermissionDecision.DENY);
  });
});
