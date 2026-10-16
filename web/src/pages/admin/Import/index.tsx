/**
 * 健澜科技 jlmedaios - M129-C 管理员标准数据导入页（【系统集成】）
 *
 * 【系统集成】面向 HIS / EMR / 体检 / 基层公卫平台对接的标准导入入口：
 *  - 下载模板：GET /admin/import/template，按三段字段说明准备导入文件；
 *  - 上传导入：POST /admin/import/patients，BFF 校验信封与逐行业务规则后
 *    返回受理结果（收多少 / 拒多少 / 为什么）。
 *
 * 三态：busy（上传/模板下载中）/ error（失败可重试）/ empty（尚未导入提示）。
 * 深海蓝 VI：主色 #0b3d6b。仅管理员可见。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Layout,
  Space,
  Spin,
  Table,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA_BLUE = '#0b3d6b';

/** 行级错误（与 BFF ImportIssue 对齐） */
interface ImportIssue {
  section: 'patients' | 'visits' | 'prescriptions';
  row: number;
  field: string;
  message: string;
  value: unknown;
}

/** 导入受理结果（与 BFF ok 出参对齐） */
interface ImportResultView {
  accepted: { patients: unknown[]; visits: unknown[]; prescriptions: unknown[] };
  rejected: ImportIssue[];
  counts: { patients: number; visits: number; prescriptions: number; rejectedRows: number };
  importedAt: string;
  note: string;
}

/** 数据段中文标题 */
const SECTION_LABEL: Record<ImportIssue['section'], string> = {
  patients: '患者基本信息',
  visits: '就诊记录',
  prescriptions: '处方记录',
};

export default function ImportPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResultView | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  /** 下载导入模板：拉取模板 JSON 并触发浏览器保存 */
  const handleDownloadTemplate = async () => {
    setBusy(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/import/template');
      const json = await resp.json();
      if (json.code !== 0) {
        throw new Error(json.message || '模板下载失败');
      }
      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jlmedaios-data-import-template.json';
      a.click();
      URL.revokeObjectURL(url);
      message.success('导入模板已开始下载');
    } catch (e) {
      setError(e instanceof Error ? e.message : '模板下载失败');
    } finally {
      setBusy(false);
    }
  };

  /** 上传导入文件：读取文本并 POST 给 BFF 校验 */
  const handleImportFile = async (file: File) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const text = await file.text();
      const resp = await fetch('/api/v1/admin/import/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const json = await resp.json();
      if (json.code !== 0) {
        throw new Error(json.message || '导入校验失败');
      }
      setResult(json.data as ImportResultView);
      const c = (json.data as ImportResultView).counts;
      message.success(
        `导入受理完成：患者 ${c.patients} / 就诊 ${c.visits} / 处方 ${c.prescriptions}，拒收 ${c.rejectedRows} 行`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setBusy(false);
    }
    // 阻止 antd 自动上传
    return false;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        <Title level={3} style={{ color: DEEP_SEA_BLUE }}>
          标准数据导入
        </Title>
        <Paragraph type="secondary">
          【系统集成】面向 HIS / EMR / 体检 / 基层公卫平台对接：上传标准 JSON 导入文件，
          支持患者基本信息、就诊记录、处方记录三段数据。BFF 完成信封与逐行业务校验，
          物理回灌由受控导入作业执行。仅管理员可见。
        </Paragraph>

        {/* 操作区：下载模板 + 上传导入 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space size="large" wrap>
            <Button
              style={{ background: DEEP_SEA_BLUE, color: '#fff' }}
              loading={busy}
              onClick={handleDownloadTemplate}
            >
              下载导入模板
            </Button>
            <Upload
              accept="application/json,.json"
              maxCount={1}
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([{ uid: file.uid, name: file.name }]);
                void handleImportFile(file);
                return false; // 阻止自动上传
              }}
              onRemove={() => {
                setFileList([]);
                setResult(null);
              }}
            >
              <Button type="primary" style={{ background: DEEP_SEA_BLUE }} loading={busy}>
                上传导入文件
              </Button>
            </Upload>
          </Space>
        </Card>

        {/* loading 态 */}
        {busy && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="处理中…" />
          </div>
        )}

        {/* error 态 */}
        {!busy && error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={<Button size="small" onClick={() => setError('')}>知道了</Button>}
          />
        )}

        {/* empty 态：尚未产生导入结果 */}
        {!busy && !error && !result && (
          <Alert
            type="info"
            showIcon
            message="暂无导入记录"
            description="先下载导入模板，按字段说明准备 JSON 文件后上传；三段数据跨表引用在包内闭环。"
          />
        )}

        {/* 受理结果态 */}
        {!busy && !error && result && (
          <>
            <Card title="受理概览" size="small" style={{ marginBottom: 16 }}>
              <Space size="large" wrap>
                <Text>
                  收患者：<Text strong style={{ color: DEEP_SEA_BLUE }}>{result.counts.patients}</Text> 行
                </Text>
                <Text>
                  收就诊：<Text strong style={{ color: DEEP_SEA_BLUE }}>{result.counts.visits}</Text> 行
                </Text>
                <Text>
                  收处方：<Text strong style={{ color: DEEP_SEA_BLUE }}>{result.counts.prescriptions}</Text> 行
                </Text>
                <Text>
                  拒收：<Text strong type={result.counts.rejectedRows > 0 ? 'danger' : undefined}>{result.counts.rejectedRows}</Text> 行
                </Text>
                <Text type="secondary">受理时刻：{result.importedAt}</Text>
              </Space>
            </Card>

            {result.rejected.length > 0 && (
              <Card title="拒收行错误清单" size="small" style={{ marginBottom: 16 }}>
                <Table
                  rowKey={(r) => `${r.section}-${r.row}-${r.field}`}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  dataSource={result.rejected}
                  columns={[
                    { title: '数据段', dataIndex: 'section', width: 120, render: (s: ImportIssue['section']) => SECTION_LABEL[s] ?? s },
                    { title: '行号', dataIndex: 'row', width: 70 },
                    { title: '字段', dataIndex: 'field', width: 140 },
                    { title: '问题', dataIndex: 'message' },
                  ]}
                />
              </Card>
            )}

            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {result.note}
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
