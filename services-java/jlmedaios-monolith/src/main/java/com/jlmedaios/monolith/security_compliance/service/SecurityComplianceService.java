/*
 * 健澜科技 jlmedaios - 等保合规 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security_compliance.service;

import com.jlmedaios.monolith.security_compliance.entity.SecurityControl;
import com.jlmedaios.monolith.security_compliance.repository.SecurityControlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 等保合规 Service。
 *
 * <p>等保控制点主数据；对应网络安全等级保护三级要求，定期巡检</p>
 */
@Service
@RequiredArgsConstructor
public class SecurityComplianceService {

    private final SecurityControlRepository securityControlRepository;

    /**
     * 等保控制点列表。
     *
     * @return 等保控制点列表
     */
    public List<SecurityControl> controlList() {
        return securityControlRepository.findAll();
    }

    /**
     * 按类别查询。
     *
     * @param controlCategory 类别
     * @return 等保控制点列表
     */
    public List<SecurityControl> byCategory(String controlCategory) {
        return securityControlRepository.findByControlCategory(controlCategory);
    }

    /**
     * 更新检查结果 + lastCheckTime。
     *
     * @param controlCode 控制点编码
     * @param status      检查结果
     * @return 已更新的等保控制点
     */
    public SecurityControl updateControl(String controlCode, String status) {
        List<SecurityControl> controls = securityControlRepository.findAll();
        for (SecurityControl control : controls) {
            if (controlCode.equals(control.getControlCode())) {
                control.setStatus(status);
                control.setLastCheckTime(LocalDateTime.now());
                return securityControlRepository.save(control);
            }
        }
        return null;
    }
}
