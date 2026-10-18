/**
 * 健澜科技 jlmedaios - 病历质量改进建议前端页（M536-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历质量改进建议（科室/病历ID/综合得分/阻断/主要/次要/改进建议列表/优先级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QualityImprove {
  dept: string;
  recordId: string;
}

interface ImproveResult {
  suggestions: string[];
  priority: string;
}

interface ImproveReport {
  suggestions: string[];
  priority: string;
}

export default function EmrQualityImprovePage() {
  const [improve, setImprove] = useState<QualityImprove | null>(null);
  const [score, setScore] = useState(60);
  const [block, setBlock] = useState(1);
  const [major, setMajor] = useState(2);
  const [minor, setMinor] = useState(3);
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [report, setReport] = useState<ImproveReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchImprove = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quality-improve", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setImprove(data?.data ?? null);
        }
      } catch {
        message.error("加载改进建议基础数据失败");
      }
    };
    void fetchImprove();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-quality-improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ score, block, major, minor }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("建议生成完成");
      } else {
        message.error("建议生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历质量改进建议</Title>
        {improve && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{improve.dept}</Text>
              <Text strong>病历ID：</Text><Text>{improve.recordId}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>综合得分：</Text>
              <Input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>阻断数：</Text>
              <Input
                type="number"
                value={block}
                onChange={(e) => setBlock(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>主要缺陷：</Text>
              <Input
                type="number"
                value={major}
                onChange={(e) => setMajor(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>次要缺陷：</Text>
              <Input
                type="number"
                value={minor}
                onChange={(e) => setMinor(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
            生成建议
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="改进建议">
            <div style={{ marginBottom: 16 }}>
              <Text strong>优先级：</Text>
              <Tag color={report.priority === "高" ? "red" : report.priority === "中" ? "orange" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.priority}
              </Tag>
            </div>
            <List
              size="small"
              dataSource={report.suggestions}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="blue" style={{ marginBottom: 4 }}>{item}</Tag>
                </List.Item>
              )}
            />
            {report.suggestions.length === 0 && <Text style={{ color: "#999" }}>无改进建议</Text>}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
