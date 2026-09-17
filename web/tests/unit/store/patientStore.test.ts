/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * patientStore 测试：患者列表 / 当前患者 / 患者360
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePatientStore } from '@/store/patientStore';
import { createPatient, createPatient360 } from '@fixtures/factories';

beforeEach(() => {
  usePatientStore.setState({ patientList: [], currentPatient: null, patient360: null });
});

describe('patientStore 初始状态', () => {
  it('空列表、无当前患者', () => {
    const s = usePatientStore.getState();
    expect(s.patientList).toEqual([]);
    expect(s.currentPatient).toBeNull();
    expect(s.patient360).toBeNull();
  });
});

describe('patientStore 患者列表', () => {
  it('setPatientList 设置列表', () => {
    const patients = [createPatient({ id: 'p1' }), createPatient({ id: 'p2' })];
    usePatientStore.getState().setPatientList(patients);
    expect(usePatientStore.getState().patientList).toHaveLength(2);
  });

  it('selectPatient 设置当前患者', () => {
    const p = createPatient({ id: 'p-sel' });
    usePatientStore.getState().selectPatient(p);
    expect(usePatientStore.getState().currentPatient?.id).toBe('p-sel');
  });
});

describe('patientStore 患者360', () => {
  it('setPatient360 同时更新当前患者', () => {
    const p360 = createPatient360({ patient: createPatient({ id: 'p360-1', name: '李女士' }) });
    usePatientStore.getState().setPatient360(p360);
    const s = usePatientStore.getState();
    expect(s.patient360?.patient.name).toBe('李女士');
    expect(s.currentPatient?.name).toBe('李女士');
  });
});

describe('patientStore clearCurrent', () => {
  it('清空当前患者和360数据', () => {
    usePatientStore.getState().selectPatient(createPatient());
    usePatientStore.getState().setPatient360(createPatient360());
    usePatientStore.getState().clearCurrent();
    const s = usePatientStore.getState();
    expect(s.currentPatient).toBeNull();
    expect(s.patient360).toBeNull();
  });
});
