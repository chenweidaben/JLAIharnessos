/**
 * 健澜科技 jlmedaios - M322 FHIR 网关资源域
 *
 * FHIR Patient / Observation / Condition / MedicationRequest / Encounter / DiagnosticReport
 * DEMO_MODE 下返回 mock 数据（符合 FHIR R4 资源结构）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/fhir/patient - FHIR Patient 5 条 */
async function handleFhirPatient(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Patient', id: 'P-001', name: [{ family: '王', given: ['***'] }], gender: 'male', birthDate: '1961-03-15', active: true },
    { resourceType: 'Patient', id: 'P-002', name: [{ family: '李', given: ['***'] }], gender: 'female', birthDate: '1968-07-22', active: true },
    { resourceType: 'Patient', id: 'P-003', name: [{ family: '张', given: ['***'] }], gender: 'male', birthDate: '1954-11-08', active: true },
    { resourceType: 'Patient', id: 'P-004', name: [{ family: '赵', given: ['***'] }], gender: 'female', birthDate: '1981-05-30', active: true },
    { resourceType: 'Patient', id: 'P-005', name: [{ family: '孙', given: ['***'] }], gender: 'male', birthDate: '1958-09-12', active: true },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/observation - FHIR Observation 5 条 */
async function handleFhirObservation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Observation', id: 'O-001', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '2951-2', display: 'Sodium [Mass/volume] in Serum or Plasma' }] }, valueQuantity: { value: 138, unit: 'mmol/L', system: 'http://unitsofmeasure.org', code: 'mmol/L' }, effectiveDateTime: '2026-10-20T08:15:00+08:00' },
    { resourceType: 'Observation', id: 'O-002', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '2823-3', display: 'Potassium [Mass/volume] in Serum or Plasma' }] }, valueQuantity: { value: 6.8, unit: 'mmol/L', system: 'http://unitsofmeasure.org', code: 'mmol/L' }, effectiveDateTime: '2026-10-20T08:15:00+08:00' },
    { resourceType: 'Observation', id: 'O-003', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' }] }, valueQuantity: { value: 55, unit: 'g/L', system: 'http://unitsofmeasure.org', code: 'g/L' }, effectiveDateTime: '2026-10-19T10:30:00+08:00' },
    { resourceType: 'Observation', id: 'O-004', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' }] }, valueQuantity: { value: 8.5, unit: '%', system: 'http://unitsofmeasure.org', code: '%' }, effectiveDateTime: '2026-10-18T14:20:00+08:00' },
    { resourceType: 'Observation', id: 'O-005', status: 'preliminary', code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] }, valueQuantity: { value: 102, unit: 'beats/minute', system: 'http://unitsofmeasure.org', code: '/min' }, effectiveDateTime: '2026-10-20T11:00:00+08:00' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/condition - FHIR Condition 5 条 */
async function handleFhirCondition(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Condition', id: 'C-001', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '22298006', display: 'Myocardial infarction' }] }, severity: { coding: [{ system: 'http://snomed.info/sct', code: '24484000', display: 'Severe' }] }, onsetDateTime: '2026-10-20T08:00:00+08:00' },
    { resourceType: 'Condition', id: 'C-002', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '233604007', display: 'Pneumonia' }] }, severity: { coding: [{ system: 'http://snomed.info/sct', code: '6736007', display: 'Moderate' }] }, onsetDateTime: '2026-10-19T10:00:00+08:00' },
    { resourceType: 'Condition', id: 'C-003', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '73211009', display: 'Diabetes mellitus type 2' }] }, severity: { coding: [{ system: 'http://snomed.info/sct', code: '6736007', display: 'Moderate' }] }, onsetDateTime: '2026-10-18T14:00:00+08:00' },
    { resourceType: 'Condition', id: 'C-004', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '61460007', display: 'Acute cholecystitis' }] }, severity: { coding: [{ system: 'http://snomed.info/sct', code: '24484000', display: 'Severe' }] }, onsetDateTime: '2026-10-18T09:00:00+08:00' },
    { resourceType: 'Condition', id: 'C-005', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '422504002', display: 'Ischemic stroke' }] }, severity: { coding: [{ system: 'http://snomed.info/sct', code: '24484000', display: 'Severe' }] }, onsetDateTime: '2026-10-17T08:30:00+08:00' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/medicationrequest - FHIR MedicationRequest 5 条 */
