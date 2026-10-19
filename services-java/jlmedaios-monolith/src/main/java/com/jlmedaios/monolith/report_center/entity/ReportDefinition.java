/*
 * 健澜科技 jlmedaios - 报表定义实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.report_center.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 报表定义实体。
 *
 * <p>报表定义主数据；生产接 BI 工具（帆软/Tableau），H2 下 mock 数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "report_definition")
public class ReportDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_code")
    private String reportCode;

    @Column(name = "report_name")
    private String reportName;

    @Column(name = "report_category")
    private String reportCategory;

    @Column(name = "sql_template", columnDefinition = "TEXT")
    private String sqlTemplate;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJSON;
}
