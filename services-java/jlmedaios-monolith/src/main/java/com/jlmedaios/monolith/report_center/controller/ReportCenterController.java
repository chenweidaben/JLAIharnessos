/*
 * 健澜科技 jlmedaios - 报表中心 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.report_center.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.report_center.entity.ReportDefinition;
import com.jlmedaios.monolith.report_center.service.ReportCenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 报表中心 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/report")
public class ReportCenterController {

    private final ReportCenterService reportCenterService;

    /**
     * 报表列表。
     *
     * @return Result<List<ReportDefinition>>
     */
    @GetMapping("/list")
    public Result<List<ReportDefinition>> reportList() {
        return Result.ok(reportCenterService.reportList());
    }

    /**
     * 生成报表。
     *
     * @param code 报表编码
     * @return Result<Map<String, Object>>
     */
    @PostMapping("/{code}/generate")
    public Result<Map<String, Object>> generate(@PathVariable String code) {
        return Result.ok(reportCenterService.generate(code));
    }

    /**
     * 按类别查询。
     *
     * @param category 报表类别
     * @return Result<List<ReportDefinition>>
     */
    @GetMapping("/category/{category}")
    public Result<List<ReportDefinition>> byCategory(@PathVariable String category) {
        return Result.ok(reportCenterService.byCategory(category));
    }
}
