/**
 * 健澜科技 jlmedaios - 妇幼全周期 V4 页（M249-B）
 *
 * 婚前孕前优生咨询叶酸遗传筛查生殖健康/早孕建册产检高危产前诊断胎儿监护NIPT/分娩镇痛安全新生儿窒息产后出血/产后访视42天康复抑郁筛查母乳喂养盆底/儿童生长发育营养发育筛查心理行为眼保健/青春期月经贫血近视脊柱/两癌筛查。深海蓝 VI。
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
  preconception: { folicAcid: number; genetic: number };
  pregnancy: { prenatal: number; highRisk: number; nipt: number };
  delivery: { labor: number; analgesia: number; asphyxia: number };
  postpartum: { depression: number; breastfeeding: number; pelvic: number };
  child: { growth: number; vision: number; twoCancer: number };
  suggestions: string[];
}

export default function MaternalChildLifecycleV4Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/maternal-child-lifecycle-v4/report");
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
        <Title level={3} style={{ color: VI.deep }}>妇幼全周期 V4</Title>
        <Paragraph type="secondary">婚前·孕前·优生咨询·叶酸·遗传筛查 / 早孕建册·产检·高危·产前诊断·NIPT / 分娩镇痛·安全·新生儿窒息·产后出血 / 产后访视·42 天·康复·抑郁筛查·母乳喂养·盆底 / 儿童生长·发育·营养·心理行为·眼保健 / 青春期·月经·贫血·近视·脊柱 / 两癌筛查</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="产检" value={data.pregnancy.prenatal} /></Card></Col>
              <Col span={6}><Card><Statistic title="高危妊娠" value={data.pregnancy.highRisk} /></Card></Col>
              <Col span={6}><Card><Statistic title="母乳喂养率" value={`${data.postpartum.breastfeeding}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="儿童生长监测" value={data.child.growth} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>妇幼明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "folicAcid", name: "叶酸补服", value: data.preconception.folicAcid },
                  { key: "nipt", name: "NIPT", value: data.pregnancy.nipt },
                  { key: "analgesia", name: "分娩镇痛率", value: `${data.delivery.analgesia}%` },
                  { key: "twoCancer", name: "两癌筛查", value: data.child.twoCancer },
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
