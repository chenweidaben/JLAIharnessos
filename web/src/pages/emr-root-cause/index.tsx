/**
 * 健澜科技 jlmedaios - 病历缺陷根因分析前端页（M468-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：因果树展示（根因在中心/子因环绕）+ 频次统计列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, message, Space, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AnalysisItem {
  cause: string;
  count: number;
  percent: number;
}

export default function EmrRootCausePage() {
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
  const [rootCause, setRootCause] = useState("");

  const handleAnalyze = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-root-cause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          defects: ["主诉缺失", "主诉缺失", "现病史过短", "诊断不规范"],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAnalysis(data?.analysis ?? []);
        setRootCause(data?.tree?.rootCause ?? "");
        message.success("根因分析完成");
      } else {
        message.warning("分析失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("分析失败（后端 route 未就绪）");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历缺陷根因分析</Title>
        <Card style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent }} onClick={handleAnalyze}>运行根因分析</Button>
          {rootCause && (
            <Tag color="red" style={{ marginLeft: 16 }}>根因：{rootCause}</Tag>
          )}
        </Card>
        <Card title="频次统计（降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
          <List
            dataSource={analysis}
            renderItem={(item: AnalysisItem) => (
              <List.Item>
                <Tag color="blue">{item.cause}</Tag>
                <Space>
                  <span>频次：{item.count}</span>
                  <span>占比：{item.percent}%</span>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
