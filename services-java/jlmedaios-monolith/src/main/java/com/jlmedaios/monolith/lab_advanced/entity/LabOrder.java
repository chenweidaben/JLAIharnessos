/*
 * 健澜科技 jlmedaios - 检验申请单实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_advanced.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 检验申请单实体。
 *
 * <p>检验申请单主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "lab_order")
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no")
    private String orderNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "test_panel")
    private String testPanel;

    @Column(name = "specimen_type")
    private String specimenType;

    @Column(name = "collect_time")
    private LocalDateTime collectTime;

    @Column(name = "receive_time")
    private LocalDateTime receiveTime;

    @Column(name = "status")
    @Builder.Default
    private String status = "APPLIED";
}
