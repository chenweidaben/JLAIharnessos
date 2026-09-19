/**
 * 健澜科技数智医院智能体（jlmedaios） - PermissionConfigStore 单元测试
 *
 * 版权所有 (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, test } from 'bun:test';

import {
  DataScope,
  PermissionAction,
  PermissionModule,
  RoleCode,
} from '../../../src/security/types';
import { PERMISSION_MATRIX } from '../../../src/security/auth/PermissionMatrix';
import { PermissionConfigStore } from '../../../src/security/auth/PermissionConfigStore';

const ADMIN = {
  userId: 'admin-test',
  userName: '测试管理员',
  roles: [RoleCode.SYSTEM_ADMIN] as RoleCode[],
};

describe('PermissionConfigStore - 默认零回归', () => {
  test('空覆盖层时，每个生效条目与静态矩阵逐字段一致', () => {
    const store = new PermissionConfigStore();
    expect(store.getVersion()).toBe(0);
    expect(store.getOverlayCount()).toBe(0);

    for (const base of PERMISSION_MATRIX) {
      const eff = store.getEffectiveEntry(base.module, base.action);
      expect(eff).toBeDefined();
      // 空覆盖层应直接返回基线对象引用
      expect(eff).toBe(base);
      expect(eff!.module).toBe(base.module);
      expect(eff!.action).toBe(base.action);
      expect(eff!.allowedRoles).toEqual(base.allowedRoles);
      expect(eff!.defaultScope).toBe(base.defaultScope);
      expect(eff!.requireMfa).toBe(base.requireMfa);
      expect(eff!.riskLevel).toBe(base.riskLevel);
    }

    // listEffectiveMatrix 长度与顺序与静态矩阵一致
    const list = store.listEffectiveMatrix();
    expect(list.length).toBe(PERMISSION_MATRIX.length);
    for (let i = 0; i < PERMISSION_MATRIX.length; i++) {
      expect(list[i]).toBe(PERMISSION_MATRIX[i]);
    }
  });

  test('getOverlay 空时返回 undefined', () => {
    const store = new PermissionConfigStore();
    expect(store.getOverlay(PermissionModule.PATIENT, PermissionAction.READ)).toBeUndefined();
    expect(store.hasOverlay(PermissionModule.PATIENT, PermissionAction.READ)).toBe(false);
  });
});

describe('PermissionConfigStore - 覆盖生效', () => {
  test('updateEntry 覆盖 allowedRoles/defaultScope/riskLevel 并递增版本、落审计', () => {
    const store = new PermissionConfigStore();
    const before = store.getVersion();

    const after = store.updateEntry(
      PermissionModule.PATIENT,
      PermissionAction.READ,
      {
        allowedRoles: [RoleCode.NURSE],
        defaultScope: DataScope.DEPARTMENT,
        riskLevel: 'medium',
      },
      ADMIN,
    );

    expect(store.getVersion()).toBe(before + 1);
    expect(after.allowedRoles).toEqual([RoleCode.NURSE]);
    expect(after.defaultScope).toBe(DataScope.DEPARTMENT);
    expect(after.riskLevel).toBe('medium');
    // 未覆盖字段沿用基线（如 requireMfa 保持基线）
    const base = PERMISSION_MATRIX.find(
      (e) => e.module === PermissionModule.PATIENT && e.action === PermissionAction.READ,
    );
    expect(after.requireMfa).toBe(base?.requireMfa);

    const audit = store.getAuditLog();
    expect(audit.length).toBe(1);
    expect(audit[0].operatorId).toBe(ADMIN.userId);
    expect(audit[0].action).toBe('overlay');
  });

  test('多次变更版本单调递增', () => {
    const store = new PermissionConfigStore();
    const v0 = store.getVersion();
    store.updateEntry(PermissionModule.LAB, PermissionAction.READ, {}, ADMIN);
    store.grant(RoleCode.NURSE, PermissionModule.LAB, PermissionAction.READ, undefined, ADMIN);
    store.revoke(RoleCode.NURSE, PermissionModule.LAB, PermissionAction.READ, ADMIN);
    expect(store.getVersion()).toBe(v0 + 3);
    expect(store.getAuditLog().length).toBe(3);
  });
});

describe('PermissionConfigStore - 授权 / 撤销', () => {
  test('grant 把角色加入 allowedRoles 并记录数据范围', () => {
    const store = new PermissionConfigStore();
    // 基线：GUEST 无 LAB.READ
    const base = store.getEffectiveEntry(PermissionModule.LAB, PermissionAction.READ)!;
    expect(base.allowedRoles).not.toContain(RoleCode.GUEST);

    const after = store.grant(
      RoleCode.GUEST,
      PermissionModule.LAB,
      PermissionAction.READ,
      DataScope.SELF,
      ADMIN,
    );
    expect(after.allowedRoles).toContain(RoleCode.GUEST);
    expect(store.getRoleScope(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ)).toBe(
      DataScope.SELF,
    );
  });

  test('revoke 移除角色并清除其数据范围', () => {
    const store = new PermissionConfigStore();
    store.grant(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, DataScope.SELF, ADMIN);
    expect(store.getEffectiveEntry(PermissionModule.LAB, PermissionAction.READ)!.allowedRoles).toContain(
      RoleCode.GUEST,
    );

    const after = store.revoke(
      RoleCode.GUEST,
      PermissionModule.LAB,
      PermissionAction.READ,
      ADMIN,
    );
    expect(after.allowedRoles).not.toContain(RoleCode.GUEST);
    expect(
      store.getRoleScope(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ),
    ).toBeUndefined();
  });

  test('grant 幂等：重复授予不产生重复角色', () => {
    const store = new PermissionConfigStore();
    store.grant(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, undefined, ADMIN);
    const once = store.getEffectiveEntry(PermissionModule.LAB, PermissionAction.READ)!;
    store.grant(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, undefined, ADMIN);
    const twice = store.getEffectiveEntry(PermissionModule.LAB, PermissionAction.READ)!;
    expect(twice.allowedRoles.filter((r) => r === RoleCode.GUEST).length).toBe(1);
    expect(twice.allowedRoles.length).toBe(once.allowedRoles.length);
  });
});

describe('PermissionConfigStore - 数据范围收敛', () => {
  test('roleScopes 可按角色收敛到科室/病区维度', () => {
    const store = new PermissionConfigStore();
    store.updateEntry(
      PermissionModule.EMR,
      PermissionAction.READ,
      {
        roleScopes: {
          [RoleCode.VISITING_PHYSICIAN]: DataScope.DEPARTMENT,
        },
      },
      ADMIN,
    );
    const scopes = store.listRoleScopes(PermissionModule.EMR, PermissionAction.READ);
    expect(scopes[RoleCode.VISITING_PHYSICIAN]).toBe(DataScope.DEPARTMENT);
  });
});

describe('PermissionConfigStore - 重置', () => {
  test('reset 单条目恢复静态基线', () => {
    const store = new PermissionConfigStore();
    store.updateEntry(
      PermissionModule.PATIENT,
      PermissionAction.READ,
      { allowedRoles: [RoleCode.NURSE] },
      ADMIN,
    );
    expect(store.hasOverlay(PermissionModule.PATIENT, PermissionAction.READ)).toBe(true);

    store.reset(PermissionModule.PATIENT, PermissionAction.READ, ADMIN);
    expect(store.hasOverlay(PermissionModule.PATIENT, PermissionAction.READ)).toBe(false);
    const eff = store.getEffectiveEntry(PermissionModule.PATIENT, PermissionAction.READ)!;
    const base = PERMISSION_MATRIX.find(
      (e) => e.module === PermissionModule.PATIENT && e.action === PermissionAction.READ,
    );
    expect(eff.allowedRoles).toEqual(base!.allowedRoles);
  });

  test('resetAll 清空全部覆盖', () => {
    const store = new PermissionConfigStore();
    store.updateEntry(PermissionModule.PATIENT, PermissionAction.READ, {}, ADMIN);
    store.grant(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, undefined, ADMIN);
    expect(store.getOverlayCount()).toBeGreaterThan(0);

    store.resetAll(ADMIN);
    expect(store.getOverlayCount()).toBe(0);
    expect(store.hasOverlay(PermissionModule.PATIENT, PermissionAction.READ)).toBe(false);
  });
});

describe('PermissionConfigStore - 隔离性', () => {
  test('新实例互不影响（覆盖不会泄漏到默认基线）', () => {
    const s1 = new PermissionConfigStore();
    s1.grant(RoleCode.GUEST, PermissionModule.LAB, PermissionAction.READ, undefined, ADMIN);
    const s2 = new PermissionConfigStore();
    expect(s2.hasOverlay(PermissionModule.LAB, PermissionAction.READ)).toBe(false);
    expect(
      s2.getEffectiveEntry(PermissionModule.LAB, PermissionAction.READ)!.allowedRoles,
    ).not.toContain(RoleCode.GUEST);
  });
});
