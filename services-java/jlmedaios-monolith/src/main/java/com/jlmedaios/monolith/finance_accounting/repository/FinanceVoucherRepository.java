/*
 * 健澜科技 jlmedaios - 财务凭证 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.finance_accounting.repository;

import com.jlmedaios.monolith.finance_accounting.entity.FinanceVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 财务凭证 Repository。
 */
@Repository
public interface FinanceVoucherRepository extends JpaRepository<FinanceVoucher, Long> {

    /**
     * 按状态查询凭证。
     *
     * @param status 状态
     * @return 凭证列表
     */
    List<FinanceVoucher> findByStatus(String status);

    /**
     * 按科室查询凭证。
     *
     * @param department 科室
     * @return 凭证列表
     */
    List<FinanceVoucher> findByDepartment(String department);
}
