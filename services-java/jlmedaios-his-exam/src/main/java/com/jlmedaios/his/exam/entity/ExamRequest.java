/*
 * 健澜科技 jlmedaios - 检查申请实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.exam.entity;

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

import java.time.LocalDateTime;

/**
 * 检查申请实体。
 * status 默认 "REQUESTED"，取值 REQUESTED/SCHEDULED/COMPLETED；resultText/scheduleTime 可空。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "exam_request")
public class ExamRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "exam_type")
    private String examType;

    @Column(name = "status")
    @Builder.Default
    private String status = "REQUESTED";

    @Column(name = "result_text")
    private String resultText;

    @Column(name = "schedule_time")
    private LocalDateTime scheduleTime;
}
