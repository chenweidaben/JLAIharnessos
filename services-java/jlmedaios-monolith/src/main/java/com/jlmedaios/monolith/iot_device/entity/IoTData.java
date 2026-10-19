/*
 * 健澜科技 jlmedaios - IoT 采集数据实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.iot_device.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * IoT 采集数据实体。
 *
 * <p>append-only: IoT 采集数据不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "iot_data")
public class IoTData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_id")
    private String dataId;

    @Column(name = "device_code")
    private String deviceCode;

    @Column(name = "metric_key")
    private String metricKey;

    @Column(name = "metric_value")
    private String metricValue;

    @Column(name = "collect_time")
    @Builder.Default
    private LocalDateTime collectTime = LocalDateTime.now();
}
