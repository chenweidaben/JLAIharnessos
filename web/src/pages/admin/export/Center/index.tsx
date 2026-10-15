/**
 * 健澜科技 jlmedaios - M148-D 报表中心（产品化收尾 · 打印级）
 *
 * 四类报表：门诊日报(PDF) / 住院月报(Excel) / 科室绩效(PDF) / 质控报告(PDF)。
 * PDF 报表由 BFF 返回带医院抬头/水印/页脚/分页规则的完整 HTML，
 * 本页在新窗口打开后直接调用浏览器打印 → 另存为 PDF，排版即所见即所得。
 *
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
  Row,
  Select,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

type ReportType = 'opd_daily' | 'inp_monthly' | 'dept_perf' | 'qc_report';

const REPORT_OPTIONS: {
  value: ReportType;
  label: string;
  desc: string;
  defaultFormat: 'pdf' | 'excel';
}[] = [
  { value: 'opd_daily', label: '门诊日报', desc: '各科室当日接诊/急诊量、候诊与满意度（PDF）', defaultFormat: 'pdf' },
  { value: 'inp_monthly', label: '住院月报', desc: '各科室月末在院、新入出院、床位使用率与周转（Excel）', defaultFormat: 'excel' },
  { value: 'dept_perf', label: '科室绩效', desc: '出院例数、医疗质量、运行效率与业务收入排名（PDF）', defaultFormat: 'pdf' },
  { value: 'qc_report', label: '质控报告', desc: '病历抽查、甲级率、缺陷与整改完成率（PDF）', defaultFormat: 'pdf' },
];

const DEPARTMENT_OPTIONS = ['内科', '外科', '妇产科', '儿科', '心内科', '骨科', '急诊科', '神经内科'];

export default function ReportCenterPage() {
  const [reportType, setReportType] = useState<ReportType>('opd_daily');
  const [date, setDate] = useState<string>('2026-10-16');
  const [department, setDepartment] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const selected = useMemo(
    () => REPORT_OPTIONS.find((o) => o.value === reportType),
    [reportType],
  );

  const buildUrl = (format: 'pdf' | 'excel'): string => {
    const params = new URLSearchParams({ type: reportType, format });
    if (date) params.set('date', date);
    if (department) params.set('department', department);
    return `/api/v1/admin/export?${params.toString()}`;
  };

  /** PDF：拉取打印级 HTML，新窗口打开后直接唤起打印对话框 */
  const handlePrintPdf = async () => {
    setBusy(true);
    setNotice('');
    try {
      const resp = await fetch(buildUrl('pdf'));
      if (!resp.ok) {
        let msg = `打印失败（HTTP ${resp.status}）`;
        try {
          const j = await resp.json();
          if (j?.message) msg = j.message;
        } catch {
          /* 忽略 */
        }
        setNotice(msg);
        return;
      }
      const html = await resp.text();
      const win = window.open('', '_blank', 'width=1024,height=768');
      if (!win) {
        setNotice('浏览器拦截了弹出窗口，请允许本站弹出后重试。');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      // 等待样式渲染后唤起打印
      win.focus();
      setTimeout(() => {
        win.print();
      }, 300);
      setNotice('已在新窗口打开报表，浏览器打印对话框中选择「另存为 PDF」即可归档。');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '网络异常，打印失败');
    } finally {
      setBusy(false);
    }
  };

  /** Excel：直接触发浏览器下载 */
  const handleDownloadExcel = () => {
    const url = buildUrl('excel');
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setNotice('已开始下载 Excel 报表（.xls，WPS/Excel 可直接打开）。');
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
          报表中心
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          门诊日报 / 住院月报 / 科室绩效 / 质控报告 · 打印级排版，浏览器一键导出 PDF
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        <Card title="报表条件" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>报表类型</div>
              <Select
                style={{ width: '100%' }}
                value={reportType}
                onChange={(v) => setReportType(v as ReportType)}
                options={REPORT_OPTIONS.map(({ value, label, defaultFormat }) => ({
                  value,
                  label: `${label}（${defaultFormat === 'pdf' ? 'PDF' : 'Excel'}）`,
                }))}
              />
              {selected && (
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {selected.desc}
                </Paragraph>
              )}
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 8, color: 'rgba(0,0,0,0.65)' }}>基准日期</div>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Col>
            <Col span={6}>
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
          </Row>

          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <Button
              type="primary"
              size="large"
              icon={<PrinterOutlined />}
              loading={busy}
              onClick={handlePrintPdf}
              style={{ background: VI.accent, borderColor: VI.accent }}
            >
              预览 / 打印 PDF
            </Button>
            <Button size="large" icon={<DownloadOutlined />} onClick={handleDownloadExcel}>
              下载 Excel（住院月报）
            </Button>
            <Tag color="blue" style={{ lineHeight: '30px', marginInlineStart: 8 }}>
              打印纸张：A4 纵向 · 已含抬头/水印/页脚/分页
            </Tag>
          </div>

          {notice && (
            <Alert
              style={{ marginTop: 16 }}
              type={notice.includes('失败') || notice.includes('拦截') ? 'error' : 'success'}
              showIcon
              message={notice}
            />
          )}
        </Card>

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="门诊日报" value="PDF" prefix={<PrinterOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="住院月报" value="Excel" prefix={<DownloadOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="科室绩效" value="PDF" prefix={<PrinterOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="质控报告" value="PDF" prefix={<PrinterOutlined />} />
            </Card>
          </Col>
        </Row>

        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="PDF 报表为聚合统计数据，不含患者个体 PII；仅 admin 角色可访问。打印时请在浏览器对话框中勾选「背景图形」以保留深海蓝表头与水印。"
        />
      </Content>
    </Layout>
  );
}
