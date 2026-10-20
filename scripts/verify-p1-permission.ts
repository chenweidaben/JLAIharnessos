/**
 * v5.0试点扩展（P1权限码收敛）：分组码通配匹配验证脚本
 *
 * 运行：~\.bun\bin\bun.exe scripts/verify-p1-permission.ts
 *
 * 验证项：
 *  1. doctor_li（doctor 角色）permissions 含 report:clinical:read / report:quality:read；
 *     requirePermissionCode('emr:read') 经通配放行（200/null）。
 *  2. patient 角色 permissions 不含任何 report:* 分组码；
 *     requirePermissionCode('report:admin:read') 返回 403 Response。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// @ts-nocheck
import { ROLE_PERMISSIONS } from '../src/bff/view/userView';
import { requirePermissionCode } from '../src/bff/middleware/auth';

type MockCtx = { user: any; traceId: string };

function makeCtx(role: string): MockCtx {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return {
    traceId: 'verify-p1',
    user: {
      id: `u_${role}`,
      name: role,
      roles: [role],
      permissions: perms,
    },
  };
}

function statusOf(resp: any): number {
  if (!resp) return 200; // null = 通过
  if (typeof resp.status === 'number') return resp.status;
  return 200;
}

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}`);
  }
}

console.log('== v5.0试点扩展（P1权限码收敛）验证 ==');

// 1. 角色授予矩阵
console.log('\n[1] 角色 → 分组码授予矩阵');
const matrix: Record<string, string[]> = {
  doctor: ['report:clinical:read', 'report:quality:read'],
  nurse: ['report:clinical:read', 'report:quality:read'],
  pharmacist: ['report:clinical:read', 'report:quality:read'],
  technician: ['report:clinical:read', 'report:quality:read'],
  ams_officer: ['report:clinical:read', 'report:quality:read'],
  dept_head: ['report:clinical:read', 'report:quality:read'],
  finance: ['report:finance:read'],
  cashier: ['report:finance:read'],
  admin: ['report:clinical:read', 'report:admin:read', 'report:finance:read', 'report:quality:read'],
};
for (const [role, expected] of Object.entries(matrix)) {
  const have = ROLE_PERMISSIONS[role] ?? [];
  for (const code of expected) {
    check(`${role} 应持有 ${code}`, have.includes(code));
  }
}
// patient/researcher 不授任何 report:* 分组码
for (const role of ['patient', 'researcher']) {
  const have = ROLE_PERMISSIONS[role] ?? [];
  const reportGrants = have.filter((c: string) => c.startsWith('report:') && c.endsWith(':read'));
  check(`${role} 不应持有任何 report:*:read 分组码（实际: [${reportGrants.join(',')}]）`, reportGrants.length === 0);
}

// 2. doctor 通配放行 emr:read
console.log('\n[2] doctor_li 通配放行临床 V13 旧码');
const doctorCtx = makeCtx('doctor');
check('doctor permissions 含 report:clinical:read', doctorCtx.user.permissions.includes('report:clinical:read'));
const r1 = requirePermissionCode(doctorCtx, 'emr:read');
check("requirePermissionCode('emr:read') 对 doctor 放行", statusOf(r1) === 200);
const r2 = requirePermissionCode(doctorCtx, 'nursing-training:read');
check("requirePermissionCode('nursing-training:read') 对 doctor 放行（护理域）", statusOf(r2) === 200);
const r3 = requirePermissionCode(doctorCtx, 'drg-budget:read');
check("requirePermissionCode('drg-budget:read') 对 doctor 不放行（财务域，doctor 无 finance 分组码）", statusOf(r3) === 403);

// 3. patient 拒绝 report:admin:read
console.log('\n[3] patient 拒绝管理报表');
const patientCtx = makeCtx('patient');
check('patient permissions 不含 report:admin:read', !patientCtx.user.permissions.includes('report:admin:read'));
const r4 = requirePermissionCode(patientCtx, 'report:admin:read');
check("requirePermissionCode('report:admin:read') 对 patient 返回 403", statusOf(r4) === 403);
const r5 = requirePermissionCode(patientCtx, 'emr:read');
check("requirePermissionCode('emr:read') 对 patient 也返回 403", statusOf(r5) === 403);

// 4. finance 通配放行财务码
console.log('\n[4] finance 通配放行财务 V13 旧码');
const finCtx = makeCtx('finance');
const r6 = requirePermissionCode(finCtx, 'drg:read');
check("requirePermissionCode('drg:read') 对 finance 放行", statusOf(r6) === 200);
const r7 = requirePermissionCode(finCtx, 'insurance:read');
check("requirePermissionCode('insurance:read') 对 finance 放行", statusOf(r7) === 200);

console.log(`\n== 结果：${pass} passed, ${fail} failed ==`);
process.exit(fail > 0 ? 1 : 0);
