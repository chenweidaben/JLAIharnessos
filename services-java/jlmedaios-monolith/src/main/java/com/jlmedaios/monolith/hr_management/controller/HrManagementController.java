/*
 * 健澜科技 jlmedaios - 人力资源管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hr_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.hr_management.entity.AttendanceRecord;
import com.jlmedaios.monolith.hr_management.entity.Employee;
import com.jlmedaios.monolith.hr_management.service.HrManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 人力资源管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/hr")
public class HrManagementController {

    private final HrManagementService hrManagementService;

    /**
     * 员工列表。
     *
     * @return Result<List<Employee>>
     */
    @GetMapping("/employees")
    public Result<List<Employee>> employeeList() {
        return Result.ok(hrManagementService.employeeList());
    }

    /**
     * 员工详情。
     *
     * @param no 工号
     * @return Result<Employee>
     */
    @GetMapping("/employee/{no}")
    public Result<Employee> employeeDetail(@PathVariable String no) {
        return hrManagementService.employeeDetail(no)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 调岗。
     *
     * @param no   工号
     * @param body {newDepartment, newPosition}
     * @return Result<Employee>
     */
    @PutMapping("/employee/{no}/transfer")
    public Result<Employee> transfer(@PathVariable String no, @RequestBody Map<String, Object> body) {
        return hrManagementService.transfer(
                no,
                String.valueOf(body.get("newDepartment")),
                String.valueOf(body.get("newPosition"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 考勤记录。
     *
     * @param employeeNo 工号
     * @return Result<List<AttendanceRecord>>
     */
    @GetMapping("/attendance")
    public Result<List<AttendanceRecord>> attendanceList(@RequestParam String employeeNo) {
        return Result.ok(hrManagementService.attendanceList(employeeNo));
    }
}
