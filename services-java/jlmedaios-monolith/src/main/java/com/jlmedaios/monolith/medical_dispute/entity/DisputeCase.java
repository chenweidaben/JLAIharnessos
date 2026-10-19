/*
 * 健澜科技 jlmedaios - 医疗纠纷实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_dispute.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 医疗纠纷实体。
 *
 * <p>append-only: 医疗纠纷记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "dispute_case")
public class DisputeCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_no")
    private String caseNo;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "department")
    private String department;

    @Column(name = "dispute_type")
    private String disputeType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "report_date")
    @Builder.Default
    private LocalDate reportDate = LocalDate.now();

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "compensation_amount")
    private BigDecimal compensationAmount;
}