async function handleFhirMedicationRequest(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'MedicationRequest', id: 'MR-001', status: 'active', medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '243670', display: 'Aspirin 100 MG Oral Tablet' }] }, intent: 'order', authoredOn: '2026-10-20T08:30:00+08:00' },
    { resourceType: 'MedicationRequest', id: 'MR-002', status: 'active', medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '123456', display: 'Ticagrelor 90 MG Oral Tablet' }] }, intent: 'order', authoredOn: '2026-10-20T08:30:00+08:00' },
    { resourceType: 'MedicationRequest', id: 'MR-003', status: 'active', medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '864540', display: 'Cefuroxime 1500 MG Injection' }] }, intent: 'order', authoredOn: '2026-10-19T10:30:00+08:00' },
    { resourceType: 'MedicationRequest', id: 'MR-004', status: 'active', medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '312861', display: 'Metformin 500 MG Oral Tablet' }] }, intent: 'order', authoredOn: '2026-10-18T14:30:00+08:00' },
    { resourceType: 'MedicationRequest', id: 'MR-005', status: 'active', medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '617310', display: 'Atorvastatin 20 MG Oral Tablet' }] }, intent: 'order', authoredOn: '2026-10-17T09:00:00+08:00' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/encounter - FHIR Encounter 5 条 */
async function handleFhirEncounter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Encounter', id: 'E-001', status: 'in-progress', class: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-class', code: 'IMP' }] }, period: { start: '2026-10-20T08:00:00+08:00' }, serviceProvider: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Encounter', id: 'E-002', status: 'finished', class: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-class', code: 'AMB' }] }, period: { start: '2026-10-19T10:00:00+08:00', end: '2026-10-19T10:30:00+08:00' }, serviceProvider: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Encounter', id: 'E-003', status: 'finished', class: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-class', code: 'AMB' }] }, period: { start: '2026-10-18T14:00:00+08:00', end: '2026-10-18T14:45:00+08:00' }, serviceProvider: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Encounter', id: 'E-004', status: 'in-progress', class: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-class', code: 'IMP' }] }, period: { start: '2026-10-18T09:00:00+08:00' }, serviceProvider: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Encounter', id: 'E-005', status: 'in-progress', class: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/encounter-class', code: 'IMP' }] }, period: { start: '2026-10-17T08:30:00+08:00' }, serviceProvider: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/diagnosticreport - FHIR DiagnosticReport 5 条 */
async function handleFhirDiagnosticReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'DiagnosticReport', id: 'DR-001', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '24323-8', display: 'Basic metabolic 2000 panel - Serum or Plasma' }] }, effectiveDateTime: '2026-10-20T08:15:00+08:00', result: [{ reference: 'Observation/O-001' }, { reference: 'Observation/O-002' }] },
    { resourceType: 'DiagnosticReport', id: 'DR-002', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '58410-2', display: 'CBC panel - Blood by Automated count' }] }, effectiveDateTime: '2026-10-19T10:30:00+08:00', result: [{ reference: 'Observation/O-003' }] },
    { resourceType: 'DiagnosticReport', id: 'DR-003', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' }] }, effectiveDateTime: '2026-10-18T14:20:00+08:00', result: [{ reference: 'Observation/O-004' }] },
    { resourceType: 'DiagnosticReport', id: 'DR-004', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '30745-4', display: 'Chest X-ray' }] }, effectiveDateTime: '2026-10-19T11:00:00+08:00', result: [{ reference: 'Observation/O-005' }] },
    { resourceType: 'DiagnosticReport', id: 'DR-005', status: 'final', code: { coding: [{ system: 'http://loinc.org', code: '30795-9', display: 'CT Head' }] }, effectiveDateTime: '2026-10-17T09:00:00+08:00', result: [{ reference: 'Observation/O-005' }] },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/practitioner - FHIR Practitioner 5 条 */
