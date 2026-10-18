/**
 * 健澜科技 jlmedaios - 病程关键节点标记前端页（M538-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病程关键节点标记（病历ID/科室/节点类型/天数/是否标记/节点标签）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CourseNode {
  recordId: string;
  dept: string;
}

interface NodeResult {
  marked: boolean;
  nodeLabel: string;
}

interface NodeReport {
  marked: boolean;
  nodeLabel: string;
}

export default function EmrCourseNodePage() {
  const [node, setNode] = useState<CourseNode | null>(null);
  const [nodeType, setNodeType] = useState<"入院" | "手术" | "转出" | "出院">("手术");
  const [day, setDay] = useState(3);
  const [result, setResult] = useState<NodeResult | null>(null);
  const [report, setReport] = useState<NodeReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNode = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-course-node", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNode(data?.data ?? null);
        }
      } catch {
        message.error("加载关键节点基础数据失败");
      }
    };
    void fetchNode();
  }, []);

  const doMark = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-course-node", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ nodeType, day }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("标记完成");
      } else {
        message.error("标记失败");
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
        <Title level={3} style={{ color: VI.deep }}>病程关键节点标记</Title>
        {node && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{node.recordId}</Text>
              <Text strong>科室：</Text><Text>{node.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="标记输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>节点类型：</Text>
              <Select
                value={nodeType}
                onChange={(v) => setNodeType(v)}
                style={{ width: 120, marginLeft: 8 }}
                options={[
                  { value: "入院", label: "入院" },
                  { value: "手术", label: "手术" },
                  { value: "转出", label: "转出" },
                  { value: "出院", label: "出院" },
                ]}
              />
            </div>
            <div>
              <Text strong>天数：</Text>
              <Input
                type="number"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doMark}>
            执行标记
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="标记结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>是否标记：</Text>
              <Tag color={report.marked ? "green" : "red"} style={{ fontSize: 16 }}>
                {report.marked ? "已标记" : "未标记"}
              </Tag>
              <Text strong>节点标签：</Text>
              <Tag color="blue" style={{ fontSize: 16 }}>{report.nodeLabel}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
