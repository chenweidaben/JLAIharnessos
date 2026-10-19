/*
 * 健澜科技 jlmedaios - 人力资源管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hr_management.service;

import com.jlmedaios.monolith.hr_management.entity.AttendanceRecord;
import com.jlmedaios.monolith.hr_management.entity.Employee;
import com.jlmedaios.monolith.hr_management.repository.AttendanceRecordRepository;
import com.jlmedaios.monolith.hr_management.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 人力资源管理 Service。
 *
 * <p>append-only: 考勤记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class HrManagementService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    /**
     * 员工列表。
     *
     * @return 员工列表
     */
    public List<Employee> employeeList() {
        return employeeRepository.findAll();
    }

    /**
     * 员工详情。
     *
     * @param employeeNo 工号
     * @return 员工
     */
    public Optional<Employee> employeeDetail(String employeeNo) {
        return employeeRepository.findByEmployeeNo(employeeNo);
    }

    /**
     * 调岗。
     *
     * @param employeeNo      工号
     * @param newDepartment   新科室
     * @param newPosition     新岗位
     * @return 已更新的员工
     */
    public Optional<Employee> transfer(String employeeNo, String newDepartment, String newPosition) {
        Optional<Employee> opt = employeeRepository.findByEmployeeNo(employeeNo);
        if (opt.isPresent()) {
            Employee employee = opt.get();
            employee.setDepartment(newDepartment);
            employee.setPosition(newPosition);
            employeeRepository.save(employee);
        }
        return opt;
    }

    /**
     * 考勤记录。
     *
     * @param employeeNo 工号
     * @return 考勤记录列表
     */
    public List<AttendanceRecord> attendanceList(String employeeNo) {
        return attendanceRecordRepository.findByEmployeeNo(employeeNo);
    }
}
