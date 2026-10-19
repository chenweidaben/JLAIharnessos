/*
 * 健澜科技 jlmedaios - IoT 设备实体
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
 * IoT 设备实体。
 *
 * <p>IoT 设备主数据；生产接 MQTT/CoAP + 时序数据库 InfluxDB，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "iot_device")
public class IoTDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_code")
    private String deviceCode;

    @Column(name = "device_name")
    private String deviceName;

    @Column(name = "device_type")
    private String deviceType;

    @Column(name = "department")
    private String department;

    @Column(name = "status")
    @Builder.Default
    private String status = "ONLINE";

    @Column(name = "last_data_time")
    private LocalDateTime lastDataTime;
}
