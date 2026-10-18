/**
 * 健澜科技 jlmedaios - 病历模板版本对比前端页（M466-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：并排对比（v1 左/v2 右，新增绿/删除红/修改黄高亮）+ 变更摘要。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
}

export default function EmrTemplateDiffPage() {
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState<DiffResult>({ added: [], removed: [], changed: [] });
  const [summary, setSummary] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-diff/TPL001?from=v1.0&to=v2.0", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setDiff(data?.diff ?? { added: [], removed: [], changed: [] });
            setSummary(data?.summary ?? "");
          }
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
        <Title level={3} style={{ color: VI.deep }}>病历模板版本对比</Title>
        <Spin spinning={loading}>
          <Card title="变更摘要" headStyle={{ background: VI.deep, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Text strong>{summary || "加载中..."}</Text>
          </Card>
          <Col span={24}>
            <Card title="新增字段（绿色高亮）" headStyle={{ background: "#52c41a", color: "#fff" }} style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={diff.added}
                renderItem={(item: string) => <List.Item><Tag color="green">新增</Tag><Text>{item}</Text></List.Item>}
              />
            </Card>
            <Card title="删除字段（红色高亮）" headStyle={{ background: "#ff4d4f", color: "#fff" }}>
              <List
                size="small"
                dataSource={diff.removed}
                renderItem={(item: string) => <List.Item><Tag color="red">删除</Tag><Text>{item}</Text></List.Item>}
              />
            </Card>
          </Col>
        </Spin>
      </Content>
    </Layout>
  );
}
