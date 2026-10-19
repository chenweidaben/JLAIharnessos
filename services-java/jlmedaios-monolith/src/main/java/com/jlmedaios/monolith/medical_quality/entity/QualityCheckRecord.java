/*
 * 健澜科技 jlmedaios - 质量检查记录实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_quality.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 质量检查记录实体。
 *
 * <p>append-only: 质量检查记录不可修改</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quality_check_record")
public class QualityCheckRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "check_no")
    private String checkNo;

    @Column(name = "department")
    private String department;

    @Column(name = "check_date")
    private LocalDate checkDate;

    @Column(name = "checker")
    private String checker;

    @Column(name = "findings", columnDefinition = "TEXT")
    private String findings;

    @Column(name = "conclusion", columnDefinition = "TEXT")
    private String conclusion;
}
