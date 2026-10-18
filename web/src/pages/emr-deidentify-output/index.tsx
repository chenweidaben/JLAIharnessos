/**
 * 健澜科技 jlmedaios - 病历脱敏输出前端页（M528-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历脱敏输出（病历ID/字段数/患者姓名/身份证/手机号/脱敏姓名/脱敏身份证/脱敏手机/脱敏字段数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Descriptions, Layout, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeidentifyOutput {
  recordId: string;
  fieldCount: number;
}

interface DeidentifyResult {
  maskedName: string;
  maskedIdCard: string;
  maskedPhone: string;
}

interface DeidentifyReport {
  maskedCount: number;
}

const DEFAULT_NAME = "张三丰";
const DEFAULT_IDCARD = "110101199001011234";
const DEFAULT_PHONE = "13812345678";

export default function EmrDeidentifyOutputPage() {
  const [output, setOutput] = useState<DeidentifyOutput | null>(null);
  const [result, setResult] = useState<DeidentifyResult | null>(null);
  const [report, setReport] = useState<DeidentifyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOutput = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-deidentify-output", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setOutput(data?.data ?? null);
        }
      } catch {
        message.error("加载脱敏输出基础数据失败");
      }
    };
    void fetchOutput();
  }, []);

  const doDeidentify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-deidentify-output", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patientName: DEFAULT_NAME, idCard: DEFAULT_IDCARD, phone: DEFAULT_PHONE }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("脱敏完成");
      } else {
        message.error("脱敏失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历脱敏输出</Title>
        {output && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{output.recordId}</Text>
              <Text strong>字段数：</Text><Text>{output.fieldCount}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="原始数据">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="患者姓名">{DEFAULT_NAME}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{DEFAULT_IDCARD}</Descriptions.Item>
            <Descriptions.Item label="手机号">{DEFAULT_PHONE}</Descriptions.Item>
          </Descriptions>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doDeidentify}>
            执行脱敏
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="脱敏结果">
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="脱敏姓名">{result.maskedName}</Descriptions.Item>
              <Descriptions.Item label="脱敏身份证">{result.maskedIdCard}</Descriptions.Item>
              <Descriptions.Item label="脱敏手机">{result.maskedPhone}</Descriptions.Item>
            </Descriptions>
            <Statistic title="脱敏字段数" value={report.maskedCount} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
