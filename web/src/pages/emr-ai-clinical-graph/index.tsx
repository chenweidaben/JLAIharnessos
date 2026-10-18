/**
 * 健澜科技 jlmedaios - 病历AI临床知识图谱前端页（M550-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI临床知识图谱（病历ID/科室/查询节点/关联节点列表/边数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiClinicalGraph {
  recordId: string;
  dept: string;
}

interface GraphResult {
  relatedNodes: string[];
  edgeCount: number;
}

interface GraphReport {
  relatedNodes: string[];
  edgeCount: number;
}

export default function EmrAiClinicalGraphPage() {
  const [base, setBase] = useState<AiClinicalGraph | null>(null);
  const [node, setNode] = useState("急性心梗");
  const [result, setResult] = useState<GraphResult | null>(null);
  const [report, setReport] = useState<GraphReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-clinical-graph", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 临床知识图谱基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doQuery = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-clinical-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ node }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("知识图谱查询完成");
      } else {
        message.error("知识图谱查询失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI临床知识图谱</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="查询输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>查询节点：</Text>
            <Input
              value={node}
              onChange={(e) => setNode(e.target.value)}
              style={{ width: 200 }}
              placeholder="如：急性心梗 / 发热"
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doQuery}>
              查询图谱
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="知识图谱查询结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong>关联节点：</Text>
                <List
                  size="small"
                  dataSource={report.relatedNodes}
                  renderItem={(item: string, idx: number) => (
                    <List.Item>
                      <Tag color={idx === 0 ? "red" : idx === 1 ? "orange" : "blue"}>{item}</Tag>
                    </List.Item>
                  )}
                  style={{ marginTop: 8 }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="边数" value={report.edgeCount} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
