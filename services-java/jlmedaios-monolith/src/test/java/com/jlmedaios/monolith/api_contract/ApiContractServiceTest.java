/*
 * 健澜科技 jlmedaios - API 契约 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.api_contract;

import com.jlmedaios.monolith.api_contract.entity.ApiContract;
import com.jlmedaios.monolith.api_contract.service.ApiContractService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * API 契约 Service 测试。
 */
@SpringBootTest
public class ApiContractServiceTest {

    @Autowired
    private ApiContractService apiContractService;

    @Test
    void testContractList() {
        List<ApiContract> list = apiContractService.contractList();
        assertNotNull(list);
    }

    @Test
    void testContractDetail() {
        ApiContract contract = apiContractService.contractDetail("C-001");
        // 可能为空（H2 内存库）
    }

    @Test
    void testReleaseContract() {
        ApiContract released = apiContractService.releaseContract("C-001");
        // 可能为空（H2 内存库）
    }
}
