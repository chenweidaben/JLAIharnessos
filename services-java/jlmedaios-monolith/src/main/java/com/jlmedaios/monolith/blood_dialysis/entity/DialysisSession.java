/*
 * 健澜科技 jlmedaios - 透析记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_dialysis.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 透析记录实体。
 *
 * <p>append-only: 透析记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "dialysis_session")
public class DialysisSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_no")
    private String sessionNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "schedule_date")
    private LocalDate scheduleDate;

    @Column(name = "dialysis_type")
    private String dialysisType;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "dry_weight")
    private BigDecimal dryWeight;

    @Column(name = "actual_weight")
    private BigDecimal actualWeight;

    @Column(name = "ultrafiltration")
    private BigDecimal ultrafiltration;

    @Column(name = "pre_weight")
    private BigDecimal preWeight;

    @Column(name = "post_weight")
    private BigDecimal postWeight;

    @Column(name = "status")
    @Builder.Default
    private String status = "SCHEDULED";
}
