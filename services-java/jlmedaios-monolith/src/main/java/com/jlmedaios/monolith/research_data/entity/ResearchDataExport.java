/*
 * 健澜科技 jlmedaios - 科研数据导出实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.research_data.entity;

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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 科研数据导出实体。
 *
 * <p>append-only: 科研数据导出记录不可修改，必须脱敏</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "research_data_export")
public class ResearchDataExport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "patient_count")
    private Integer patientCount;

    @Column(name = "export_date")
    private LocalDate exportDate;

    @Column(name = "fields_included")
    private String fieldsIncluded;

    @Column(name = "purpose")
    private String purpose;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