async function handleFhirPractitioner(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Practitioner', id: 'PR-001', name: [{ family: '李', given: ['***'] }], gender: 'male', qualification: [{ code: { coding: [{ system: 'http://loinc.org', code: '30934-5', display: 'MD' }] } }], organization: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Practitioner', id: 'PR-002', name: [{ family: '王', given: ['***'] }], gender: 'female', qualification: [{ code: { coding: [{ system: 'http://loinc.org', code: '30934-5', display: 'MD' }] } }], organization: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Practitioner', id: 'PR-003', name: [{ family: '张', given: ['***'] }], gender: 'male', qualification: [{ code: { coding: [{ system: 'http://loinc.org', code: '30934-5', display: 'MD' }] } }], organization: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Practitioner', id: 'PR-004', name: [{ family: '郑', given: ['***'] }], gender: 'male', qualification: [{ code: { coding: [{ system: 'http://loinc.org', code: '30934-5', display: 'MD' }] } }], organization: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
    { resourceType: 'Practitioner', id: 'PR-005', name: [{ family: '刘', given: ['***'] }], gender: 'female', qualification: [{ code: { coding: [{ system: 'http://loinc.org', code: '30934-5', display: 'MD' }] } }], organization: { reference: 'Organization/hospital', display: '健澜科技附属医院' } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/organization - FHIR Organization 5 条 */
async function handleFhirOrganization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Organization', id: 'ORG-001', name: '健澜科技附属医院', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'prov' }] }, address: [{ line: ['杭州市余杭区文一西路 100 号'], city: '杭州', country: 'CN' }], active: true },
    { resourceType: 'Organization', id: 'ORG-002', name: '心内科', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'dept' }] }, address: [{ line: ['住院部 3 楼'], city: '杭州', country: 'CN' }], active: true },
    { resourceType: 'Organization', id: 'ORG-003', name: '普外科', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'dept' }] }, address: [{ line: ['住院部 5 楼'], city: '杭州', country: 'CN' }], active: true },
    { resourceType: 'Organization', id: 'ORG-004', name: '呼吸内科', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'dept' }] }, address: [{ line: ['住院部 4 楼'], city: '杭州', country: 'CN' }], active: true },
    { resourceType: 'Organization', id: 'ORG-005', name: '神经内科', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'dept' }] }, address: [{ line: ['住院部 6 楼'], city: '杭州', country: 'CN' }], active: true },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/location - FHIR Location 5 条 */
async function handleFhirLocation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Location', id: 'LOC-001', name: '心内科 3 床', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro' }] }, address: [{ line: ['住院部 3 楼心内科病区'], city: '杭州', country: 'CN' }], position: { longitude: 120.0, latitude: 30.2 } },
    { resourceType: 'Location', id: 'LOC-002', name: '心内科 5 床', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro' }] }, address: [{ line: ['住院部 3 楼心内科病区'], city: '杭州', country: 'CN' }], position: { longitude: 120.0, latitude: 30.2 } },
    { resourceType: 'Location', id: 'LOC-003', name: '急诊抢救室 1 号', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro' }] }, address: [{ line: ['急诊 1 楼抢救区'], city: '杭州', country: 'CN' }], position: { longitude: 120.0, latitude: 30.2 } },
    { resourceType: 'Location', id: 'LOC-004', name: '手术室 3 号间', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro' }] }, address: [{ line: ['住院部 8 楼手术区'], city: '杭州', country: 'CN' }], position: { longitude: 120.0, latitude: 30.2 } },
    { resourceType: 'Location', id: 'LOC-005', name: '门诊内科诊室 3', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: 'ro' }] }, address: [{ line: ['门诊 2 楼内科区'], city: '杭州', country: 'CN' }], position: { longitude: 120.0, latitude: 30.2 } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/medication - FHIR Medication 5 条 */
async function handleFhirMedication(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Medication', id: 'MED-001', code: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '243670', display: 'Aspirin 100 MG Oral Tablet' }] }, form: { coding: [{ system: 'http://snomed.info/sct', code: '385055001', display: 'Tablet' }] }, ingredient: [{ itemCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '243670', display: 'Aspirin' }] } }], status: 'active' },
    { resourceType: 'Medication', id: 'MED-002', code: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '123456', display: 'Ticagrelor 90 MG Oral Tablet' }] }, form: { coding: [{ system: 'http://snomed.info/sct', code: '385055001', display: 'Tablet' }] }, ingredient: [{ itemCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '123456', display: 'Ticagrelor' }] } }], status: 'active' },
    { resourceType: 'Medication', id: 'MED-003', code: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '864540', display: 'Cefuroxime 1500 MG Injection' }] }, form: { coding: [{ system: 'http://snomed.info/sct', code: '385058005', display: 'Injection' }] }, ingredient: [{ itemCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '864540', display: 'Cefuroxime' }] } }], status: 'active' },
    { resourceType: 'Medication', id: 'MED-004', code: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '312861', display: 'Metformin 500 MG Oral Tablet' }] }, form: { coding: [{ system: 'http://snomed.info/sct', code: '385055001', display: 'Tablet' }] }, ingredient: [{ itemCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '312861', display: 'Metformin' }] } }], status: 'active' },
    { resourceType: 'Medication', id: 'MED-005', code: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '617310', display: 'Atorvastatin 20 MG Oral Tablet' }] }, form: { coding: [{ system: 'http://snomed.info/sct', code: '385055001', display: 'Tablet' }] }, ingredient: [{ itemCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '617310', display: 'Atorvastatin' }] } }], status: 'active' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/procedure - FHIR Procedure 5 条 */
