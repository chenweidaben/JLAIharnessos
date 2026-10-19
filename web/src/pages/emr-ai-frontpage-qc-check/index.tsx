/**
 * 健澜科技 jlmedaios - 病历AI首页质控检查前端页（M551-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI病案首页质控检查（病历ID/科室/主诊断/主手术/转归/费用/缺失项数/是否通过）。
 * 避让说明：M544-C 已有 emrAiFrontpageQcV14，本切片用 -check 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiFrontpageQcCheck {
  recordId: string;
  dept: string;
}

interface CheckResult {
  missingCount: number;
  pass: boolean;
}

interface CheckReport {
  missingCount: number;
  pass: boolean;
}

export default function EmrAiFrontpageQcCheckPage() {
  const [base, setBase] = useState<AiFrontpageQcCheck | null>(null);
  const [hasMainDx, setHasMainDx] = useState(true);
  const [hasMainOp, setHasMainOp] = useState(true);
  const [hasOutcome, setHasOutcome] = useState(true);
  const [hasCost, setHasCost] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-frontpage-qc-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 首页质控检查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-frontpage-qc-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasMainDx, hasMainOp, hasOutcome, hasCost }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("首页质控检查完成");
      } else {
        message.error("首页质控检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病案首页质控检查</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="质控项输入">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div><Text strong>主诊断：</Text><Switch checked={hasMainDx} onChange={setHasMainDx} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>主手术：</Text><Switch checked={hasMainOp} onChange={setHasMainOp} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>转归：</Text><Switch checked={hasOutcome} onChange={setHasOutcome} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>费用：</Text><Switch checked={hasCost} onChange={setHasCost} style={{ marginLeft: 8 }} /></div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCheck}>
            检查首页质控
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="质控结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="缺失项数" value={report.missingCount} valueStyle={{ color: report.missingCount > 0 ? "#cf1322" : VI.accent }} />
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
