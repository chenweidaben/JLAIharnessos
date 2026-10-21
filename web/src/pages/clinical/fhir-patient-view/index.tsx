/**
 * 健澜科技 jlmedaios - FHIR R4 Patient 资源只读预览（M541，P0）
 *
 * 三甲流程：患者 Select（P10001/P10002/P10003）→ Descriptions 展示 R4 Patient 资源
 * （resourceType/identifier/name/gender/birthDate/address）→ 深色 <pre> JSON 只读预览。
 * 权限码 fhir:view。BFF 404/网络异常由 service 层降级三种子镜像并打标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import { Alert, Card, Descriptions, Select, Spin, Tag } from 'antd';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useFhirPatientViewStore } from '@/store/fhirPatientViewStore';
import {
  FHIR_GENDER_LABEL,
  FHIR_PATIENT_PREVIEW,
  addressText,
  patientDisplayName,
} from '@/services/api/fhirPatientView';

export default function FhirPatientViewPage() {
  usePageTitle('FHIR 患者资源');
  const { hasPermission } = usePermission();
  const canView = hasPermission('fhir:view');

  const { current, selectedId, loading, error, demo, load } = useFhirPatientViewStore();

  useEffect(() => {
    void load(selectedId);
  }, [load, selectedId]);

  return (
    <PageContainer
      title="FHIR R4 Patient 资源预览"
      description="GET /fhir/Patient/:id · 只读 Descriptions + JSON 原文"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 fhir:view 权限" />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 320 }}
          value={selectedId}
          onChange={(v) => void load(v)}
          options={FHIR_PATIENT_PREVIEW.map((p) => ({
            value: p.id,
            label: `${p.id} · ${patientDisplayName(p)} · ${FHIR_GENDER_LABEL[p.gender ?? 'unknown']}`,
          }))}
        />
      </Card>

      <Spin spinning={loading}>
        {current && (
          <Card size="small" title="Patient 资源（R4）" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="resourceType">{current.resourceType}</Descriptions.Item>
              <Descriptions.Item label="id">{current.id}</Descriptions.Item>
              <Descriptions.Item label="identifier">
                {current.identifier?.map((x) => x.value).join('，') ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="name">{patientDisplayName(current)}</Descriptions.Item>
              <Descriptions.Item label="gender">
                {FHIR_GENDER_LABEL[current.gender ?? 'unknown']}
              </Descriptions.Item>
              <Descriptions.Item label="birthDate">{current.birthDate ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="address" span={2}>
                {current.address?.map((a) => addressText(a)).join('；') ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
        {current && (
          <Card size="small" title="JSON 原文（只读）">
            <pre
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                padding: 16,
                borderRadius: 6,
                overflow: 'auto',
                fontSize: 12,
                margin: 0,
              }}
            >
              {JSON.stringify(current, null, 2)}
            </pre>
          </Card>
        )}
      </Spin>
    </PageContainer>
  );
}
