/*
 * 健澜科技 jlmedaios - API 契约 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_contract.service;

import com.jlmedaios.monolith.api_contract.entity.ApiContract;
import com.jlmedaios.monolith.api_contract.repository.ApiContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * API 契约 Service。
 *
 * <p>API 契约主数据；生产接 Swagger/OpenAPI 3.0，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class ApiContractService {

    private final ApiContractRepository apiContractRepository;

    /**
     * 契约列表。
     *
     * @return API 契约列表
     */
    public List<ApiContract> contractList() {
        return apiContractRepository.findAll();
    }

    /**
     * 契约详情。
     *
     * @param contractCode 契约编码
     * @return API 契约
     */
    public ApiContract contractDetail(String contractCode) {
        // P8 性能优化：直接调用 Repository 派生查询
        return apiContractRepository.findByContractCode(contractCode);
    }

    /**
     * 发布契约（status=RELEASED）。
     *
     * @param contractCode 契约编码
     * @return 已发布的 API 契约
     */
    public ApiContract releaseContract(String contractCode) {
        ApiContract contract = contractDetail(contractCode);
        if (contract != null) {
            contract.setStatus("RELEASED");
            return apiContractRepository.save(contract);
        }
        return null;
    }
}
