/*
 * 健澜科技 jlmedaios - 患者主索引实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.empi.entity;

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
 * 患者主索引实体。
 * createTime 默认当前时间。
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "patient")
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long empiId;

    @Column(name = "name")
    private String name;

    @Column(name = "gender")
    private String gender;

    @Column(name = "id_card")
    private String idCard;

    @Column(name = "phone")
    private String phone;

    @Column(name = "create_time")
    @Builder.Default
    private LocalDateTime createTime = LocalDateTime.now();
}
