/**
 * 健澜科技 jlmedaios - 病历AI归档校验前端页（M551-D，V14，EMR 深化四模块，M551 收官）
 *
 * 深海蓝VI：病历AI病案归档校验（病历ID/科室/病历完整/已签名/已编码/可归档/缺失项数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiArchiveCheck {
  recordId: string;
  dept: string;
}

interface CheckResult {
  canArchive: boolean;
  missingItems: number;
}

interface CheckReport {
  canArchive: boolean;
  missingItems: number;
}

export default function EmrAiArchiveCheckPage() {
  const [base, setBase] = useState<AiArchiveCheck | null>(null);
  const [hasCompleteRecord, setHasCompleteRecord] = useState(true);
  const [hasSigned, setHasSigned] = useState(true);
  const [hasCoded, setHasCoded] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-archive-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 归档校验基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-archive-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasCompleteRecord, hasSigned, hasCoded }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("归档校验完成");
      } else {
        message.error("归档校验失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病案归档校验</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="校验项输入">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div><Text strong>病历完整：</Text><Switch checked={hasCompleteRecord} onChange={setHasCompleteRecord} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={8}>
              <div><Text strong>已签名：</Text><Switch checked={hasSigned} onChange={setHasSigned} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={8}>
              <div><Text strong>已编码：</Text><Switch checked={hasCoded} onChange={setHasCoded} style={{ marginLeft: 8 }} /></div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCheck}>
            校验归档条件
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="校验结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>可归档：</Text>
                <Tag color={report.canArchive ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.canArchive ? "可归档" : "不可归档"}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic title="缺失项数" value={report.missingItems} valueStyle={{ color: report.missingItems > 0 ? "#cf1322" : VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
