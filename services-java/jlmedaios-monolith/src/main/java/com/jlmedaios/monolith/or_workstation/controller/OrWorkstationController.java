/*
 * 健澜科技 jlmedaios - 手术工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.or_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.or_workstation.entity.ORWorkItem;
import com.jlmedaios.monolith.or_workstation.service.OrWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 手术工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/or")
public class OrWorkstationController {

    private final OrWorkstationService orWorkstationService;

    /**
     * 今日手术安排。
     *
     * @return Result<List<ORWorkItem>>
     */
    @GetMapping("/today")
    public Result<List<ORWorkItem>> todaySchedule() {
        return Result.ok(orWorkstationService.todaySchedule());
    }

    /**
     * 开始手术。
     *
     * @param workItemNo 工作项编号
     * @return Result<ORWorkItem>
     */
    @PutMapping("/{workItemNo}/start")
    public Result<ORWorkItem> startSurgery(@PathVariable String workItemNo) {
        return Result.ok(orWorkstationService.startSurgery(workItemNo));
    }

    /**
     * 结束手术。
     *
     * @param workItemNo 工作项编号
     * @return Result<ORWorkItem>
     */
    @PutMapping("/{workItemNo}/end")
    public Result<ORWorkItem> endSurgery(@PathVariable String workItemNo) {
        return Result.ok(orWorkstationService.endSurgery(workItemNo));
    }

    /**
     * 患者手术历史。
     *
     * @param patientId 患者 ID
     * @return Result<List<ORWorkItem>>
     */
    @GetMapping("/history/{patientId}")
    public Result<List<ORWorkItem>> surgeryHistory(@PathVariable Long patientId) {
        return Result.ok(orWorkstationService.surgeryHistory(patientId));
    }
}
