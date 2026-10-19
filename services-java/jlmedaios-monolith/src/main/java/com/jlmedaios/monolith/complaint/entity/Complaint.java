/*
 * 健澜科技 jlmedaios - 投诉实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.complaint.entity;

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
 * 投诉实体。
 *
 * <p>append-only: 投诉记录不可修改，处理过程留痕</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "complaint")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_no")
    private String complaintNo;

    // @Sensitive 患者姓名，脱敏存储
    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "dept_code")
    private String deptCode;

    // @Sensitive 员工工号，脱敏存储
    @Column(name = "staff_id")
    private String staffId;

    @Column(name = "complaint_type")
    private String complaintType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "received_date")
    private LocalDate receivedDate;

    // @Sensitive 处理人工号，脱敏存储
    @Column(name = "handler_id")
    private String handlerId;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "resolution", columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // updatedAt: 仅审计用，业务逻辑禁止修改
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
