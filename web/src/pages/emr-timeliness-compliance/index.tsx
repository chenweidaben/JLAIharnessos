/**
 * 健澜科技 jlmedaios - 病历时效合规检查前端页（M485-D，M485 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：时效合规表格（项目/规定时限/实际耗时/状态绿√红✗）+ 合规率。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TimelinessRecord {
  name: string;
  deadlineHours: number;
  actualHours: number;
  overdue: boolean;
}

interface TimelinessComplianceResult {
  records: TimelinessRecord[];
  overdueCount: number;
  compliantCount: number;
  total: number;
}

interface TimelinessReport {
  overdueCount: number;
  compliantCount: number;
  total: number;
  compliantRate: number;
}

export default function EmrTimelinessCompliancePage() {
  const [result, setResult] = useState<TimelinessComplianceResult | null>(null);
  const [report, setReport] = useState<TimelinessReport | null>(null);

  const check = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-timeliness-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          records: [
            { name: "入院记录", deadlineHours: 24, actualHours: 20 },
            { name: "首次病程", deadlineHours: 8, actualHours: 12 },
            { name: "出院小结", deadlineHours: 48, actualHours: 36 },
          ],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("检查完成");
      }
    } catch {
      message.error("检查失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历时效合规检查</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <Button type="primary" onClick={check} style={{ background: VI.accent }}>
            检查示例
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title="合规率" value={report.compliantRate} suffix="%" />
            <Statistic title="超时数" value={report.overdueCount} style={{ marginTop: 12 }} />
          </Card>
        )}
        {result && (
          <Card style={{ marginTop: 16 }}>
            <List
              dataSource={result.records}
              renderItem={(record) => (
                <List.Item>
                  <Typography.Text style={{ width: 120 }}>{record.name}</Typography.Text>
                  <Typography.Text style={{ marginRight: 16 }}>规定 {record.deadlineHours}h</Typography.Text>
                  <Typography.Text style={{ marginRight: 16 }}>实际 {record.actualHours}h</Typography.Text>
                  {record.overdue ? <Tag color="red">✗ 超时</Tag> : <Tag color="green">✓ 合规</Tag>}
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
