/**
 * 健澜科技 jlmedaios - 病历质控科室质量报告前端页（M475-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：报告卡片（科室名/总病历/通过率/缺陷数）+ 改进建议列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  dept: string;
  totalRecords: number;
  passCount: number;
  defectCount: number;
  passRate: number;
}

export default function EmrDeptQcReportPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report>({ dept: "", totalRecords: 0, passCount: 0, defectCount: 0, passRate: 0 });
  const [findings, setFindings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-dept-qc-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setReport(data?.report ?? { dept: "", totalRecords: 0, passCount: 0, defectCount: 0, passRate: 0 });
            setFindings(data?.findings ?? []);
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控科室质量报告</Title>
        <Spin spinning={loading}>
          <Card title={report.dept} headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Text>总病历：</Text>
            <Text strong style={{ marginLeft: 8 }}>{report.totalRecords}</Text>
            <Text style={{ marginLeft: 24 }}>通过率：</Text>
            <Text strong style={{ marginLeft: 8, color: "#52c41a" }}>{report.passRate}%</Text>
            <Text style={{ marginLeft: 24 }}>缺陷数：</Text>
            <Text strong style={{ marginLeft: 8, color: "#f5222d" }}>{report.defectCount}</Text>
          </Card>
          <Card title="改进建议" headStyle={{ background: VI.mid, color: "#fff" }}>
            <List
              dataSource={findings}
              renderItem={(item: string) => (
                <List.Item>
                  <Tag color="blue">{item}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
