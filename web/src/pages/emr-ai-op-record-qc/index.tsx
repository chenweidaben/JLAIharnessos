/**
 * 健澜科技 jlmedaios - 病历AI手术记录质控前端页（M555-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI手术记录质控（病历ID/科室/手术名称/手术日期/术者/麻醉方式/手术所见/缺失项数/是否通过）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiOpRecordQc {
  recordId: string;
  dept: string;
}

interface QcResult {
  missingCount: number;
  pass: boolean;
}

interface QcReport {
  missingCount: number;
  pass: boolean;
}

export default function EmrAiOpRecordQcPage() {
  const [base, setBase] = useState<AiOpRecordQc | null>(null);
  const [hasOpName, setHasOpName] = useState(true);
  const [hasOpDate, setHasOpDate] = useState(true);
  const [hasSurgeon, setHasSurgeon] = useState(true);
  const [hasAnesthesia, setHasAnesthesia] = useState(true);
  const [hasOpFindings, setHasOpFindings] = useState(true);
  const [result, setResult] = useState<QcResult | null>(null);
  const [report, setReport] = useState<QcReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-op-record-qc", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 手术记录质控基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doQc = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-op-record-qc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasOpName, hasOpDate, hasSurgeon, hasAnesthesia, hasOpFindings }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("手术记录质控完成");
      } else {
        message.error("手术记录质控失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const items: Array<{ label: string; value: boolean; set: (v: boolean) => void }> = [
    { label: "手术名称", value: hasOpName, set: setHasOpName },
    { label: "手术日期", value: hasOpDate, set: setHasOpDate },
    { label: "术者", value: hasSurgeon, set: setHasSurgeon },
    { label: "麻醉方式", value: hasAnesthesia, set: setHasAnesthesia },
    { label: "手术所见", value: hasOpFindings, set: setHasOpFindings },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI手术记录质控</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="质控输入">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {items.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{it.label}：</Text>
                <Switch checked={it.value} onChange={it.set} />
              </div>
            ))}
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doQc}>
              开始质控
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="质控结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>缺失项数：</Text>
                <Tag color={report.missingCount > 0 ? "orange" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.missingCount} 项
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>是否通过：</Text>
                <Tag color={report.pass ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.pass ? "通过" : "不通过"}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
