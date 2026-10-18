/**
 * 健澜科技 jlmedaios - 模板科室个性化前端页（M524-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：模板科室个性化（科室/模板名/基础字段/科室特有字段/最终字段列表/新增字段数/总字段数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptPersonal {
  dept: string;
  templateName: string;
}

interface CustomizeResult {
  finalFields: string[];
  addedFields: number;
}

interface PersonalReport {
  totalFields: number;
  addedFields: number;
}

const DEFAULT_BASE_FIELDS = ["主诉", "现病史", "既往史"];
const DEFAULT_DEPT_FIELDS = ["既往史", "心脏超声结果"];

export default function EmrTemplateDeptPersonalPage() {
  const [personal, setPersonal] = useState<DeptPersonal | null>(null);
  const [result, setResult] = useState<CustomizeResult | null>(null);
  const [report, setReport] = useState<PersonalReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPersonal = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-dept-personal", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPersonal(data?.data ?? null);
        }
      } catch {
        message.error("加载科室个性化基础数据失败");
      }
    };
    void fetchPersonal();
  }, []);

  const doCustomize = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-dept-personal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ baseFields: DEFAULT_BASE_FIELDS, deptSpecificFields: DEFAULT_DEPT_FIELDS }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("定制完成");
      } else {
        message.error("定制失败");
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
        <Title level={3} style={{ color: VI.deep }}>模板科室个性化</Title>
        {personal && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="科室个性化基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{personal.dept}</Text>
              <Text strong>模板名：</Text><Text>{personal.templateName}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="定制输入">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>基础字段：</Text>
              <div style={{ marginTop: 8 }}>
                {DEFAULT_BASE_FIELDS.map((f) => (
                  <Tag key={f} color="default" style={{ marginBottom: 4 }}>{f}</Tag>
                ))}
              </div>
            </Col>
            <Col span={12}>
              <Text strong>科室特有字段：</Text>
              <div style={{ marginTop: 8 }}>
                {DEFAULT_DEPT_FIELDS.map((f) => (
                  <Tag key={f} color="blue" style={{ marginBottom: 4 }}>{f}</Tag>
                ))}
              </div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCustomize}>
            科室定制
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="定制结果">
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              <Statistic title="总字段数" value={report.totalFields} />
              <Statistic title="新增字段数" value={report.addedFields} valueStyle={{ color: "green" }} />
            </div>
            <Text strong>最终字段列表：</Text>
            <List
              size="small"
              dataSource={result.finalFields}
              renderItem={(item) => (
                <List.Item>
                  <Tag color={VI.accent}>{item}</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
