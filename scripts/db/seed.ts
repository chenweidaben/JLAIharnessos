/**
 * 健澜科技数智医院智能体 - 数据库种子数据脚本
 *
 * 向 PostgreSQL 写入演示用患者/就诊/医嘱/处方/检验/药品/用户数据。
 * 仅用于开发/演示环境，生产环境严禁执行。
 *
 * 用法：bun run scripts/db/seed.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, verifyDbConnection, withTx } from '../../src/db/pool.js';
import { autoMigrate } from '../../src/db/migrate.js';

async function seed(): Promise<void> {
  console.log('[seed] 开始数据库初始化...');
  await verifyDbConnection(3, 2000);
  await autoMigrate();

  const sql = getDb();

  await withTx(async (tx) => {
    // 1. 演示用户（医生/护士/药师/管理员）
    console.log('[seed] 写入演示用户...');
    const users = [
      { username: 'dr_zhang', name: '张医生', role: 'doctor', department: '心血管内科', title: '主任医师' },
      { username: 'dr_li', name: '李医生', role: 'doctor', department: '呼吸内科', title: '副主任医师' },
      { username: 'nurse_wang', name: '王护士', role: 'nurse', department: '心血管内科', title: '主管护师' },
      { username: 'pharmacist_chen', name: '陈药师', role: 'pharmacist', department: '药剂科', title: '主管药师' },
      { username: 'admin', name: '系统管理员', role: 'admin', department: '信息科', title: '工程师' },
    ];
    for (const u of users) {
      await tx`
        INSERT INTO iam.users (username, name, role, department, title, status)
        VALUES (${u.username}, ${u.name}, ${u.role}, ${u.department}, ${u.title}, 'active')
        ON CONFLICT (username) DO NOTHING
      `;
    }

    // 2. 演示患者
    console.log('[seed] 写入演示患者...');
    const patients = [
      {
        mrn: 'MR000001', nameMasked: '张*国', gender: '男', birthDate: '1968-03-15',
        bloodType: 'A型', allergies: [{ allergen: '青霉素', reaction: '皮疹', severity: '中度' }],
        pastHistory: [{ disease: '高血压', diagnosedAt: '2015-06-01', status: '未愈' }],
        tags: ['高血压', '冠心病'],
      },
      {
        mrn: 'MR000002', nameMasked: '李*华', gender: '女', birthDate: '1972-08-22',
        bloodType: 'O型', allergies: [], pastHistory: [{ disease: '糖尿病', diagnosedAt: '2018-03-10', status: '未愈' }],
        tags: ['糖尿病'],
      },
      {
        mrn: 'MR000003', nameMasked: '王*强', gender: '男', birthDate: '1985-11-05',
        bloodType: 'B型', allergies: [{ allergen: '磺胺类', reaction: '休克', severity: '危及生命' }],
        pastHistory: [], tags: [],
      },
    ];
    const patientIds: string[] = [];
    for (const p of patients) {
      const rows = await tx`
        INSERT INTO clinical.patients (mrn, name_masked, gender, birth_date, blood_type, allergies, past_history, tags)
        VALUES (${p.mrn}, ${p.nameMasked}, ${p.gender}, ${p.birthDate}, ${p.bloodType},
          ${tx.json(p.allergies)}, ${tx.json(p.pastHistory)}, ${tx.json(p.tags)})
        ON CONFLICT (mrn) DO UPDATE SET mrn = EXCLUDED.mrn
        RETURNING id
      `;
      patientIds.push(String(rows[0]?.id));
    }

    // 3. 演示就诊
    console.log('[seed] 写入演示就诊...');
    const visitIds: string[] = [];
    const visitData = [
      { patientIdx: 0, type: 'outpatient' as const, dept: '心血管内科', complaint: '反复胸闷气短1周，加重1天' },
      { patientIdx: 1, type: 'outpatient' as const, dept: '内分泌科', complaint: '血糖控制不佳，乏力多饮' },
      { patientIdx: 0, type: 'inpatient' as const, dept: '心血管内科', complaint: '冠心病待查，拟行冠脉造影' },
    ];
    for (const v of visitData) {
      const visitNo = `OP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const rows = await tx`
        INSERT INTO clinical.visits (patient_id, visit_no, visit_type, department, chief_complaint, status, admit_at)
        VALUES (${patientIds[v.patientIdx]}, ${visitNo}, ${v.type}, ${v.dept}, ${v.complaint}, 'ongoing', now())
        RETURNING id
      `;
      visitIds.push(String(rows[0]?.id));
    }

    // 4. 演示医嘱
    console.log('[seed] 写入演示医嘱...');
    const orders = [
      { visitIdx: 0, type: 'drug' as const, content: '阿司匹林肠溶片 100mg 口服 qd', detail: { drug: '阿司匹林肠溶片', dosage: '100mg', frequency: 'qd' } },
      { visitIdx: 0, type: 'lab' as const, content: '血常规+CRP', detail: { panel: '血常规' } },
      { visitIdx: 0, type: 'lab' as const, content: '心肌酶谱+肌钙蛋白', detail: { panel: '心肌损伤标志物' } },
      { visitIdx: 1, type: 'drug' as const, content: '二甲双胍片 0.5g 口服 tid', detail: { drug: '盐酸二甲双胍', dosage: '0.5g', frequency: 'tid' } },
      { visitIdx: 2, type: 'imaging' as const, content: '冠脉CTA', detail: { modality: 'CT', bodyPart: '心脏' } },
    ];
    for (const o of orders) {
      const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await tx`
        INSERT INTO clinical.orders (visit_id, order_no, order_type, content, detail, priority, status, start_at)
        VALUES (${visitIds[o.visitIdx]}, ${orderNo}, ${o.type}, ${o.content}, ${tx.json(o.detail)}, 'routine', 'active', now())
      `;
    }

    // 5. 演示检验结果
    console.log('[seed] 写入演示检验结果...');
    const labResults = [
      { visitIdx: 0, patientIdx: 0, panel: '血常规', item: '白细胞计数', code: 'WBC', value: '8.5', numeric: 8.5, unit: '10^9/L', low: 3.5, high: 9.5, flag: 'N' },
      { visitIdx: 0, patientIdx: 0, panel: '血常规', item: '血红蛋白', code: 'HGB', value: '132', numeric: 132, unit: 'g/L', low: 110, high: 160, flag: 'N' },
      { visitIdx: 0, patientIdx: 0, panel: '心肌损伤标志物', item: '肌钙蛋白I', code: 'cTnI', value: '0.08', numeric: 0.08, unit: 'ng/mL', low: 0, high: 0.04, flag: 'H', critical: true },
      { visitIdx: 1, patientIdx: 1, panel: '血糖', item: '空腹血糖', code: 'GLU', value: '9.2', numeric: 9.2, unit: 'mmol/L', low: 3.9, high: 6.1, flag: 'H' },
      { visitIdx: 1, patientIdx: 1, panel: '糖化血红蛋白', item: 'HbA1c', code: 'HbA1c', value: '8.5', numeric: 8.5, unit: '%', low: 4, high: 6, flag: 'H' },
    ];
    for (const l of labResults) {
      await tx`
        INSERT INTO clinical.lab_results (visit_id, patient_id, panel_name, item_name, item_code, value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time)
        VALUES (${visitIds[l.visitIdx]}, ${patientIds[l.patientIdx]}, ${l.panel}, ${l.item}, ${l.code},
          ${l.value}, ${l.numeric}, ${l.unit}, ${l.low}, ${l.high}, ${l.flag}, ${l.critical ?? false}, now())
      `;
    }

    // 6. 演示药品目录
    console.log('[seed] 写入演示药品目录...');
    const drugs = [
      { code: 'DRG001', generic: '阿司匹林肠溶片', spec: '100mg*30片', form: '片剂', unit: '盒', price: 15.80, category: '处方药' },
      { code: 'DRG002', generic: '盐酸二甲双胍片', spec: '0.5g*20片', form: '片剂', unit: '盒', price: 8.50, category: '处方药' },
      { code: 'DRG003', generic: '阿托伐他汀钙片', spec: '20mg*7片', form: '片剂', unit: '盒', price: 32.00, category: '处方药' },
      { code: 'DRG004', generic: '氯吡格雷片', spec: '75mg*7片', form: '片剂', unit: '盒', price: 45.00, category: '处方药' },
      { code: 'DRG005', generic: '硝苯地平控释片', spec: '30mg*7片', form: '片剂', unit: '盒', price: 28.00, category: '处方药' },
    ];
    for (const d of drugs) {
      await tx`
        INSERT INTO clinical.drug_catalog (drug_code, generic_name, specification, dosage_form, unit, price, category, status)
        VALUES (${d.code}, ${d.generic}, ${d.spec}, ${d.form}, ${d.unit}, ${d.price}, ${d.category}, 'active')
        ON CONFLICT (drug_code) DO NOTHING
      `;
    }

    // 7. 演示处方
    console.log('[seed] 写入演示处方...');
    const rxNo = `RX${Date.now()}001`;
    const rxRows = await tx`
      INSERT INTO clinical.prescriptions (visit_id, rx_no, status, counsel)
      VALUES (${visitIds[0]}, ${rxNo}, 'pending_review', '注意观察出血倾向，定期复查凝血功能')
      RETURNING id
    `;
    const rxId = String(rxRows[0]?.id);
    const rxItems = [
      { drug: '阿司匹林肠溶片', dosage: 100, unit: 'mg', freq: 'qd', route: '口服', days: 30, qty: 30 },
      { drug: '阿托伐他汀钙片', dosage: 20, unit: 'mg', freq: 'qn', route: '口服', days: 30, qty: 30 },
    ];
    for (const item of rxItems) {
      await tx`
        INSERT INTO clinical.prescription_items (prescription_id, drug_name, dosage, dosage_unit, frequency, route, days_supply, quantity, quantity_unit)
        VALUES (${rxId}, ${item.drug}, ${item.dosage}, ${item.unit}, ${item.freq}, ${item.route}, ${item.days}, ${item.qty}, '片')
      `;
    }

    console.log('[seed] 种子数据写入完成！');
    console.log(`  - 用户: ${users.length}`);
    console.log(`  - 患者: ${patients.length}`);
    console.log(`  - 就诊: ${visitData.length}`);
    console.log(`  - 医嘱: ${orders.length}`);
    console.log(`  - 检验结果: ${labResults.length}`);
    console.log(`  - 药品: ${drugs.length}`);
    console.log(`  - 处方: 1 (含 ${rxItems.length} 条明细)`);
  });
}

void seed().catch((err) => {
  console.error('[seed] 失败:', err);
  process.exit(1);
});
