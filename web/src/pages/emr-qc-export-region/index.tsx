/**
 * 健澜科技 jlmedaios - 质控数据导出区域上报前端页（M497-D，M497 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：区域上报数据表单（区域/周期/指标）+ 校验结果。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Form, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RegionReport {
  region: string;
  period: string;
  metrics: Record<string, number>;
}

interface Validation {
  valid: boolean;
  errors: string[];
}

export default function EmrQcExportRegionPage() {
  const [region, setRegion] = useState("杭州");
  const [period, setPeriod] = useState("2026Q3");
  const [defectRate, setDefectRate] = useState("2");
  const [passRate, setPassRate] = useState("98");
  const [report, setReport] = useState<RegionReport | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);

  const submit = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-export-region", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          region,
          period,
          metrics: {
            defectRate: Number(defectRate) || 0,
            passRate: Number(passRate) || 0,
          },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReport(data?.data?.report ?? null);
        setValidation(data?.data?.validation ?? null);
        message.success("区域上报提交完成");
      }
    } catch {
      message.error("区域上报提交失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控数据区域上报</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="上报数据">
          <Form layout="vertical">
            <Form.Item label="区域">
              <Input value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: 300 }} />
            </Form.Item>
            <Form.Item label="周期">
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 300 }} />
            </Form.Item>
            <Form.Item label="缺陷率 (%)">
              <Input value={defectRate} onChange={(e) => setDefectRate(e.target.value)} style={{ width: 300 }} />
            </Form.Item>
            <Form.Item label="合格率 (%)">
              <Input value={passRate} onChange={(e) => setPassRate(e.target.value)} style={{ width: 300 }} />
            </Form.Item>
            <Button type="primary" onClick={submit} style={{ background: VI.accent }}>
              提交上报
            </Button>
          </Form>
        </Card>
        {validation && (
          <Card style={{ marginTop: 16 }} title="校验结果">
            <Text strong>状态：</Text>
            <Tag color={validation.valid ? "green" : "red"}>
              {validation.valid ? "格式正确" : "格式错误"}
            </Tag>
            {validation.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {validation.errors.map((err, i) => (
                  <Text key={i} type="danger">
                    {err}
                    <br />
                  </Text>
                ))}
              </div>
            )}
          </Card>
        )}
        {report && (
          <Card style={{ marginTop: 16 }} title="上报摘要">
            <Text>区域：{report.region}</Text>
            <br />
            <Text>周期：{report.period}</Text>
            <br />
            <Text>指标：{JSON.stringify(report.metrics)}</Text>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
