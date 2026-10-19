/*
 * 健澜科技 jlmedaios - 公共卫生上报实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.public_health_report.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 公共卫生上报实体。
 *
 * <p>append-only: 公共卫生上报记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "public_health_report")
public class PublicHealthReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_no")
    private String reportNo;

    @Column(name = "report_type")
    private String reportType;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "disease_code")
    private String diseaseCode;

    @Column(name = "report_date")
    @Builder.Default
    private LocalDate reportDate = LocalDate.now();

    @Column(name = "receiving_authority")
    private String receivingAuthority;

    @Column(name = "status")
    @Builder.Default
    private String status = "SUBMITTED";
}
