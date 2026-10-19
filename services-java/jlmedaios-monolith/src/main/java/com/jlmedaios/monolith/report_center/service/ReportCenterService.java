/*
 * 健澜科技 jlmedaios - 报表中心 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.report_center.service;

import com.jlmedaios.monolith.report_center.entity.ReportDefinition;
import com.jlmedaios.monolith.report_center.repository.ReportDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 报表中心 Service。
 *
 * <p>报表定义主数据；生产接 BI 工具（帆软/Tableau），H2 下 mock 数据</p>
 */
@Service
@RequiredArgsConstructor
public class ReportCenterService {

    private final ReportDefinitionRepository reportDefinitionRepository;

    /**
     * 报表列表。
     *
     * @return 报表定义列表
     */
    public List<ReportDefinition> reportList() {
        return reportDefinitionRepository.findAll();
    }

    /**
     * 生成报表（mock 返回数据行）。
     *
     * @param reportCode 报表编码
     * @return 报表数据
     */
    public Map<String, Object> generate(String reportCode) {
        Map<String, Object> result = new HashMap<>();
        result.put("reportCode", reportCode);
        result.put("generatedAt", "2026-10-19 10:00:00");

        List<Map<String, Object>> rows = new ArrayList<>();
        Map<String, Object> row1 = new HashMap<>();
        row1.put("dept", "心内科");
        row1.put("outpatient", 5230);
        row1.put("inpatient", 186);
        rows.add(row1);

        Map<String, Object> row2 = new HashMap<>();
        row2.put("dept", "普外科");
        row2.put("outpatient", 3120);
        row2.put("inpatient", 142);
        rows.add(row2);

        result.put("rows", rows);
        return result;
    }

    /**
     * 按类别查询。
     *
     * @param reportCategory 报表类别
     * @return 报表定义列表
     */
    public List<ReportDefinition> byCategory(String reportCategory) {
        return reportDefinitionRepository.findByReportCategory(reportCategory);
    }
}
