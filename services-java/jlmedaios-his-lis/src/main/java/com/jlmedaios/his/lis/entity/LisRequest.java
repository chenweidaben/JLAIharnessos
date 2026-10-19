/*
 * 健澜科技 jlmedaios - 检验申请实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.lis.entity;

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

/**
 * 检验申请实体。
 * status 默认 "REQUESTED"，取值 REQUESTED/COMPLETED；resultValue 可空。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "lis_request")
public class LisRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "test_code")
    private String testCode;

    @Column(name = "test_name")
    private String testName;

    @Column(name = "status")
    @Builder.Default
    private String status = "REQUESTED";

    @Column(name = "result_value")
    private String resultValue;
}
