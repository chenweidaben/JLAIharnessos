/**
 * 健澜科技数智医院智能体 - 权限检查器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test } from 'bun:test';
import {
  PermissionChecker,
  RoleCode,
  PermissionModule,
  PermissionAction,
  DataScope,
  PermissionDecision,
  ROLE_DEFINITIONS,
  getRolePermissions,
  getUserPermissions,
  PERMISSION_MATRIX,
  SessionManager,
  SessionStatus,
  type UserContext,
  type ResourceContext,
} from '../../../src/security';

describe('RoleDefinitions', () => {
  test('12种角色均已定义', () => {
    expect(ROLE_DEFINITIONS.size).toBe(12);
  });

  test('系统管理员角色存在', () => {
    const role = ROLE_DEFINITIONS.get(RoleCode.SYSTEM_ADMIN);
    expect(role).toBeDefined();
    expect(role?.name).toBe('系统管理员');
  });

  test('患者角色存在', () => {
    const role = ROLE_DEFINITIONS.get(RoleCode.PATIENT);
    expect(role).toBeDefined();
    expect(role?.name).toBe('患者');
  });

  test('访客角色存在', () => {
    const role = ROLE_DEFINITIONS.get(RoleCode.GUEST);
    expect(role).toBeDefined();
    expect(role?.name).toBe('访客');
  });

  test('角色继承：主任医师继承主治医师权限', () => {
    const chiefPerms = getRolePermissions(RoleCode.CHIEF_PHYSICIAN);
    const attendingPerms = getRolePermissions(RoleCode.ATTENDING_PHYSICIAN);
    // 主任医师应包含主治医师的所有权限
    for (const p of attendingPerms) {
      expect(chiefPerms.has(p)).toBe(true);
    }
  });

  test('用户多角色合并权限', () => {
    const perms = getUserPermissions([RoleCode.NURSE, RoleCode.PHARMACIST]);
    expect(perms.size).toBeGreaterThan(0);
  });
});

describe('PermissionMatrix', () => {
  test('权限矩阵包含所有模块', () => {
    const modules = new Set(PERMISSION_MATRIX.map((e) => e.module));
    expect(modules.has(PermissionModule.PATIENT)).toBe(true);
    expect(modules.has(PermissionModule.EMR)).toBe(true);
    expect(modules.has(PermissionModule.ORDER)).toBe(true);
    expect(modules.has(PermissionModule.PRESCRIPTION)).toBe(true);
    expect(modules.has(PermissionModule.SYSTEM)).toBe(true);
  });

  test('处方创建需要MFA', () => {
    const entry = PERMISSION_MATRIX.find(
      (e) => e.module === PermissionModule.PRESCRIPTION && e.action === PermissionAction.CREATE,
    );
    expect(entry?.requireMfa).toBe(true);
  });

  test('系统管理删除为critical风险', () => {
    const entry = PERMISSION_MATRIX.find(
      (e) => e.module === PermissionModule.SYSTEM && e.action === PermissionAction.DELETE,
    );
    expect(entry?.riskLevel).toBe('critical');
  });
});

describe('PermissionChecker', () => {
  const checker = new PermissionChecker();

  const createUserContext = (roles: RoleCode[], department: string = '心内科'): UserContext => ({
    userId: 'test-user-001',
    userName: '测试用户',
    roles,
    department,
    groupId: 'group-001',
  });

  const createResourceContext = (
    module: PermissionModule,
    action: PermissionAction,
    department: string = '心内科',
  ): ResourceContext => ({
    module,
    action,
    department,
    groupId: 'group-001',
    ownerId: 'test-user-001',
  });

  test('主治医师可读取本科室患者信息', () => {
    const user = createUserContext([RoleCode.ATTENDING_PHYSICIAN]);
    const resource = createResourceContext(PermissionModule.PATIENT, PermissionAction.READ);
    const result = checker.check(user, resource);
    expect(result.decision).toBe(PermissionDecision.ALLOW);
  });

  test('住院医师可读取已分配患者', () => {
    const user = createUserContext([RoleCode.RESIDENT_PHYSICIAN]);
    const resource = createResourceContext(PermissionModule.PATIENT, PermissionAction.READ);
    const result = checker.check(user, resource);
    expect(result.decision).not.toBe(PermissionDecision.DENY);
  });

  test('患者只能读取本人信息', () => {
    const user = createUserContext([RoleCode.PATIENT]);
    const resource = createResourceContext(PermissionModule.PATIENT, PermissionAction.READ);
    resource.ownerId = 'test-user-001';
    const result = checker.check(user, resource);
    expect(result.decision).toBe(PermissionDecision.ALLOW);
  });

  test('访客无任何患者数据权限', () => {
    const user = createUserContext([RoleCode.GUEST]);
    const resource = createResourceContext(PermissionModule.PATIENT, PermissionAction.READ);
    const result = checker.check(user, resource);
    expect(result.decision).toBe(PermissionDecision.DENY);
  });

  test('药师无处方创建权限', () => {
    const user = createUserContext([RoleCode.PHARMACIST]);
    const resource = createResourceContext(PermissionModule.PRESCRIPTION, PermissionAction.CREATE);
    const result = checker.check(user, resource);
    expect(result.decision).toBe(PermissionDecision.DENY);
  });

  test('技师无诊疗处方权', () => {
    const user = createUserContext([RoleCode.TECHNICIAN]);
    const resource = createResourceContext(PermissionModule.ORDER, PermissionAction.CREATE);
    const result = checker.check(user, resource);
    expect(result.decision).toBe(PermissionDecision.DENY);
  });

  test('系统管理员有系统管理权限', () => {
    const user = createUserContext([RoleCode.SYSTEM_ADMIN]);
    const resource = createResourceContext(PermissionModule.SYSTEM, PermissionAction.READ);
    const result = checker.check(user, resource);
    expect(result.decision).toBe(PermissionDecision.ALLOW);
  });

  test('护士可执行医嘱操作', () => {
    const user = createUserContext([RoleCode.NURSE]);
    const resource = createResourceContext(PermissionModule.ORDER, PermissionAction.UPDATE);
    const result = checker.check(user, resource);
    expect(result.decision).not.toBe(PermissionDecision.DENY);
  });

  test('权限缓存：相同角色查询使用缓存', () => {
    const user = createUserContext([RoleCode.ATTENDING_PHYSICIAN]);
    const perms1 = checker.getUserPermissions(user);
    const perms2 = checker.getUserPermissions(user);
    expect(perms1).toBe(perms2); // 同一缓存对象
  });

  test('清除权限缓存', () => {
    const user = createUserContext([RoleCode.ATTENDING_PHYSICIAN]);
    checker.getUserPermissions(user);
    checker.invalidateUserCache(user);
    const perms = checker.getUserPermissions(user);
    expect(perms).toBeDefined();
  });

  test('hasModuleAction检查', () => {
    const user = createUserContext([RoleCode.ATTENDING_PHYSICIAN]);
    expect(checker.hasModuleAction(user, PermissionModule.PATIENT, PermissionAction.READ)).toBe(true);
    expect(checker.hasModuleAction(user, PermissionModule.SYSTEM, PermissionAction.DELETE)).toBe(false);
  });

  test('权限拒绝审计记录', () => {
    const checkerWithAudit = new PermissionChecker({ enableDenyAudit: true });
    const user = createUserContext([RoleCode.GUEST]);
    const resource = createResourceContext(PermissionModule.PATIENT, PermissionAction.READ);
    checkerWithAudit.check(user, resource);
    const records = checkerWithAudit.getDenyRecords();
    expect(records.length).toBeGreaterThan(0);
  });
});

describe('SessionManager', () => {
  test('创建会话', () => {
    const manager = new SessionManager();
    const session = manager.createSession({
      userId: 'user-001',
      userName: '测试用户',
      roles: [RoleCode.ATTENDING_PHYSICIAN],
      department: '心内科',
      clientIp: '10.0.0.1',
    });
    expect(session.sessionId).toBeDefined();
    expect(session.status).toBe(SessionStatus.ACTIVE);
    expect(session.userId).toBe('user-001');
  });

  test('验证有效会话', () => {
    const manager = new SessionManager();
    const session = manager.createSession({
      userId: 'user-001',
      userName: '测试用户',
      roles: [RoleCode.ATTENDING_PHYSICIAN],
      department: '心内科',
      clientIp: '10.0.0.1',
    });
    expect(manager.validateSession(session.sessionId)).toBe(true);
  });

  test('验证不存在的会话', () => {
    const manager = new SessionManager();
    expect(manager.validateSession('nonexistent')).toBe(false);
  });

  test('撤销会话', () => {
    const manager = new SessionManager();
    const session = manager.createSession({
      userId: 'user-001',
      userName: '测试用户',
      roles: [RoleCode.ATTENDING_PHYSICIAN],
      department: '心内科',
      clientIp: '10.0.0.1',
    });
    expect(manager.revokeSession(session.sessionId, '测试撤销')).toBe(true);
    expect(manager.validateSession(session.sessionId)).toBe(false);
  });

  test('并发会话控制：超过最大会话数淘汰最旧', () => {
    const manager = new SessionManager({ maxConcurrentSessions: 2 });
    const s1 = manager.createSession({
      userId: 'user-001', userName: '用户1', roles: [RoleCode.NURSE],
      department: '心内科', clientIp: '10.0.0.1',
    });
    const s2 = manager.createSession({
      userId: 'user-001', userName: '用户1', roles: [RoleCode.NURSE],
      department: '心内科', clientIp: '10.0.0.2',
    });
    const s3 = manager.createSession({
      userId: 'user-001', userName: '用户1', roles: [RoleCode.NURSE],
      department: '心内科', clientIp: '10.0.0.3',
    });
    // s1应该被淘汰
    expect(manager.validateSession(s1.sessionId)).toBe(false);
    expect(manager.validateSession(s2.sessionId)).toBe(true);
    expect(manager.validateSession(s3.sessionId)).toBe(true);
  });

  test('获取用户活跃会话数', () => {
    const manager = new SessionManager();
    manager.createSession({
      userId: 'user-001', userName: '用户1', roles: [RoleCode.NURSE],
      department: '心内科', clientIp: '10.0.0.1',
    });
    manager.createSession({
      userId: 'user-001', userName: '用户1', roles: [RoleCode.NURSE],
      department: '心内科', clientIp: '10.0.0.2',
    });
    expect(manager.getActiveSessionCount('user-001')).toBe(2);
  });

  test('锁定和解锁会话', () => {
    const manager = new SessionManager();
    const session = manager.createSession({
      userId: 'user-001', userName: '用户1', roles: [RoleCode.NURSE],
      department: '心内科', clientIp: '10.0.0.1',
    });
    expect(manager.lockSession(session.sessionId)).toBe(true);
    expect(manager.validateSession(session.sessionId)).toBe(false);
    expect(manager.unlockSession(session.sessionId)).toBe(true);
    expect(manager.validateSession(session.sessionId)).toBe(true);
  });

  test('会话配置', () => {
    const manager = new SessionManager({
      idleTimeoutMinutes: 15,
      absoluteTimeoutHours: 8,
      maxConcurrentSessions: 5,
    });
    const config = manager.getConfig();
    expect(config.idleTimeoutMinutes).toBe(15);
    expect(config.absoluteTimeoutHours).toBe(8);
    expect(config.maxConcurrentSessions).toBe(5);
  });
});
