/*
 * 健澜科技 jlmedaios - 医嘱实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.orders.entity;

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
 * 医嘱实体。
 * status 默认 "PENDING"，取值 PENDING/EXECUTED/CANCELLED。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "orders")
public class Orders {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id")
    private Long patientId;

    @Column(name = "order_type")
    private String orderType;

    @Column(name = "content")
    private String content;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";
}
