/*
 * 健澜科技 jlmedaios - 等保合规 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security_compliance.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.security_compliance.entity.SecurityControl;
import com.jlmedaios.monolith.security_compliance.service.SecurityComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 等保合规 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/security")
public class SecurityComplianceController {

    private final SecurityComplianceService securityComplianceService;

    /**
     * 等保控制点列表。
     *
     * @return Result<List<SecurityControl>>
     */
    @GetMapping("/controls")
    public Result<List<SecurityControl>> controlList() {
        return Result.ok(securityComplianceService.controlList());
    }

    /**
     * 按类别查询。
     *
     * @param category 类别
     * @return Result<List<SecurityControl>>
     */
    @GetMapping("/category/{category}")
    public Result<List<SecurityControl>> byCategory(@PathVariable String category) {
        return Result.ok(securityComplianceService.byCategory(category));
    }

    /**
     * 更新检查结果。
     *
     * @param code 控制点编码
     * @param body {status}
     * @return Result<SecurityControl>
     */
    @PutMapping("/control/{code}/update")
    public Result<SecurityControl> updateControl(@PathVariable String code,
                                                    @RequestBody Map<String, Object> body) {
        return Result.ok(securityComplianceService.updateControl(code,
                String.valueOf(body.get("status"))));
    }
}
