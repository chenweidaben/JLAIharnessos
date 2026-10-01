/**
 * 健澜科技 jlmedaios - 患者我的配送单（M3-N）
 *
 * 展示本人配送单（自取取货码 / 快递物流信息），归属由后端强校验。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Table, Tag } from 'antd';
import { useInternetDeliveryStore } from '../../store/internetDeliveryStore';
import { internetPaymentApi } from '../../services/api/internetPayment';

const STATUS_COLOR: Record<string, string> = {
  created: 'default', packed: 'processing', shipped: 'blue',
  delivered: 'success', picked_up: 'success', cancelled: 'error',
};

export function MyDeliveries() {
  const { healthOk, loading, myDeliveries, loadMy } = useInternetDeliveryStore();
  const [patientId, setPatientId] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (healthOk) {
      setProfileLoading(true);
      internetPaymentApi
        .patientProfile()
        .then((r) => {
          setPatientId(r.patientId ?? '');
        })
        .catch(() => setPatientId(''))
        .finally(() => setProfileLoading(false));
    }
  }, [healthOk]);

  useEffect(() => {
    if (patientId) {
      loadMy(patientId);
    }
  }, [patientId, loadMy]);

  if (!healthOk) return <Alert type="warning" showIcon message="服务未就绪，配送单暂不可用" />;
  if (profileLoading) return <Spin tip="正在加载患者档案…" />;
  if (!patientId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="当前账号尚未完成实名建档，无法查看配送单。请先在「互联网医院」完成就诊人实名认证。"
      />
    );
  }

  return (
    <Card title="我的配送单" size="small">
      {loading ? (
        <Spin />
      ) : myDeliveries.length === 0 ? (
        <Empty description="暂无配送单。已支付处方将由药师为您创建配送。" />
      ) : (
        <Table
          rowKey="id"
          dataSource={myDeliveries}
          pagination={false}
          size="small"
          columns={[
            {
              title: '配送单号',
              dataIndex: 'deliveryNo',
              width: 220,
              render: (v: string) => <strong>{v}</strong>,
            },
            {
              title: '方式',
              dataIndex: 'channel',
              width: 90,
              render: (v: string) => (v === 'self_pick' ? '自取' : '快递'),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 110,
              render: (v: string) => (
                <Tag color={STATUS_COLOR[v] ?? 'default'}>{v === 'cancelled' ? '已取消' : v === 'delivered' ? '已送达' : v === 'picked_up' ? '已取走' : v === 'shipped' ? '已发货' : v === 'packed' ? '已打包' : '待打包'}</Tag>
              ),
            },
            {
              title: '取货码 / 物流',
              key: 'detail',
              render: (_: unknown, r: (typeof myDeliveries)[number]) =>
                r.channel === 'self_pick' ? (
                  r.pickupCode ? (
                    <Descriptions size="small" column={1} style={{ margin: 0 }}>
                      <Descriptions.Item label="自取取货码">
                        <strong style={{ fontSize: 16, letterSpacing: 2 }}>{r.pickupCode}</strong>
                      </Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <span>自取（取货码生成中）</span>
                  )
                ) : (
                  <Descriptions size="small" column={1} style={{ margin: 0 }}>
                    <Descriptions.Item label="物流公司">{r.courierCompany ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="快递单号">{r.trackingNo ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="收货地址">{r.addressSnapshot ?? '—'}</Descriptions.Item>
                  </Descriptions>
                ),
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              width: 170,
              render: (v: string) => new Date(v).toLocaleString('zh-CN'),
            },
          ]}
        />
      )}
    </Card>
  );
}
