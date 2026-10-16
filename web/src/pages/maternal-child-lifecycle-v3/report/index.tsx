/**
 * 健澜科技 jlmedaios - 妇幼健康全周期 V3 页（M239-B）
 *
 * 孕前优生叶酸/产前诊断胎儿监护/分娩镇痛安全/产后42天抑郁筛查/儿童生长发育曲线/青春期性教育/妇女生殖。深海蓝 VI。
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
  preconception: number;
  prenatal: { screening: number; fetalMonitoring: number };
  labor: { analgesia: number; safety: number };
  postpartum: { depression: number };
  child: { growth: number; adolescent: number };
  women: { reproductive: number };
  suggestions: string[];
}

export default function MaternalChildLifecycleV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/maternal-child-lifecycle-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>妇幼健康全周期 V3</Title>
        <Paragraph type="secondary">孕前优生·叶酸 / 产前诊断·胎儿监护 / 分娩镇痛·安全 / 产后42天抑郁筛查 / 儿童生长发育曲线 / 青春期性教育 / 妇女生殖</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="孕前优生" value={data.preconception} /></Card></Col>
              <Col span={6}><Card><Statistic title="产前筛查" value={data.prenatal.screening} /></Card></Col>
              <Col span={6}><Card><Statistic title="分娩镇痛" value={data.labor.analgesia} /></Card></Col>
              <Col span={6}><Card><Statistic title="儿童生长监测" value={data.child.growth} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>妇幼明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "fetal", name: "胎儿监护", value: data.prenatal.fetalMonitoring },
                  { key: "postpartum", name: "产后抑郁筛查", value: data.postpartum.depression },
                  { key: "adolescent", name: "青春期教育", value: data.child.adolescent },
                  { key: "reproductive", name: "妇女生殖健康", value: data.women.reproductive },
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
