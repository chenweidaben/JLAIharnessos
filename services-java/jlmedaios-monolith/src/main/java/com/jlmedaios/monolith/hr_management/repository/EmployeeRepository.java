/*
 * 健澜科技 jlmedaios - 员工 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hr_management.repository;

import com.jlmedaios.monolith.hr_management.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 员工 Repository。
 */
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    /**
     * 按科室查询员工。
     *
     * @param department 科室
     * @return 员工列表
     */
    List<Employee> findByDepartment(String department);

    /**
     * 按状态查询员工。
     *
     * @param status 状态
     * @return 员工列表
     */
    List<Employee> findByStatus(String status);

    /**
     * 按工号查询员工。
     *
     * @param employeeNo 工号
     * @return 员工
     */
    Optional<Employee> findByEmployeeNo(String employeeNo);
}