async function handleFhirProcedure(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Procedure', id: 'PROC-001', status: 'completed', code: { coding: [{ system: 'http://snomed.info/sct', code: '3452004', display: 'Percutaneous coronary intervention' }] }, subject: { reference: 'Patient/P-001' }, performedDateTime: '2026-10-20T09:00:00+08:00' },
    { resourceType: 'Procedure', id: 'PROC-002', status: 'completed', code: { coding: [{ system: 'http://snomed.info/sct', code: '387713003', display: 'Laparoscopic cholecystectomy' }] }, subject: { reference: 'Patient/P-004' }, performedDateTime: '2026-10-19T08:00:00+08:00' },
    { resourceType: 'Procedure', id: 'PROC-003', status: 'completed', code: { coding: [{ system: 'http://snomed.info/sct', code: '172191005', display: 'Intravenous thrombolysis' }] }, subject: { reference: 'Patient/P-005' }, performedDateTime: '2026-10-17T09:00:00+08:00' },
    { resourceType: 'Procedure', id: 'PROC-004', status: 'completed', code: { coding: [{ system: 'http://snomed.info/sct', code: '418269005', display: 'Chest X-ray' }] }, subject: { reference: 'Patient/P-002' }, performedDateTime: '2026-10-19T11:00:00+08:00' },
    { resourceType: 'Procedure', id: 'PROC-005', status: 'completed', code: { coding: [{ system: 'http://snomed.info/sct', code: '30746006', display: 'CT Head' }] }, subject: { reference: 'Patient/P-005' }, performedDateTime: '2026-10-17T08:45:00+08:00' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/allergyintolerance - FHIR AllergyIntolerance 5 条 */
async function handleFhirAllergyIntolerance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'AllergyIntolerance', id: 'AI-001', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '301263005', display: 'Penicillin' }] }, patient: { reference: 'Patient/P-002' }, onset: '2020-06-15' },
    { resourceType: 'AllergyIntolerance', id: 'AI-002', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '302213003', display: 'Shellfish' }] }, patient: { reference: 'Patient/P-004' }, onset: '2018-03-22' },
    { resourceType: 'AllergyIntolerance', id: 'AI-003', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '301306001', display: 'Aspirin' }] }, patient: { reference: 'Patient/P-003' }, onset: '2019-11-08' },
    { resourceType: 'AllergyIntolerance', id: 'AI-004', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '302139003', display: 'Peanuts' }] }, patient: { reference: 'Patient/P-005' }, onset: '2015-07-14' },
    { resourceType: 'AllergyIntolerance', id: 'AI-005', clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] }, code: { coding: [{ system: 'http://snomed.info/sct', code: '301263005', display: 'Penicillin' }] }, patient: { reference: 'Patient/P-001' }, onset: '2021-09-30' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/coverage - FHIR Coverage 5 条 */
