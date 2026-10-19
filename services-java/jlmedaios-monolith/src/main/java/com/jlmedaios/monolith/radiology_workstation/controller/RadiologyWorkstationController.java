/*
 * 健澜科技 jlmedaios - 影像工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.radiology_workstation.entity.RadiologyWorkItem;
import com.jlmedaios.monolith.radiology_workstation.service.RadiologyWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 影像工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/radiology")
public class RadiologyWorkstationController {

    private final RadiologyWorkstationService radiologyWorkstationService;

    /**
     * 待检查列表。
     *
     * @return Result<List<RadiologyWorkItem>>
     */
    @GetMapping("/pending")
    public Result<List<RadiologyWorkItem>> pendingStudies() {
        return Result.ok(radiologyWorkstationService.pendingStudies());
    }

    /**
     * 开始检查。
     *
     * @param workItemNo 工作项编号
     * @return Result<RadiologyWorkItem>
     */
    @PutMapping("/{workItemNo}/start")
    public Result<RadiologyWorkItem> startStudy(@PathVariable String workItemNo) {
        return Result.ok(radiologyWorkstationService.startStudy(workItemNo));
    }

    /**
     * 书写报告。
     *
     * @param workItemNo   工作项编号
     * @param body         {reportContent}
     * @return Result<RadiologyWorkItem>
     */
    @PutMapping("/{workItemNo}/report")
    public Result<RadiologyWorkItem> writeReport(@PathVariable String workItemNo,
                                                  @RequestBody Map<String, Object> body) {
        return Result.ok(radiologyWorkstationService.writeReport(workItemNo,
                String.valueOf(body.get("reportContent"))));
    }

    /**
     * 审核发布。
     *
     * @param workItemNo 工作项编号
     * @return Result<RadiologyWorkItem>
     */
    @PutMapping("/{workItemNo}/review")
    public Result<RadiologyWorkItem> reviewPublish(@PathVariable String workItemNo) {
        return Result.ok(radiologyWorkstationService.reviewPublish(workItemNo));
    }
}
