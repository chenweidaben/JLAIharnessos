import { admit, getInpatientDetail } from '../src/bff/aggregators/inpatientAggregator.js';
import { getUserByUsername, getUserRoleLinks } from '../src/db/repositories/userRepo.js';
import { buildAuthView } from '../src/bff/view/userView.js';
import { getWardByCode } from '../src/db/repositories/wardRepo.js';
import { getVisitById } from '../src/db/repositories/visitRepo.js';
import { closeDbForTest } from '../src/db/pool.js';

const load = async (u: string) => {
  const us = await getUserByUsername(u);
  return buildAuthView(us!, await getUserRoleLinks(us!.id));
};
const admin = await load('admin');
const respDoctor = await load('doctor_lin');
console.log('respDoctor scope=', respDoctor.dataScope, 'dept=', respDoctor.deptName);
const cardio = (await getWardByCode('WARD-CARDIO-1'))!;
const item = await admit(admin, {
  newPatient: { nameMasked: '调试*x', gender: '未知' },
  wardId: cardio.id,
  diagnosis: '调试（虚构）',
  condition: 'stable',
  admissionType: 'elective',
  source: 'other',
});
console.log('admitted item visitId=', item.visitId, 'dept=', item.department);
const v = await getVisitById(item.visitId);
console.log('visit status=', v?.status, 'type=', v?.visitType, 'dept=', v?.department);
try {
  await getInpatientDetail(respDoctor, item.visitId);
  console.log('NO ERROR (unexpected)');
} catch (e: any) {
  console.log('ERROR status=', e.status, 'name=', e.name, 'msg=', e.message);
}
const { discharge } = await import('../src/bff/aggregators/inpatientAggregator.js');
await discharge(admin, { visitId: item.visitId });
await closeDbForTest();
