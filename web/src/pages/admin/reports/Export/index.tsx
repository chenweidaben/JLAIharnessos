/**
 * 健澜科技 jlmedaios - M138-D 报表中心 · 数据报表导出页（仅 admin）
 *
 * 选择报表类型 / 导出格式 / 筛选条件后，直接从
 *   GET /api/v1/admin/reports/export?type=xxx&format=csv
 * 下载文件（CSV 或 Excel）。大数据量按页导出（page/pageSize），不一次性拉全量。
 *
 * 报表类型：门诊日报 / 住院日报 / 处方统计 / 质控月报。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Layout,
  Radio,
  Row,
  Select,
  Statistic,
  Typography,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const REPORT_OPTIONS = [
  { value: 'opd_daily', label: '门诊日报', desc: '各科室每日接诊/急诊量与候诊、次均费用' },
  { value: 'inp_daily', label: '住院日报', desc: '各科室在院、新入、出院与床位占用' },
  { value: 'rx_stat', label: '处方统计', desc: '处方量与抗菌药/注射剂/基本药物占比' },
  { value: 'qc_monthly', label: '质控月报', desc: '病历抽查、甲级率、缺陷与整改率' },
];

const DEPARTMENT_OPTIONS = [
  '内科',
  '外科',
  '妇产科',
  '儿科',
  '心内科',
  '骨科',
  '急诊科',
  '神经内科',
];

export default function ReportExportPage() {
  const [reportType, setReportType] = useState<string>('opd_daily');
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');
  const [department, setDepartment] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(500);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  const selected = useMemo(
    () => REPORT_OPTIONS.find((o) => o.value === reportType),
    [reportType],
  );

  /** 拼接导出 URL 并触发浏览器下载（直接访问 BFF，带登录态 Cookie） */
  const handleExport = async () => {
    setExporting(true);
    setNotice('');
    try {
      const params = new URLSearchParams({
        type: reportType,
        format,
        pageSize: String(pageSize),
      });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (department) params.set('department', department);

      const resp = await fetch(`/api/v1/admin/reports/export?${params.toString()}`);
      const rowCount = resp.headers.get('X-Report-Row-Count');
      const totalRows = resp.headers.get('X-Report-Total-Rows');
      if (!resp.ok) {
        // 非文件响应时尝试解析 JSON 信封错误
        let msg = `导出失败（HTTP ${resp.status}）`;
        try {
          const j = await resp.json();
          if (j?.message) msg = j.message;
        } catch {
          /* 忽略非 JSON 错误体 */
        }
        setNotice(msg);
        return;
      }
      // 取 blob 触发下载，避免地址栏跳转
      const blob = await resp.blob();
      const cd = resp.headers.get('Content-Disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `${reportType}.${format === 'csv' ? 'csv' : 'xls'}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice(
        `已导出 ${selected?.label ?? reportType}：本页 ${rowCount ?? '?'} 行，符合条件共 ${totalRows ?? '?'} 行。`,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '网络异常，导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          报表中心 · 数据导出
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          门诊 / 住院 / 处方 / 质控报表一键导出（CSV / Excel）· 分页取数，大数据量不卡死
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        <Card title="导出条件" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>报表类型</div>
              <Select
                style={{ width: '100%' }}
                value={reportType}
                onChange={setReportType}
                options={REPORT_OPTIONS.map(({ value, label }) => ({ value, label }))}
              />
              {selected && (
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {selected.desc}
                </Paragraph>
              )}
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>导出格式</div>
              <Radio.Group
                value={format}
                onChange={(e) => setFormat(e.target.value as 'csv' | 'excel')}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'excel', label: 'Excel' },
                ]}
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>开始日期</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>结束日期</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>科室（可选）</div>
              <Select
                allowClear
                style={{ width: '100%' }}
                placeholder="全部科室"
                value={department || undefined}
                onChange={(v) => setDepartment(v ?? '')}
                options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>每页行数（分页保护）</div>
              <Select
                style={{ width: '100%' }}
                value={pageSize}
                onChange={setPageSize}
                options={[
                  { value: 200, label: '200 行/页' },
                  { value: 500, label: '500 行/页' },
                  { value: 1000, label: '1000 行/页' },
                ]}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 24 }}>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
              style={{ background: VI.accent, borderColor: VI.accent }}
            >
              立即导出
            </Button>
          </div>

          {notice && (
            <Alert
              style={{ marginTop: 16 }}
              type={notice.includes('失败') ? 'error' : 'success'}
              showIcon
              message={notice}
            />
          )}
        </Card>

        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic title="支持报表" value={4} suffix="类" />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="导出格式" value="CSV / Excel" />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="取数方式" value="分页" suffix="不卡死" />
            </Card>
          </Col>
        </Row>

        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="导出结果为聚合统计数据，不含患者个体 PII；仅 admin 角色可下载。"
        />
      </Content>
    </Layout>
  );
}
