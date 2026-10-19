/*
 * 健澜科技 jlmedaios - 床位管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.bed_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.bed_management.entity.Bed;
import com.jlmedaios.monolith.bed_management.service.BedManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 床位管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/bed")
public class BedManagementController {

    private final BedManagementService bedManagementService;

    /**
     * 病区床位列表。
     *
     * @param wardCode 病区编码
     * @return Result<List<Bed>>
     */
    @GetMapping("/ward/{wardCode}")
    public Result<List<Bed>> wardBeds(@PathVariable String wardCode) {
        return Result.ok(bedManagementService.wardBeds(wardCode));
    }

    /**
     * 占用床位。
     *
     * @param bedNo 床号
     * @param body {patientId}
     * @return Result<Bed>
     */
    @PutMapping("/{bedNo}/occupy")
    public Result<Bed> occupy(@PathVariable String bedNo, @RequestBody Map<String, Object> body) {
        return bedManagementService.occupy(bedNo, Long.valueOf(String.valueOf(body.get("patientId"))))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 释放床位。
     *
     * @param bedNo 床号
     * @return Result<Bed>
     */
    @PutMapping("/{bedNo}/release")
    public Result<Bed> release(@PathVariable String bedNo) {
        return bedManagementService.release(bedNo)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 全院可用床位查询。
     *
     * @return Result<List<Bed>>
     */
    @GetMapping("/available")
    public Result<List<Bed>> availableBeds() {
        return Result.ok(bedManagementService.availableBeds());
    }
}
