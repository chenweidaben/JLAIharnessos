/**
 * 健澜科技 jlmedaios - 互联网在线报告（M3-N）
 *
 * 角色分流：患者 → 本人报告（检验/影像/AI 解读）；
 *           医护（internet:report:view）→ 指定患者报告查询。
 * 健康门禁：BFF/DB 离线时红色 Alert + 全屏水印，业务阻断，不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Collapse, Descriptions, Input, Space, Spin, Table, Tag, Watermark } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { useInternetDeliveryStore } from '../../store/internetDeliveryStore';
import { internetPaymentApi } from '../../services/api/internetPayment';

export default function InternetReportsWorkbench() {
  const user = useAuthStore((s) => s.user);
  const { healthOk, healthMsg, checking, checkHealth, loading, reports, loadMyReports, loadStaffReports } =
    useInternetDeliveryStore();
  const [patientId, setPatientId] = useState('');
  const [staffPatientId, setStaffPatientId] = useState('');
  const [visitId, setVisitId] = useState('');

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    if (healthOk) {
      internetPaymentApi
        .patientProfile()
        .then((r) => {
          setPatientId(r.patientId ?? '');
          if (r.patientId) loadMyReports(r.patientId);
        })
        .catch(() => setPatientId(''));
    }
  }, [healthOk, loadMyReports]);

  const role = user?.roleCodes ?? ([] as unknown as string[]);
  const isPatient = useMemo(() => (role as string[]).includes('patient'), [role]);
  const isStaff = useMemo(() => {
    const perms = user?.permissions ?? [];
    return (perms as string[]).includes('internet:report:view');
  }, [user]);

  return (
    <Watermark
      content={['健澜科技 jlmedaios', `${user?.realName ?? ''}  ·  在线报告`]}
      font={{ color: 'rgba(22,119,255,0.08)', fontSize: 13 }}
      gap={[150, 150]}
    >
      {!checking && !healthOk && (
        <Alert
          type="error"
          showIcon
          banner
          style={{ marginBottom: 12 }}
          message="后端服务或数据库不可用，报告查询已暂停"
          description="系统不会以缓存或假数据冒充检查检验结果。请等待服务恢复后刷新页面。"
        />
      )}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {!healthOk && healthMsg ? (
          <Alert type="warning" showIcon message={healthMsg} />
        ) : null}

        {isPatient ? (
          patientId ? (
            <Card title="我的检查检验报告" size="small">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input.Search
                  allowClear
                  placeholder="按就诊号（visitId）筛选（可选）"
                  onSearch={(v) => loadMyReports(patientId, v || undefined)}
                  enterButton="查询"
                  style={{ maxWidth: 360 }}
                />
                {loading ? <Spin /> : reports ? <ReportBody /> : <Alert type="info" showIcon message="暂无报告。" />}
              </Space>
            </Card>
          ) : (
            <Alert type="warning" showIcon message="当前账号尚未完成实名建档，无法查看报告。请先在「互联网医院」完成就诊人实名认证。" />
          )
        ) : isStaff ? (
          <Card title="医护报告查询" size="small">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space wrap>
                <Input
                  placeholder="患者 ID（patientId）"
                  value={staffPatientId}
                  onChange={(e) => setStaffPatientId(e.target.value)}
                  style={{ width: 260 }}
                />
                <Input
                  placeholder="就诊号（可选）"
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                  style={{ width: 220 }}
                />
                <button
                  type="button"
                  style={{
                    padding: '4px 16px', cursor: 'pointer',
                    background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6,
                  }}
                  onClick={() => {
                    if (staffPatientId.trim()) loadStaffReports(staffPatientId.trim(), visitId.trim() || undefined);
                  }}
                >
                  查询报告
                </button>
              </Space>
              {loading ? <Spin /> : reports ? <ReportBody /> : <Alert type="info" showIcon message="输入患者 ID 后查询。" />}
            </Space>
          </Card>
        ) : (
          <Alert type="info" showIcon message="当前账号无报告查看权限。患者可查看本人检查检验报告；医护可按患者 ID 查询。" />
        )}
      </Space>
    </Watermark>
  );

  function ReportBody() {
    if (!reports) return null;
    const abnormalCount = reports.labs.filter((l) => l.isCritical || (l.abnormalFlag && l.abnormalFlag !== 'N')).length;
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {abnormalCount > 0 && (
          <Alert type="warning" showIcon message={`检测到 ${abnormalCount} 项异常/危急结果，请遵医嘱复查或就医。`} />
        )}
        {reports.interpretations.length > 0 && (
          <Collapse
            items={reports.interpretations.map((it) => ({
              key: it.id,
              label: `AI 检验解读（${new Date(it.generatedAt).toLocaleString('zh-CN')} · ${it.department}）`,
              children: (
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="摘要">{it.summary}</Descriptions.Item>
                  <Descriptions.Item label="异常项">
                    {Array.isArray(it.abnormalItems) && it.abnormalItems.length
                      ? JSON.stringify(it.abnormalItems)
                      : '无'}
                  </Descriptions.Item>
                  <Descriptions.Item label="危急项">
                    {Array.isArray(it.criticalItems) && it.criticalItems.length
                      ? JSON.stringify(it.criticalItems)
                      : '无'}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {it.status === 'reviewed' ? '已复核' : '待复核'}
                    {it.reviewedAt ? `（${new Date(it.reviewedAt).toLocaleString('zh-CN')}）` : ''}
                  </Descriptions.Item>
                </Descriptions>
              ),
            }))}
          />
        )}
        {reports.labs.length > 0 && (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 900 }}
            dataSource={reports.labs}
            title={() => `检验结果（${reports.labs.length} 项）`}
            columns={[
              { title: '项目', dataIndex: 'itemName', width: 160 },
              { title: '结果', dataIndex: 'value', width: 120 },
              { title: '单位', dataIndex: 'unit', width: 80 },
              {
                title: '参考范围', key: 'ref', width: 140,
                render: (_: unknown, r: (typeof reports.labs)[number]) =>
                  `${r.refLow ?? ''} ~ ${r.refHigh ?? ''}`.trim(),
              },
              {
                title: '标记', dataIndex: 'abnormalFlag', width: 90,
                render: (v: string | null, r: (typeof reports.labs)[number]) =>
                  r.isCritical ? (
                    <Tag color="red">危急</Tag>
                  ) : v && v !== 'N' ? (
                    <Tag color="orange">{v}</Tag>
                  ) : (
                    <Tag>正常</Tag>
                  ),
              },
              {
                title: '时间', dataIndex: 'resultTime', width: 170,
                render: (v: string | null) => (v ? new Date(v).toLocaleString('zh-CN') : '—'),
              },
            ]}
          />
        )}
        {reports.imaging.length > 0 && (
          <Collapse
            items={reports.imaging.map((img) => ({
              key: img.id,
              label: `${img.modality ?? ''} ${img.examName}${img.isCritical ? '（危急）' : ''}`,
              children: (
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="检查部位">{img.bodyPart ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="影像所见">{img.findings ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="诊断印象">{img.impression ?? '—'}</Descriptions.Item>
                  {img.aiFindings != null &&
                    typeof img.aiFindings === 'object' &&
                    Object.keys(img.aiFindings).length > 0 && (
                      <Descriptions.Item label="AI 辅助发现">{String(JSON.stringify(img.aiFindings) ?? '')}</Descriptions.Item>
                    )}
                </Descriptions>
              ),
            }))}
          />
        )}
        {!reports.labs.length && !reports.imaging.length && !reports.interpretations.length && (
          <Alert type="info" showIcon message="该患者暂无报告。" />
        )}
      </Space>
    );
  }
}
