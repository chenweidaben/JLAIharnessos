/*
 * 健澜科技 jlmedaios - 影像报告实体
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
 * 影像报告实体。
 *
 * <p>append-only: 影像报告不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "radiology_report")
public class RadiologyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no")
    private String orderNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "modality")
    private String modality;

    @Column(name = "impression", columnDefinition = "TEXT")
    private String impression;

    @Column(name = "findings", columnDefinition = "TEXT")
    private String findings;

    @Column(name = "conclusion", columnDefinition = "TEXT")
    private String conclusion;

    @Column(name = "report_time")
    @Builder.Default
    private LocalDateTime reportTime = LocalDateTime.now();

    // @Sensitive 报告医生工号，脱敏存储
    @Column(name = "report_doctor")
    private String reportDoctor;

    // @Sensitive 审核医生工号，脱敏存储
    @Column(name = "review_doctor")
    private String reviewDoctor;
}
