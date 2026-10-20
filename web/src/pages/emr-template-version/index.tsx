/**
 * 健澜科技 jlmedaios - 病历模板版本管理前端页（M539-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历模板版本管理（模板名/科室/版本列表/版本数/最新版本）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TemplateVersion {
  templateName: string;
  dept: string;
}

interface VersionItem {
  version: string;
  updatedAt: string;
}

interface VersionResult {
  versionCount: number;
  latestVersion: string;
}

interface VersionReport {
  versionCount: number;
  latestVersion: string;
}

export default function EmrTemplateVersionPage() {
  const [base, setBase] = useState<TemplateVersion | null>(null);
  const [versions] = useState<VersionItem[]>([
    { version: "v2.0", updatedAt: "2026-09-01" },
    { version: "v1.0", updatedAt: "2026-01-01" },
  ]);
  const [result, setResult] = useState<VersionResult | null>(null);
  const [report, setReport] = useState<VersionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-version", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载模板版本基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doList = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-version", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ versions }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("列表加载完成");
      } else {
        message.error("列表加载失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历模板版本管理</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>模板名：</Text><Text style={{ marginRight: 24 }}>{base.templateName}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="版本列表">
          <List
            size="small"
            dataSource={versions}
            style={{ marginBottom: 16 }}
            renderItem={(item) => (
              <List.Item>
                <Tag color="blue" style={{ marginRight: 8 }}>{item.version}</Tag>
                <Text type="secondary">{item.updatedAt}</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doList}>
            执行列表
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="列表结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="版本数" value={report.versionCount} />
              <div>
                <Text strong>最新版本：</Text>
                <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.latestVersion}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