async function handleFhirCoverage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Coverage', id: 'COV-001', status: 'active', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-type', code: 'insurance' }] }, subscriber: { reference: 'Patient/P-001' }, beneficiary: { reference: 'Patient/P-001' } },
    { resourceType: 'Coverage', id: 'COV-002', status: 'active', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-type', code: 'insurance' }] }, subscriber: { reference: 'Patient/P-002' }, beneficiary: { reference: 'Patient/P-002' } },
    { resourceType: 'Coverage', id: 'COV-003', status: 'active', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-type', code: 'insurance' }] }, subscriber: { reference: 'Patient/P-003' }, beneficiary: { reference: 'Patient/P-003' } },
    { resourceType: 'Coverage', id: 'COV-004', status: 'active', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-type', code: 'insurance' }] }, subscriber: { reference: 'Patient/P-004' }, beneficiary: { reference: 'Patient/P-004' } },
    { resourceType: 'Coverage', id: 'COV-005', status: 'active', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/coverage-type', code: 'insurance' }] }, subscriber: { reference: 'Patient/P-005' }, beneficiary: { reference: 'Patient/P-005' } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/claim - FHIR Claim 5 条 */
async function handleFhirClaim(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Claim', id: 'CLM-001', status: 'active', use: 'claim', patient: { reference: 'Patient/P-001' }, created: '2026-10-20' },
    { resourceType: 'Claim', id: 'CLM-002', status: 'active', use: 'claim', patient: { reference: 'Patient/P-002' }, created: '2026-10-19' },
    { resourceType: 'Claim', id: 'CLM-003', status: 'active', use: 'claim', patient: { reference: 'Patient/P-003' }, created: '2026-10-18' },
    { resourceType: 'Claim', id: 'CLM-004', status: 'active', use: 'claim', patient: { reference: 'Patient/P-004' }, created: '2026-10-18' },
    { resourceType: 'Claim', id: 'CLM-005', status: 'active', use: 'claim', patient: { reference: 'Patient/P-005' }, created: '2026-10-17' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/account - FHIR Account 5 条 */
async function handleFhirAccount(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Account', id: 'ACC-001', status: 'active', name: '王***住院账户', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/account-type', code: 'patient' }] }, subject: { reference: 'Patient/P-001' } },
    { resourceType: 'Account', id: 'ACC-002', status: 'active', name: '李***门诊账户', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/account-type', code: 'patient' }] }, subject: { reference: 'Patient/P-002' } },
    { resourceType: 'Account', id: 'ACC-003', status: 'active', name: '张***门诊账户', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/account-type', code: 'patient' }] }, subject: { reference: 'Patient/P-003' } },
    { resourceType: 'Account', id: 'ACC-004', status: 'active', name: '赵***住院账户', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/account-type', code: 'patient' }] }, subject: { reference: 'Patient/P-004' } },
    { resourceType: 'Account', id: 'ACC-005', status: 'active', name: '孙***住院账户', type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/account-type', code: 'patient' }] }, subject: { reference: 'Patient/P-005' } },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/questionnaire - FHIR Questionnaire 5 条 */
async function handleFhirQuestionnaire(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Questionnaire', id: 'Q-001', status: 'active', title: '老年综合评估问卷（CGA）', url: 'http://jlmedaios.org/Questionnaire/cga', subjectType: ['Patient'] },
    { resourceType: 'Questionnaire', id: 'Q-002', status: 'active', title: '跌倒风险评估问卷（Morse）', url: 'http://jlmedaios.org/Questionnaire/morse', subjectType: ['Patient'] },
    { resourceType: 'Questionnaire', id: 'Q-003', status: 'active', title: '抑郁筛查问卷（GDS-15）', url: 'http://jlmedaios.org/Questionnaire/gds15', subjectType: ['Patient'] },
    { resourceType: 'Questionnaire', id: 'Q-004', status: 'active', title: '营养评估问卷（MNA-SF）', url: 'http://jlmedaios.org/Questionnaire/mna-sf', subjectType: ['Patient'] },
    { resourceType: 'Questionnaire', id: 'Q-005', status: 'active', title: '认知功能筛查问卷（MMSE）', url: 'http://jlmedaios.org/Questionnaire/mmse', subjectType: ['Patient'] },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/communication - FHIR Communication 5 条 */
async function handleFhirCommunication(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'Communication', id: 'COMM-001', status: 'completed', subject: { reference: 'Patient/P-001' }, sent: '2026-10-20T09:00:00+08:00', received: '2026-10-20T09:05:00+08:00' },
    { resourceType: 'Communication', id: 'COMM-002', status: 'completed', subject: { reference: 'Patient/P-002' }, sent: '2026-10-19T10:30:00+08:00', received: '2026-10-19T10:35:00+08:00' },
    { resourceType: 'Communication', id: 'COMM-003', status: 'completed', subject: { reference: 'Patient/P-003' }, sent: '2026-10-18T14:15:00+08:00', received: '2026-10-18T14:20:00+08:00' },
    { resourceType: 'Communication', id: 'COMM-004', status: 'completed', subject: { reference: 'Patient/P-004' }, sent: '2026-10-18T09:30:00+08:00', received: '2026-10-18T09:35:00+08:00' },
    { resourceType: 'Communication', id: 'COMM-005', status: 'completed', subject: { reference: 'Patient/P-005' }, sent: '2026-10-17T08:45:00+08:00', received: '2026-10-17T08:50:00+08:00' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

/** GET /api/v1/fhir/documentreference - FHIR DocumentReference 5 条 */
async function handleFhirDocumentReference(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { resourceType: 'DocumentReference', id: 'DOC-001', status: 'current', type: { coding: [{ system: 'http://loinc.org', code: '18842-5', display: 'Discharge summary' }] }, subject: { reference: 'Patient/P-001' }, created: '2026-10-20' },
    { resourceType: 'DocumentReference', id: 'DOC-002', status: 'current', type: { coding: [{ system: 'http://loinc.org', code: '11504-8', display: 'Operative note' }] }, subject: { reference: 'Patient/P-004' }, created: '2026-10-19' },
    { resourceType: 'DocumentReference', id: 'DOC-003', status: 'current', type: { coding: [{ system: 'http://loinc.org', code: '34133-9', display: 'Consult note' }] }, subject: { reference: 'Patient/P-005' }, created: '2026-10-17' },
    { resourceType: 'DocumentReference', id: 'DOC-004', status: 'current', type: { coding: [{ system: 'http://loinc.org', code: '60591-8', display: 'History and physical note' }] }, subject: { reference: 'Patient/P-002' }, created: '2026-10-19' },
    { resourceType: 'DocumentReference', id: 'DOC-005', status: 'current', type: { coding: [{ system: 'http://loinc.org', code: '28570-0', display: 'Laboratory report' }] }, subject: { reference: 'Patient/P-003' }, created: '2026-10-18' },
  ];
  return json(ok({ resourceType: 'Bundle', type: 'searchset', total: items.length, entry: items.map((r) => ({ resource: r })) }));
}

export const fhirResourcesRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/fhir/patient', handle: handleFhirPatient, auth: true },
  { method: 'GET', path: '/api/v1/fhir/observation', handle: handleFhirObservation, auth: true },
  { method: 'GET', path: '/api/v1/fhir/condition', handle: handleFhirCondition, auth: true },
  { method: 'GET', path: '/api/v1/fhir/medicationrequest', handle: handleFhirMedicationRequest, auth: true },
  { method: 'GET', path: '/api/v1/fhir/encounter', handle: handleFhirEncounter, auth: true },
  { method: 'GET', path: '/api/v1/fhir/diagnosticreport', handle: handleFhirDiagnosticReport, auth: true },
  { method: 'GET', path: '/api/v1/fhir/practitioner', handle: handleFhirPractitioner, auth: true },
  { method: 'GET', path: '/api/v1/fhir/organization', handle: handleFhirOrganization, auth: true },
  { method: 'GET', path: '/api/v1/fhir/location', handle: handleFhirLocation, auth: true },
  { method: 'GET', path: '/api/v1/fhir/medication', handle: handleFhirMedication, auth: true },
  { method: 'GET', path: '/api/v1/fhir/procedure', handle: handleFhirProcedure, auth: true },
  { method: 'GET', path: '/api/v1/fhir/allergyintolerance', handle: handleFhirAllergyIntolerance, auth: true },
  { method: 'GET', path: '/api/v1/fhir/coverage', handle: handleFhirCoverage, auth: true },
  { method: 'GET', path: '/api/v1/fhir/claim', handle: handleFhirClaim, auth: true },
  { method: 'GET', path: '/api/v1/fhir/account', handle: handleFhirAccount, auth: true },
  { method: 'GET', path: '/api/v1/fhir/questionnaire', handle: handleFhirQuestionnaire, auth: true },
  { method: 'GET', path: '/api/v1/fhir/communication', handle: handleFhirCommunication, auth: true },
  { method: 'GET', path: '/api/v1/fhir/documentreference', handle: handleFhirDocumentReference, auth: true },
];
