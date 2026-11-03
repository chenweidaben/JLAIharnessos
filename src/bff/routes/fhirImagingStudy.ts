/** 健澜科技：FHIR R4 资源出口扩面（M86-P）。DEMO_MODE 下返回标准 FHIR R4 JSON。 */
import { json, type Ctx, type RouteDef } from '../types';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** FHIR R4 ImagingStudy 资源（脱敏演示数据） */
interface FhirImagingStudy {
  resourceType: 'ImagingStudy';
  id: string;
  meta: { versionId: string; lastUpdated: string };
  status: 'registered' | 'available' | 'cancelled' | 'entered-in-error' | 'unknown';
  subject: { reference: string; display: string };
  started: string;
  numberOfSeries: number;
  modality: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  series: Array<{
    number: number;
    modality: { coding: Array<{ system: string; code: string; display: string }> };
    description: string;
    numberOfInstances: number;
    bodySite: { coding: Array<{ system: string; code: string; display: string }> };
  }>;
}

const demoImagingStudies: FhirImagingStudy[] = [
  {
    resourceType: 'ImagingStudy',
    id: 'IMG-001',
    meta: { versionId: '1', lastUpdated: '2026-11-02T12:00:00+08:00' },
    status: 'available',
    subject: { reference: 'Patient/P-001', display: '张**' },
    started: '2026-11-02T11:45:00+08:00',
    numberOfSeries: 1,
    modality: [{ coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'CT', display: 'Computed Tomography' }] }],
    series: [
      {
        number: 1,
        modality: { coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'CT', display: 'Computed Tomography' }] },
        description: '胸部 CT 平扫',
        numberOfInstances: 320,
        bodySite: { coding: [{ system: 'http://snomed.info/sct', code: '51185008', display: 'Thorax' }] },
      },
    ],
  },
  {
    resourceType: 'ImagingStudy',
    id: 'IMG-002',
    meta: { versionId: '1', lastUpdated: '2026-11-04T14:30:00+08:00' },
    status: 'registered',
    subject: { reference: 'Patient/P-002', display: '李**' },
    started: '2026-11-04T14:10:00+08:00',
    numberOfSeries: 2,
    modality: [{ coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'MR', display: 'Magnetic Resonance' }] }],
    series: [
      {
        number: 1,
        modality: { coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'MR', display: 'Magnetic Resonance' }] },
        description: '头颅 MRI 轴位 T1WI',
        numberOfInstances: 24,
        bodySite: { coding: [{ system: 'http://snomed.info/sct', code: '12738006', display: 'Brain' }] },
      },
      {
        number: 2,
        modality: { coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'MR', display: 'Magnetic Resonance' }] },
        description: '头颅 MRI 轴位 T2WI',
        numberOfInstances: 24,
        bodySite: { coding: [{ system: 'http://snomed.info/sct', code: '12738006', display: 'Brain' }] },
      },
    ],
  },
  {
    resourceType: 'ImagingStudy',
    id: 'IMG-003',
    meta: { versionId: '1', lastUpdated: '2026-10-28T10:00:00+08:00' },
    status: 'available',
    subject: { reference: 'Patient/P-003', display: '王**' },
    started: '2026-10-28T09:30:00+08:00',
    numberOfSeries: 1,
    modality: [{ coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'DX', display: 'Digital Radiography' }] }],
    series: [
      {
        number: 1,
        modality: { coding: [{ system: 'http://dicom.nema.org/resources/ontology/DCM', code: 'DX', display: 'Digital Radiography' }] },
        description: '胸部正位 DR',
        numberOfInstances: 2,
        bodySite: { coding: [{ system: 'http://snomed.info/sct', code: '51185008', display: 'Thorax' }] },
      },
    ],
  },
];

function applySearch(q: URLSearchParams, list: FhirImagingStudy[]): FhirImagingStudy[] {
  let out = list;
  const patient = q.get('patient');
  if (patient) out = out.filter((i) => i.subject.reference === `Patient/${patient}`);
  const modality = q.get('modality');
  if (modality) out = out.filter((i) => i.modality.some((m) => m.coding.some((c) => c.code === modality)));
  return out;
}

function toBundle(resources: FhirImagingStudy[]): Record<string, unknown> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map((r) => ({ resource: r })),
  };
}

function operationOutcomeNotFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `FHIR 资源不存在：${kind}/${id}` },
      ],
    },
    404,
  );
}

export const fhirImagingStudyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/fhir/r4/ImagingStudy',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoImagingStudies)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/ImagingStudy/_search',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return json(toBundle([]));
      return json(toBundle(applySearch(c.query, demoImagingStudies)));
    },
  },
  {
    method: 'GET',
    path: '/fhir/r4/ImagingStudy/:id',
    auth: false,
    handle: async (c: Ctx): Promise<Response> => {
      if (!isDemo) return operationOutcomeNotFound('ImagingStudy', c.params.id);
      const found = demoImagingStudies.find((i) => i.id === c.params.id);
      if (!found) return operationOutcomeNotFound('ImagingStudy', c.params.id);
      return json(found);
    },
  },
];
