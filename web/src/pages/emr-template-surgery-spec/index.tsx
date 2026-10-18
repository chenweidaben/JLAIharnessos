/**
 * 健澜科技 jlmedaios - 手术记录模板规范前端页（M523-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：手术记录模板规范（手术类型/规范版本/4 项检查框/校验结果/缺失项数/缺失列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SurgerySpec {
  surgeryType: string;
  specVersion: string;
}

interface ValidateResult {
  valid: boolean;
  missingFields: string[];
}

interface SpecReport {
  valid: boolean;
  missingCount: number;
}

export default function EmrTemplateSurgerySpecPage() {
  const [spec, setSpec] = useState<SurgerySpec | null>(null);
  const [hasPreOp, setHasPreOp] = useState(true);
  const [hasIncision, setHasIncision] = useState(false);
  const [hasAnesthesia, setHasAnesthesia] = useState(true);
  const [hasPostOp, setHasPostOp] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [report, setReport] = useState<SpecReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-surgery-spec", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setSpec(data?.data ?? null);
        }
      } catch {
        message.error("加载规范基础数据失败");
      }
    };
    void fetchSpec();
  }, []);

  const doValidate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-surgery-spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasPreOp, hasIncision, hasAnesthesia, hasPostOp }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("校验完成");
      } else {
        message.error("校验失败");
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
        <Title level={3} style={{ color: VI.deep }}>手术记录模板规范</Title>
        {spec && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规范基础数据">
            <div>
              <Text strong>手术类型：</Text><Text style={{ marginRight: 24 }}>{spec.surgeryType}</Text>
              <Text strong>规范版本：</Text>
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{spec.specVersion}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="模板完整性检查">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Checkbox checked={hasPreOp} onChange={(e) => setHasPreOp(e.target.checked)}>术前小结</Checkbox>
            <Checkbox checked={hasIncision} onChange={(e) => setHasIncision(e.target.checked)}>切口记录</Checkbox>
            <Checkbox checked={hasAnesthesia} onChange={(e) => setHasAnesthesia(e.target.checked)}>麻醉记录</Checkbox>
            <Checkbox checked={hasPostOp} onChange={(e) => setHasPostOp(e.target.checked)}>术后记录</Checkbox>
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doValidate}>
            校验手术模板
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="校验结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 16 }}>
              <div>
                <Text strong>校验结果：</Text>
                <Tag color={report.valid ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.valid ? "通过" : "不通过"}
                </Tag>
              </div>
              <Statistic title="缺失项数" value={report.missingCount} />
            </div>
            {result.missingFields.length > 0 && (
              <div>
                <Text strong>缺失列表：</Text>
                <List
                  size="small"
                  dataSource={result.missingFields}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="red">{item}</Tag>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
