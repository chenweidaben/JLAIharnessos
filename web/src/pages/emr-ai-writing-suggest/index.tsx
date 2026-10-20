/**
 * 健澜科技 jlmedaios - 病历AI病历书写建议前端页（M553-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI病历书写建议（病历ID/科室/病历类型/是否有主诉/书写建议/优先级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Select, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiWritingSuggest {
  recordId: string;
  dept: string;
}

interface SuggestResult {
  suggestion: string;
  priority: string;
}

interface SuggestReport {
  suggestion: string;
  priority: string;
}

const priorityColor = (p: string): string => {
  if (p === "高") return "red";
  if (p === "中") return "orange";
  return "blue";
};

export default function EmrAiWritingSuggestPage() {
  const [base, setBase] = useState<AiWritingSuggest | null>(null);
  const [recordType, setRecordType] = useState("入院记录");
  const [hasChiefComplaint, setHasChiefComplaint] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [report, setReport] = useState<SuggestReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-writing-suggest", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病历书写建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-writing-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordType, hasChiefComplaint }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("书写建议生成完成");
      } else {
        message.error("书写建议生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病历书写建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="建议输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>病历类型：</Text>
            <Select
              value={recordType}
              onChange={setRecordType}
              style={{ width: 160 }}
              options={[
                { value: "入院记录", label: "入院记录" },
                { value: "病程记录", label: "病程记录" },
                { value: "出院小结", label: "出院小结" },
              ]}
            />
            <Text strong>是否有主诉：</Text>
            <Switch checked={hasChiefComplaint} onChange={setHasChiefComplaint} checkedChildren="有" unCheckedChildren="无" />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
              生成书写建议
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="建议结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>书写建议：</Text>
                <Text style={{ marginLeft: 8, fontSize: 16 }}>{report.suggestion}</Text>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>优先级：</Text>
                <Tag color={priorityColor(report.priority)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.priority}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
