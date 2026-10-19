/**
 * 健澜科技 jlmedaios - 病历AI医保结算清单质控前端页（M552-D，V14，EMR 深化四模块，M552 收官）
 *
 * 深海蓝VI：病历AI医保结算清单质控（病历ID/科室/主诊断/主手术/费用明细/医保类型/缺失项数/是否通过）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiSettlementListQc {
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

export default function EmrAiSettlementListQcPage() {
  const [base, setBase] = useState<AiSettlementListQc | null>(null);
  const [hasMainDiag, setHasMainDiag] = useState(true);
  const [hasMainSurg, setHasMainSurg] = useState(true);
  const [hasCostDetail, setHasCostDetail] = useState(true);
  const [hasInsuranceType, setHasInsuranceType] = useState(true);
  const [result, setResult] = useState<QcResult | null>(null);
  const [report, setReport] = useState<QcReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-settlement-list-qc", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 医保结算清单质控基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-settlement-list-qc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasMainDiag, hasMainSurg, hasCostDetail, hasInsuranceType }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("结算清单质控完成");
      } else {
        message.error("结算清单质控失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI医保结算清单质控</Title>
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
              <div><Text strong>主诊断：</Text><Switch checked={hasMainDiag} onChange={setHasMainDiag} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>主手术：</Text><Switch checked={hasMainSurg} onChange={setHasMainSurg} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>费用明细：</Text><Switch checked={hasCostDetail} onChange={setHasCostDetail} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>医保类型：</Text><Switch checked={hasInsuranceType} onChange={setHasInsuranceType} style={{ marginLeft: 8 }} /></div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCheck}>
            检查结算清单
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="质控结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>是否通过：</Text>
                <Tag color={report.pass ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.pass ? "通过" : "不通过"}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic title="缺失项数" value={report.missingCount} valueStyle={{ color: report.missingCount > 0 ? "#cf1322" : VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
