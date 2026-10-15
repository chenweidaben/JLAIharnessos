/**
 * 健澜科技 jlmedaios - M124-B 管理员数据备份/恢复页（运维工具）
 *
 * 【运维工具】系统管理员的离线备份与受控恢复入口：
 *  - 导出：一键下载白名单表的标准 JSON 备份文件；
 *  - 导入：上传备份文件，BFF 校验信封与完整性后给出恢复清单预览。
 *
 * 三态：loading（导出/导入进行中）/ error（失败可重试）/ empty（无备份产物提示）。
 * 深海蓝 VI：主色 #0b3d6b。
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

/** 导入成功后的恢复清单预览（与 BFF ok 出参对齐） */
interface RestorePreview {
  restorePrepared: boolean;
  version: string;
  exportedAt: string;
  tables: string[];
  rowCounts: Record<string, number>;
  note: string;
}

export default function BackupPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  /** 导出：直接触发浏览器下载备份文件 */
  const handleExport = async () => {
    setBusy(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/backup/export');
      if (!resp.ok) {
        throw new Error(`导出失败（HTTP ${resp.status}）`);
      }
      // 从 Content-Disposition 取文件名，回退默认名
      const cd = resp.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename = match?.[1] ?? `jlmedaios-backup-${Date.now()}.json`;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      message.success('备份文件已开始下载');
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setBusy(false);
    }
  };

  /** 导入：读取上传文件文本并 POST 给 BFF 校验 */
  const handleImportFile = async (file: File) => {
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const text = await file.text();
      const resp = await fetch('/api/v1/admin/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const json = await resp.json();
      if (json.code !== 0) {
        throw new Error(json.message || '备份文件校验失败');
      }
      setPreview(json.data as RestorePreview);
      message.success('备份文件校验通过，已生成恢复清单');
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
          数据备份与恢复
        </Title>
        <Paragraph type="secondary">
          运维工具：导出白名单表的标准 JSON 备份；上传备份文件进行完整性校验并预览恢复清单。
          物理回灌请在运维受控事务中执行。仅管理员可见。
        </Paragraph>

        {/* 操作区：导出 + 导入 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space size="large" wrap>
            <Button
              type="primary"
              style={{ background: DEEP_SEA_BLUE }}
              loading={busy}
              onClick={handleExport}
            >
              导出备份文件
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
                setPreview(null);
              }}
            >
              <Button loading={busy}>上传备份文件恢复</Button>
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

        {/* empty 态：尚未产生恢复清单 */}
        {!busy && !error && !preview && (
          <Alert
            type="info"
            showIcon
            message="暂无备份产物"
            description="点击「导出备份文件」下载当前系统备份，或上传历史备份文件进行恢复校验。"
          />
        )}

        {/* 恢复清单预览态 */}
        {!busy && !error && preview && (
          <Card title="恢复清单预览" size="small">
            <Paragraph>
              <Text strong>信封版本：</Text>
              {preview.version}　<Text strong>导出时刻：</Text>
              {preview.exportedAt}
            </Paragraph>
            <Table
              rowKey="table"
              size="small"
              pagination={false}
              dataSource={preview.tables.map((t) => ({ table: t, rows: preview.rowCounts[t] ?? 0 }))}
              columns={[
                { title: '表名', dataIndex: 'table' },
                { title: '待恢复行数', dataIndex: 'rows', width: 160 },
              ]}
            />
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              {preview.note}
            </Paragraph>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
