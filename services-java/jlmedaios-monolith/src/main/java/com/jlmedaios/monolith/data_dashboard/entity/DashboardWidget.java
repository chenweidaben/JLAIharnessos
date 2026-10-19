/*
 * 健澜科技 jlmedaios - 看板部件实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_dashboard.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 看板部件实体。
 *
 * <p>看板部件主数据；生产接 ClickHouse/Doris，H2 下 mock 数据</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "dashboard_widget")
public class DashboardWidget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "widget_code")
    private String widgetCode;

    @Column(name = "widget_name")
    private String widgetName;

    @Column(name = "widget_type")
    private String widgetType;

    @Column(name = "data_source")
    private String dataSource;

    @Column(name = "dept_code")
    private String deptCode;

    @Column(name = "refresh_interval")
    private Integer refreshInterval;
}
