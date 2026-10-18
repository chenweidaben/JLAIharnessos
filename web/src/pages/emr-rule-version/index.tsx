/**
 * 健澜科技 jlmedaios - 病历质控规则版本管理前端页（M472-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：版本时间线（版本号+变更说明+日期）+ 发布新版本按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface VersionEntry {
  version: string;
  changes: string;
  date: string;
}

export default function EmrRuleVersionPage() {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-rule-version/RULE-001", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setVersions(data?.history?.versions ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控规则版本管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent }}>+ 发布新版本</Button>
        </Card>
        <Card title="版本时间线（降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              dataSource={versions}
              renderItem={(item: VersionEntry) => (
                <List.Item>
                  <Tag color="blue" style={{ fontSize: 14, minWidth: 60, textAlign: "center" }}>
                    {item.version}
                  </Tag>
                  <Text style={{ marginLeft: 16 }}>{item.changes}</Text>
                  <Text type="secondary" style={{ marginLeft: 16 }}>{item.date}</Text>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
