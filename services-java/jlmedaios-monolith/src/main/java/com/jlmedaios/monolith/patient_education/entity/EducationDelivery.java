/*
 * 健澜科技 jlmedaios - 教育材料推送记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_education.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 教育材料推送记录实体。
 *
 * <p>append-only: 教育材料推送记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "education_delivery")
public class EducationDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_code")
    private String materialCode;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "encounter_id")
    private Long encounterId;

    @Column(name = "delivered_time")
    @Builder.Default
    private LocalDateTime deliveredTime = LocalDateTime.now();

    @Column(name = "read_status")
    @Builder.Default
    private String readStatus = "UNREAD";

    @Column(name = "completion_rate")
    private BigDecimal completionRate;
}
