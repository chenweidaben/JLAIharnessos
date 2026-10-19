/*
 * 健澜科技 jlmedaios - 部署配置实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.deployment_config.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 部署配置实体。
 *
 * <p>部署配置主数据；生产接 k3s/ArgoCD，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "deployment_config")
public class DeploymentConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_name")
    private String configName;

    @Column(name = "environment")
    private String environment;

    @Column(name = "replicas")
    private Integer replicas;

    @Column(name = "cpu_request")
    private String cpuRequest;

    @Column(name = "memory_request")
    private String memoryRequest;

    @Column(name = "storage_class")
    private String storageClass;

    @Column(name = "image_tag")
    private String imageTag;

    @Column(name = "status")
    @Builder.Default
    private String status = "DEPLOYED";
}
