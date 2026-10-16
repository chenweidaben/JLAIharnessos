/**
 * 健澜科技 jlmedaios - 行政办公 V3 页（M245-C）
 *
 * 发文收文审核签发电子印章/党委会院长办公会决议督办纪要/印章档案数字化/合同法务纠纷/信访网上接待。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  documents: { dispatch: number; receipt: number; eSeal: number };
  meetings: { partyCommittee: number; deanOffice: number; resolutions: number };
  supervision: { items: number; completed: number };
  archive: { digitized: number; total: number };
  suggestions: string[];
}

export default function AdministrationV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/administration-v3/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>行政办公 V3</Title>
        <Paragraph type="secondary">发文·收文·审核·签发·电子印章 / 党委会·院长办公会·决议·督办·纪要 / 印章·档案数字化 / 合同·法务·纠纷 / 信访·网上接待</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="收文" value={data.documents.receipt} /></Card></Col>
              <Col span={6}><Card><Statistic title="电子印章" value={data.documents.eSeal} /></Card></Col>
              <Col span={6}><Card><Statistic title="决议" value={data.meetings.resolutions} /></Card></Col>
              <Col span={6}><Card><Statistic title="督办完成率" value={`${Math.round((data.supervision.completed / data.supervision.items) * 100)}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>行政明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "dispatch", name: "发文", value: data.documents.dispatch },
                  { key: "partyCommittee", name: "党委会", value: data.meetings.partyCommittee },
                  { key: "deanOffice", name: "院长办公会", value: data.meetings.deanOffice },
                  { key: "digitized", name: "档案数字化", value: data.archive.digitized },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
