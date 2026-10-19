/*
 * 健澜科技 jlmedaios - 科研数据集实体
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

import java.time.LocalDateTime;

/**
 * 科研数据集实体。
 *
 * <p>科研数据集，脱敏视图</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "research_dataset")
public class ResearchDataset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_code")
    private String projectCode;

    @Column(name = "dataset_name")
    private String datasetName;

    @Column(name = "data_source")
    private String dataSource;

    @Column(name = "record_count")
    private Integer recordCount;

    @Column(name = "access_level")
    private String accessLevel;

    @Column(name = "last_updated")
    @Builder.Default
    private LocalDateTime lastUpdated = LocalDateTime.now();
}
