/**
 * 健澜科技 jlmedaios - 病历AI检验解读明细前端页（M550-D，V14，EMR 深化四模块，M550 收官）
 *
 * 深海蓝VI：病历AI检验结果解读明细（病历ID/科室/检验项目/数值/参考下限/参考上限/结果状态/建议）。
 * 避让说明：M545-D 已有 emrAiLabInterpretV14，本切片用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiLabInterpretDetail {
  recordId: string;
  dept: string;
}

interface InterpretResult {
  status: string;
  advice: string;
}

interface InterpretReport {
  status: string;
  advice: string;
}

const statusColor = (status: string): string => {
  if (status === "偏高") return "red";
  if (status === "偏低") return "orange";
  return "green";
};

export default function EmrAiLabInterpretDetailPage() {
  const [base, setBase] = useState<AiLabInterpretDetail | null>(null);
  const [item, setItem] = useState("血糖");
  const [value, setValue] = useState(8.5);
  const [refLow, setRefLow] = useState(3.9);
  const [refHigh, setRefHigh] = useState(6.1);
  const [result, setResult] = useState<InterpretResult | null>(null);
  const [report, setReport] = useState<InterpretReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-lab-interpret-detail", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 检验解读明细基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doInterpret = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-lab-interpret-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ item, value, refLow, refHigh }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检验解读完成");
      } else {
        message.error("检验解读失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI检验结果解读明细</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="解读输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>检验项目：</Text>
            <Input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              style={{ width: 140 }}
              placeholder="如：血糖"
            />
            <Text strong>数值：</Text>
            <Input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <Text strong>参考下限：</Text>
            <Input
              type="number"
              step="0.1"
              value={refLow}
              onChange={(e) => setRefLow(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <Text strong>参考上限：</Text>
            <Input
              type="number"
              step="0.1"
              value={refHigh}
              onChange={(e) => setRefHigh(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doInterpret}>
              解读结果
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="解读结果">
            <Row gutter={24}>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>结果状态：</Text>
                <Tag color={statusColor(report.status)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.status}
                </Tag>
              </Col>
              <Col span={24}>
                <div style={{ marginTop: 16, padding: 12, background: report.status === "正常" ? "#f6ffed" : report.status === "偏高" ? "#fff1f0" : "#fff7e6", borderRadius: 4 }}>
                  <Text strong>建议：</Text>
                  <Text style={{ marginLeft: 8 }}>{report.advice}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
