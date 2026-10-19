/*
 * 健澜科技 jlmedaios - 影像申请单实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_advanced.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 影像申请单实体。
 *
 * <p>影像申请单主数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "radiology_order")
public class RadiologyOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no")
    private String orderNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "body_part")
    private String bodyPart;

    @Column(name = "exam_type")
    private String examType;

    @Column(name = "clinical_info", columnDefinition = "TEXT")
    private String clinicalInfo;

    @Column(name = "order_time")
    @Builder.Default
    private LocalDateTime orderTime = LocalDateTime.now();

    @Column(name = "status")
    @Builder.Default
    private String status = "APPLIED";
}
