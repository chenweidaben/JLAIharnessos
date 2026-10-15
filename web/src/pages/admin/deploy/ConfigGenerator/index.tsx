/**
 * 健澜科技 jlmedaios - M145-D 部署配置生成页（生产化收尾）
 *
 * 【生产化收尾】运维人员在这里填对外域名，一键生成可直接落地的：
 *  - docker-compose.yml（postgres/redis/bff + 日志轮转 + 备份 sidecar）；
 *  - nginx.conf（80->443 跳转、TLS、/api 反代、安全头）；
 *  - 备份/容灾策略（全备周期 + WAL 归档 + 保留期 + 异地副本 + 月度演练）。
 * 生成后可复制粘贴到服务器，照着装起来。
 *
 * 三态：loading / error / empty。深海蓝 VI：主色 #0b3d6b。
 * 仅管理员可见（后端 requireRole 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Layout,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI */
const DEEP_SEA_BLUE = '#0b3d6b';

/** 备份策略（与 BFF 出参 deployConfigAggregator 对齐） */
interface BackupPolicy {
  enabled: boolean;
  fullBackupCron: string;
  walArchive: boolean;
  retentionDays: number;
  offsiteCopy: boolean;
  offsiteWeeklyDay: number;
  jobs: Array<{ name: string; schedule: string; target: string }>;
  verifyRestoreMonthly: boolean;
}

/** GET /api/v1/admin/deploy/config 的 data 出参 */
interface DeployConfigData {
  domain: string;
  sslCert: string;
  dockerCompose: string;
  nginxConf: string;
  backupPolicy: BackupPolicy;
  note: string;
}

/** 只读代码块：等宽字体 + 深海蓝描边，便于整段复制 */
function CodeBlock({ code }: { code: string }) {
  return (
    <pre
      style={{
        background: '#0b2540',
        color: '#d6e6f5',
        padding: 16,
        borderRadius: 6,
        overflow: 'auto',
        maxHeight: 520,
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {code}
    </pre>
  );
}

export default function ConfigGeneratorPage() {
  const [domain, setDomain] = useState('hospital.example.com');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<DeployConfigData | null>(null);

  /** 调用 BFF 现场生成配置文本 */
  const handleGenerate = async () => {
    setBusy(true);
    setError('');
    try {
      const url = `/api/v1/admin/deploy/config?domain=${encodeURIComponent(domain)}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.code !== 0) {
        throw new Error(json.message || '配置生成失败');
      }
      setData(json.data as DeployConfigData);
      message.success('部署配置已生成');
    } catch (e) {
      setError(e instanceof Error ? e.message : '配置生成失败');
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  /** 复制指定文本到剪贴板 */
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label}已复制到剪贴板`);
    } catch {
      message.warning('复制失败，请手动全选复制');
    }
  };

  const policy = data?.backupPolicy;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        <Title level={3} style={{ color: DEEP_SEA_BLUE }}>
          部署配置生成器
        </Title>
        <Paragraph type="secondary">
          输入对外域名，一键生成生产级 docker-compose.yml 与 nginx.conf，附带备份/容灾策略。
          生成内容仅为文本，落盘前请把口令占位符替换为随机强口令。仅管理员可见。
        </Paragraph>

        {/* 参数区 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space size="middle" wrap align="end">
            <div>
              <Text type="secondary">对外域名</Text>
              <Input
                style={{ width: 320, marginTop: 4 }}
                placeholder="hospital.example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <Button type="primary" style={{ background: DEEP_SEA_BLUE }} loading={busy} onClick={handleGenerate}>
              生成部署配置
            </Button>
          </Space>
        </Card>

        {error && (
          <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} closable onClose={() => setError('')} />
        )}

        <Spin spinning={busy}>
          {!data && !error && (
            <Card size="small">
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                填写域名后点击「生成部署配置」，结果将在这里以标签页展示。
              </Paragraph>
            </Card>
          )}

          {data && (
            <>
              {data.note && <Alert style={{ marginBottom: 16 }} type="warning" showIcon message={data.note} />}

              <Tabs
                items={[
                  {
                    key: 'compose',
                    label: 'docker-compose.yml',
                    children: (
                      <div>
                        <Space style={{ marginBottom: 8 }}>
                          <Button size="small" onClick={() => handleCopy(data.dockerCompose, 'docker-compose.yml')}>
                            复制 YAML
                          </Button>
                        </Space>
                        <CodeBlock code={data.dockerCompose} />
                      </div>
                    ),
                  },
                  {
                    key: 'nginx',
                    label: 'nginx.conf',
                    children: (
                      <div>
                        <Space style={{ marginBottom: 8 }}>
                          <Button size="small" onClick={() => handleCopy(data.nginxConf, 'nginx.conf')}>
                            复制 Nginx 配置
                          </Button>
                        </Space>
                        <CodeBlock code={data.nginxConf} />
                      </div>
                    ),
                  },
                  {
                    key: 'backup',
                    label: '备份/容灾策略',
                    children: (
                      <Card size="small">
                        {policy && (
                          <ul style={{ lineHeight: 2 }}>
                            <li>全量备份计划：{policy.fullBackupCron}（每日 02:00）</li>
                            <li>WAL 连续归档（支持 PITR 时点恢复）：{policy.walArchive ? '开启' : '关闭'}</li>
                            <li>本地备份保留：{policy.retentionDays} 天</li>
                            <li>异地副本：{policy.offsiteCopy ? `每周日(星期${policy.offsiteWeeklyDay})同步到对象存储` : '关闭'}</li>
                            <li>月度恢复演练：{policy.verifyRestoreMonthly ? '执行' : '不执行'}</li>
                            <li>
                              任务清单：
                              {policy.jobs.map((j) => `${j.name} [${j.schedule}] -> ${j.target}`).join('；')}
                            </li>
                          </ul>
                        )}
                      </Card>
                    ),
                  },
                ]}
              />
            </>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
