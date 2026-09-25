# Open-Source HIS/EMR and Cloud-Native Healthcare Platform Research (English)

> Prepared by: Hangzhou Jianlan Technology (杭州健澜科技)
> Product codename: **jlmedaios** (vision: **the Android of healthcare AI**)
> Purpose: Stage 1 "Design First" open-source benchmarking to inform jlmedaios domain modeling, architecture choices, and license strategy.
> Method: Only official project sites, official documentation, official license pages, and verifiable public sources are used; every key fact carries a source URL; items that cannot be verified are explicitly marked "not verified" — no fabricated version numbers, stacks, or licenses.
> Baseline: Stage 0 three-party baseline HEAD `aa95182` (master).

## Table of Contents

- [1. Scope and Summary](#1-scope-and-summary)
- [2. Mature HIS/EMR Systems](#2-mature-hisemr-systems)
  - [2.1 OpenMRS](#21-openmrs)
  - [2.2 Bahmni](#22-bahmni)
  - [2.3 OpenEMR](#23-openemr)
  - [2.4 HospitalRun](#24-hospitalrun)
  - [2.5 GNU Health](#25-gnu-health)
  - [2.6 Open Hospital](#26-open-hospital)
- [3. Cloud-Native / FHIR / openEHR Platforms](#3-cloud-native--fhir--openehr-platforms)
  - [3.1 Medplum](#31-medplum)
  - [3.2 Aidbox](#32-aidbox)
  - [3.3 HAPI FHIR](#33-hapi-fhir)
  - [3.4 EHRbase (openEHR)](#34-ehrbase-openehr)
  - [3.5 LinuxForHealth / IPF](#35-linuxforhealth--ipf)
- [4. Cloud-Native Engineering Paradigms](#4-cloud-native-engineering-paradigms)
  - [4.1 Service Mesh](#41-service-mesh)
  - [4.2 Kafka Event Streaming](#42-kafka-event-streaming)
  - [4.3 Observability](#43-observability)
  - [4.4 Multi-tenancy](#44-multi-tenancy)
- [5. Consolidated Comparison Tables](#5-consolidated-comparison-tables)
- [6. License Compatibility and Copyleft Analysis](#6-license-compatibility-and-copyleft-analysis)
- [7. Adoption Recommendations for jlmedaios](#7-adoption-recommendations-for-jlmedaios)
- [8. Not-Verified and Open Items](#8-not-verified-and-open-items)

---

## 1. Scope and Summary

This research covers three groups:

1. **Mature HIS/EMR**: OpenMRS, Bahmni, OpenEMR, HospitalRun, GNU Health, Open Hospital;
2. **Cloud-native / FHIR / openEHR**: Medplum, Aidbox, HAPI FHIR, EHRbase, LinuxForHealth/IPF;
3. **Cloud-native engineering paradigms**: service mesh, Kafka event streaming, observability, multi-tenancy.

**Bottom line:**

- Mature HIS/EMR systems are mostly Java/PHP/Python monoliths or modular monoliths aimed at low-resource and primary-care settings, **predominantly under strong GPL-family copyleft (GPL/AGPL)**; only OpenMRS (MPL-2.0) and HospitalRun (MIT) are friendly to proprietary/closed-source use;
- In the cloud-native FHIR camp, **Medplum (Apache-2.0, TypeScript) and HAPI FHIR (Apache-2.0, Java) offer the friendliest licenses and the most modern engineering paradigm**, and are jlmedaios's primary benchmarks; **Aidbox is a closed-source commercial product** (only a free development license, no PHI, ≤5 GB) and can inform design only — no code reuse;
- In the openEHR camp, **EHRbase (Apache-2.0)** is the most mature open-source openEHR clinical data repository and serves as the reference for the openEHR side of the dual-track standard;
- The integration engine **IPF (Apache-2.0, based on Apache Camel)** is the reference for HL7 v2/CDA/FHIR integration pipelines;
- Recommended cloud-native foundation: **Istio (or Linkerd) service mesh + Kafka event streaming + OpenTelemetry/Prometheus/Grafana observability + a multi-tenancy model of "shared database with row-level `tenant_id` isolation, campuses as scope sub-levels."**

---

## 2. Mature HIS/EMR Systems

### 2.1 OpenMRS

| Dimension | Content |
|---|---|
| Positioning | One of the most widely deployed open-source medical-record platforms; started in 2004 (Partners In Health and the Regenstrief Institute); aimed at public-health programs, NGOs, and multi-site primary care; positioned as a *platform*, not a turnkey HIS. |
| Architecture | Modular monolith (core + pluggable OMOD modules); web application with a REST Web Services module; the new OpenMRS 3 (O3) frontend is a stateless SPA, with all state in the backend. |
| Tech stack | Java 11+, Spring Framework, Hibernate ORM, Maven; MySQL 8+ or PostgreSQL; Liquibase for DB changes; OMOD deployable plugins; O3 frontend based on React (micro-frontend ESM + Import Map). |
| License | **Mozilla Public License 2.0 (MPL-2.0)**, file-level weak copyleft; migrated from the OpenMRS Public License to MPL 2.0 in 2013. |
| Reusable assets | (1) The **Concept Dictionary** model — every observation, diagnosis, and item is abstracted as a Concept, giving strong terminology neutrality; (2) the Patient–Encounter–Obs core model; (3) the module loading mechanism and ecosystem; (4) O3 micro-frontend assembly and extension points. |
| Limits | (1) Aimed at primary/public care — **lacks the inpatient closed-loop orders, billing, pharmacy, and DRG/DIP modules a large Chinese tertiary (Class A) hospital needs**; (2) monolith with synchronous calls, not directly multi-campus/high-concurrency; (3) heavy localization of UI/workflows; (4) MPL requires open-sourcing modified original MPL files — needs file-level compliance. |
| Sources | License migration: https://openmrs.org/openmrs-licensing-moves-to-mplv2/ ; stack (Java/Spring/Hibernate/MySQL-PG/OMOD/O3): https://answers.openmrs.org/t/small-project-idea-to-make-openmrs-easier-for-ai-tools/47484 ; O3 docs: https://o3-docs.openmrs.org/en-US/docs/introduction ; core repos/download: https://openmrs.org/download/ |

### 2.2 Bahmni

| Dimension | Content |
|---|---|
| Positioning | Open-source EMR + HIS (HMIS) started by Thoughtworks (2012) for low-resource district hospitals; forms an integrated solution by weaving together existing open-source products; the site reports deployments in 50+ countries and 500+ sites with ~20M+ patient records; listed as a Digital Public Good (DPG). |
| Architecture | **Distribution/integration architecture**: combines, enhances, and delivers multiple independent open-source products across registration, clinical, lab, imaging, and billing; offers Bahmni Lite for clinics/small hospitals. |
| Tech stack | Components: OpenMRS (EMR/patient management, Java), OpenELIS (laboratory LIS, Java), OpenERP/Odoo (inventory/billing/finance, Python), dcm4chee (DICOM/PACS, Java), JasperReports (reporting); legacy AngularJS frontend; Docker/RPM deployment; integrates with the Snowstorm terminology server for SNOMED CT. |
| License | **Multi-license combination (per the official license table)**: Bahmni Core **AGPL-3.0**; OpenMRS **MPL-2.0**; OpenELIS **AGPL-3.0**; Odoo Community **LGPL-3.0** from v9 (AGPL-3.0 earlier); JasperReports Community **LGPL**; dcm4chee under an MPL/GPL/LGPL mix. |
| Reusable assets | (1) The distribution methodology and integration-boundary design of assembling a HIS from best-of-breed open-source components; (2) end-to-end clinical–lab–imaging–billing orchestration; (3) on-premises, internet-independent deployment; (4) the SNOMED CT terminology approach via Snowstorm. |
| Limits | (1) **AGPL-3.0 strong network copyleft**: SaaS/cloud delivery requires open-sourcing modifications — unfriendly to closed-source commercial use; (2) many components make operations/upgrades complex; (3) low-resource focus does not meet Chinese inpatient/insurance/EMR-grading requirements; (4) the legacy AngularJS frontend is dated. |
| Sources | Official license table: https://www.bahmni.org/license ; components/positioning: https://www.bahmni.org/intro2 ; license FAQ (cloud hosting requires open source): https://www.bahmni.org/license-faq ; project/repo index: https://bahmni.github.io/ |

### 2.3 OpenEMR

| Dimension | Content |
|---|---|
| Positioning | Free open-source EHR + practice management application with EHR, scheduling, electronic billing, internationalization, and community support; OpenEMR 8.0.0 is ONC certified; widely installed in North American primary-care clinics. |
| Architecture | Classic LAMP-style web monolith; runs on Windows/Linux/macOS; the community also provides Kubernetes deployment. |
| Tech stack | PHP (8.2–8.5, 8.4 recommended); MariaDB/MySQL (MariaDB 10.6–11.8); Apache or nginx + PHP-FPM; ADOdb database abstraction; the community K8s option uses Redis for sessions. |
| License | **GNU GPL (General Public License)**; officially "Released under the GNU General Public License." The exact GPL version was not verified verbatim against the official LICENSE file this round (**marked: GPL version not verified** — v2/v3 not asserted). |
| Reusable assets | (1) Mature clinic closed loop: scheduling, encounters, prescriptions, billing, electronic claims (HIPAA ASC X12 5010), lab integration; (2) clinical decision rules engine and CMS reporting; (3) the C-CDA/CQM implementation required for ONC certification; (4) a multilingual/i18n framework. |
| Limits | (1) **GPL strong copyleft — derivative works must be open-sourced**; code cannot be copied into a closed-source jlmedaios part; (2) PHP monolith, a different stack from jlmedaios (TypeScript/cloud-native); (3) North American outpatient/billing focus, lacking Chinese inpatient/insurance/grading capabilities. |
| Sources | Features & GPL: https://www.open-emr.org/wiki/index.php/OpenEMR_Features ; release stack (PHP/MariaDB): https://www.open-emr.org/wiki/index.php/Release_Features ; system architecture: https://www.open-emr.org/wiki/index.php/OpenEMR_System_Architecture ; wiki home: https://www.open-emr.org/wiki/index.php/OpenEMR_Wiki_Home_Page |

### 2.4 HospitalRun

| Dimension | Content |
|---|---|
| Positioning | Open-source HIS for developing-world hospitals; its hallmark is **offline-first** — works without connectivity and syncs when it returns; suited to remote clinics and disaster response. |
| Architecture | v2 is a **monorepo** consolidating the former frontend/server/components repos; offline-first with local data sync. |
| Tech stack | v2: **React (frontend) + Node.js (server) + PouchDB/CouchDB (storage & sync)**; the v1 legacy frontend was Ember.js + PouchDB with a Node + CouchDB backend. |
| License | **MIT** (the v2 monorepo states "Released under the MIT license"; the FAQ also confirms MIT). Note: some third-party/legacy npm packages (e.g. `@ehealth-ci/hospitalrun`) show GPL-3.0 — those are third-party packages, not official v2. |
| Reusable assets | (1) The **offline-first architecture and PouchDB/CouchDB sync** (multi-client conflict resolution, resume after disconnect); (2) product design for low-resource/weak-network settings; (3) MIT license allows free code reuse. |
| Limits | (1) The project underwent a major Ember→React rewrite and **some legacy features are not yet complete in v2 with variable development pace** — feature-by-feature verification is required before production; (2) aimed at small clinics, without tertiary inpatient/insurance/high-concurrency capability; (3) the CouchDB document store differs from jlmedaios's relational + lakehouse route. |
| Sources | Official site: https://hospitalrun.io/ ; v2 monorepo (React/Node/PouchDB-CouchDB, MIT, verifiable mirror): https://gitee.com/mirrors_HospitalRun/hospitalrun ; FAQ (MIT, offline): https://hospitalrun.io/faq ; stack history (Ember/PouchDB, Node/CouchDB): https://hospitalrun.io/blog/why-hospitalrun/ |

### 2.5 GNU Health

| Dimension | Content |
|---|---|
| Positioning | Free-software project by the non-profit NGO GNU Solidario; an official GNU package since 2011; provides HMIS (hospital management), EMR, HIS, and public-health/social-medicine capabilities, including lab management (Occhiolino), a personal health record (MyGNUHealth), bioinformatics/medical genetics, and the Thalamus federated health network. |
| Architecture | Built on the **Tryton** application platform (ERP-style three tiers: client – trytond server – database) with modular business packages; embeddable deployment (including single-board devices). |
| Tech stack | **Python + Tryton (trytond) framework + PostgreSQL**; clients include a native GTK client and the SAO web client; Thalamus for federated networks; MyGNUHealth as the PHR. |
| License | **GPL-3.0-or-later** (the official FAQ and PyPI both state GPL v3 or later). |
| Reusable assets | (1) Very broad domain coverage: social medicine, demographics, inpatient, lab, public health, genetics; (2) Tryton modular business modeling with permissions/workflows; (3) the Thalamus federated network and intra/inter-hospital interconnection approach; (4) experience running on low-cost/embedded hardware. |
| Limits | (1) **GPL-3.0 strong copyleft — derivatives must be open-sourced**; code cannot be taken into closed-source parts; (2) the Tryton ecosystem has low penetration and few specialists in China's healthcare industry; (3) public-health/primary focus, lacking Chinese billing/DRG-DIP/grading; (4) not cloud-native and does not directly support horizontal scale-out for high concurrency. |
| Sources | FAQ (GPL v3+, positioning): https://docs.gnuhealth.org/his/appendix/faq.html ; PyPI (GPL v3+): https://pypi.org/project/gnuhealth/ ; components/ecosystem: https://gnuhealth.org/about-us.html ; feature areas: https://docs.gnuhealth.org/his/features.html |

### 2.6 Open Hospital

| Dimension | Content |
|---|---|
| Positioning | Free open-source EHR/HIS developed by Informatici Senza Frontiere (ISF) for developing-world hospitals and health centers; supports internal/external visits, admissions, drug and supply warehousing, lab results, vaccination and birth records; runs without internet. |
| Architecture | **Java desktop application** with two modes: PORTABLE (single-machine) and CLIENT (client/server network, multiple users on one database); newer versions begin to offer a basic REST API (auth, patient queries, admission management), officially marked work-in-progress. |
| Tech stack | Java (**Java Swing desktop UI**); MariaDB/MySQL; bundled JRE; offline operation. |
| License | **GPL-3.0** (the official site and SourceForge both state GPLv3). |
| Reusable assets | (1) The dual "portable + client/server" deployment, suited to rapid rollout and offline settings; (2) practical primary-care modules for drug/supply warehousing, vaccination, and birth records; (3) business processes and forms can inform design (code cannot be copied into closed source). |
| Limits | (1) **Desktop Swing architecture — not web, not cloud-native** — cannot support multi-campus high concurrency; (2) GPL-3.0 strong copyleft; (3) the REST API is still under construction with weak integration capability; (4) developing-world primary focus, not a tertiary setting. |
| Sources | Official site (GPLv3, positioning): https://www.open-hospital.org/ ; admin manual PDF (Java, PORTABLE/CLIENT): https://www.open-hospital.org/wp-content/uploads/2023/02/AdminManual.pdf ; SourceForge (Java Swing/MySQL/GPLv3): https://sourceforge.net/projects/openhospital/ |

---

## 3. Cloud-Native / FHIR / openEHR Platforms

### 3.1 Medplum

| Dimension | Content |
|---|---|
| Positioning | Open-source healthcare **developer platform / "headless EHR"**: FHIR-centered, providing a data store, APIs, authentication, and developer tools to build custom EHRs, patient portals, and clinical apps; offers an AWS managed service and Apache-2.0 self-hosted software; holds compliance certifications such as HITRUST e1. |
| Architecture | Cloud-native, **FHIR-native**: FHIR R4 is both the external standard and the internal data model; includes a data store, TypeScript SDK, React clinical component library, Bots (automation), Subscriptions, and hosted terminology; also provides the **Medplum Agent** (inside the firewall, bridging low-level HL7/MLLP, ASTM, and DICOM protocols over secure HTTPS/WebSocket). |
| Tech stack | **TypeScript/Node.js server + PostgreSQL + Redis**; React component library; Vite-built frontend; self-hosting docs use PostgreSQL 16, Redis, Node.js (server health-check port 8103). |
| License | **Apache License 2.0** ("most of the Medplum platform is released as open source software under the Apache 2.0 license"); the hosted enterprise version is a commercial service. |
| Reusable assets | (1) Engineering of the **full FHIR R4 resources/search parameters/REST/GraphQL/batch Bundles/Subscriptions**; (2) the typed TypeScript SDK and React clinical components; (3) event-driven Bots automation (highly isomorphic to jlmedaios's Agent/tool system); (4) the "on-prem Agent + cloud" pattern bridging in-hospital HL7/DICOM over secure channels; (5) the event-driven integration service. |
| Limits | (1) Centered on the U.S. ecosystem (HIPAA/ONC/OAuth2 SMART) — **Chinese insurance, EMR grading, and MLPS (等保) must be added**; (2) adapting FHIR R4 to domestic HL7 v2/legacy systems still needs an adapter layer; (3) some advanced capabilities are in the hosted version and self-hosting requires operating the Postgres/Redis/cluster. |
| Sources | Open-source statement (Apache-2.0): https://www.medplum.com/open-source ; products: https://www.medplum.com/products ; docs (headless EHR): https://www.medplum.com/docs ; self-host from scratch (Postgres16/Redis/Node/Vite): https://www.medplum.com/docs/self-hosting/install-from-scratch ; Agent (HL7/MLLP/ASTM/DICOM): https://www.medplum.com/docs/agent ; event-driven integration: https://www.medplum.com/products/integration |

### 3.2 Aidbox

| Dimension | Content |
|---|---|
| Positioning | Health Samurai's **FHIR server + database** for high-load medical products and integrations; metadata (zen)-driven, multi-tenant (Multibox), with REST/GraphQL/SQL APIs, Bulk Data, Subscriptions, and OAuth2. |
| Architecture | Cloud-native, FHIR-first (R4/R5); **an entire resource is stored in a single PostgreSQL JSONB row**, combined with relational power and indexing; everything (endpoints, resource definitions, profiles, access policies) is a configurable "resource." |
| Tech stack | **JVM (Clojure) + PostgreSQL (JSONB)**; delivered as Docker containers; TypeScript/C#/Python SDKs. |
| License | **Closed-source / commercial license (not OSI open source)**: official comparison materials explicitly mark Aidbox as **Closed Source**. Types: a **Production license** (paid; after a 14-day trial contact the vendor; PHI allowed) and a **Development license** (free, but development/test/demo only, no PHI, database ≤5 GB, with warnings up to shutdown if exceeded); also SaaS and education licenses; the JWT license token is verified against aidbox.app at runtime (grace period when offline). |
| Reusable assets | (1) The **PostgreSQL + JSONB** FHIR storage and indexing design; (2) the metadata/zen-driven, everything-as-resource platform approach; (3) multi-tenant Multibox and fine-grained access policies; (4) the FHIR R4/R5 dual-version and Bulk Data/Subscriptions product shape (**design reference only — no reuse of closed-source code**). |
| Limits | (1) **Closed source + commercial license, dev license no-PHI/5 GB** — it cannot be jlmedaios's open-source base and code cannot be copied; (2) the Clojure stack does not match the team's TypeScript route; (3) license verification needs internet, unfriendly to intranet/offline deployment. |
| Sources | License types & support: https://docs.aidbox.app/overview/licensing-and-support ; PostgreSQL+JSONB database: https://www.health-samurai.io/docs/aidbox/database/overview ; closed-source/JVM(Clojure) comparison: https://www.health-samurai.io/articles/de-de/performance-at-scale-baseline ; license verification FAQ: https://docs.aidbox.app/overview/faq |

### 3.3 HAPI FHIR

| Dimension | Content |
|---|---|
| Positioning | Smile Digital Health's community-maintained **full Java FHIR implementation** (a self-described 20+ year global good); the most popular and complete open-source Java FHIR implementation; the commercial version is Smile CDR. |
| Architecture | Two server forms: the **Plain Server** (bring your own storage, framework to your data) and the **JPA Server** (turnkey FHIR server with its own schema and full storage/retrieval logic); includes MDM, terminology, subscriptions, and bulk data. |
| Tech stack | **Java; the JPA Server is based on Hibernate**; supports PostgreSQL and other relational databases; modular Maven artifacts (hapi-fhir-server, hapi-fhir-jpaserver-base, etc.). |
| License | **Apache License 2.0** (per the site: the business-friendly Apache Software License 2.0). |
| Reusable assets | (1) The **most complete FHIR specification implementation** (resources, search, transactions, terminology, subscriptions, MDM, bulk data) as the "reference answer" for FHIR behavior; (2) the JPA + Hibernate resource storage/indexing architecture; (3) the interceptor extension mechanism; (4) MDM master-data matching/merging, benchmarking jlmedaios's master-data governance. |
| Limits | (1) Java, a different language from jlmedaios's TypeScript BFF/frontend (it can be deployed as a standalone FHIR service or used as a behavior reference); (2) the JPA Server's built-in schema differs from domestic business tables and needs mapping; (3) Chinese insurance/grading/MLPS must be built separately. |
| Sources | Official site (Apache-2.0, positioning): https://hapifhir.io/ ; JPA architecture (Hibernate/DAOs/database): https://hapifhir.io/hapi-fhir/docs/server_jpa/architecture.html ; modules: https://hapifhir.io/hapi-fhir/docs/getting_started/modules.html ; public server: https://hapi.fhir.org/about |

### 3.4 EHRbase (openEHR)

| Dimension | Content |
|---|---|
| Positioning | Open-source **openEHR Clinical Data Repository (CDR) backend** for clinical applications and electronic health records; provides EHR, Composition, Contribution, template management, and AQL queries through the official openEHR REST API; described by industry comparisons as the most mature fully open-source openEHR CDR. |
| Architecture | Spring Boot application; driven by openEHR templates/archetypes, with data organized by the openEHR Reference Model (RM) and queried via AQL; Docker/K8s/bare-metal deployment. |
| Tech stack | **Java, Spring Boot, jOOQ, PostgreSQL** (hierarchical RM data combined with JSONB indexing); the official platform page lists Java 11 and Postgres 11; built on **Archie** (the Apache-2.0 openEHR ADL/RM Java library); recent comparisons cite PostgreSQL 16 and openEHR RM 1.1.0. |
| License | **Apache License 2.0**; its Archie dependency is also Apache-2.0. |
| Reusable assets | (1) The **archetype/template-driven, "model once, use for life"** modeling method and AQL; (2) the open-source openEHR REST API, the reference for the openEHR side of the dual-track standard; (3) template/archetype governance and version management; (4) the longitudinal, evolvable clinical repository paradigm complementary to FHIR. |
| Limits | (1) openEHR has a steep learning curve and heavy archetype governance, and is **not suited to directly host high-frequency transactional HIS screens** (it is better as a CDR); (2) Java, different from jlmedaios's main line; (3) relatively few openEHR specialists and domestic cases; (4) the exact latest version / maintainer corporate relationship is not fully verified (see open items). |
| Sources | openEHR official platform page (Java11/Postgres11/Spring Boot/jOOQ): https://openehr.org/platform/ ; CDR vendor comparison (Apache-2.0, PostgreSQL16, RM1.1.0): https://nirmitee.io/blog/openehr-cdr-vendor-comparison-2026/ ; self-host comparison: https://www.pistack.xyz/posts/2026-06-04-self-hosted-medical-emr-ehr-openemr-openmrs-ehrbase-guide/ ; Archie library (Apache-2.0): https://openehr.org/libraries/ |

### 3.5 LinuxForHealth / IPF

| Dimension | Content |
|---|---|
| Positioning | **IPF (Open eHealth Integration Platform)** is a healthcare extension of the Apache Camel routing/mediation engine, providing a DSL for medical message processing and system interconnection; it originated with the Open eHealth Foundation (oehf) and later joined the IBM-led **LinuxForHealth** open-source ecosystem. LinuxForHealth is positioned as an "open-source, distributed processing network/operating system" connecting on-prem, cloud, and edge devices to healthcare transaction systems; it also includes the **LinuxForHealth FHIR Server** developed by IBM/Alvearie (Java, JAX-RS/JDBC, Open Liberty, supporting FHIR R4/4.3.0). |
| Architecture | IPF: integration pipelines based on **Apache Camel**, implementing Enterprise Integration Patterns (EIP) in a Java/Groovy DSL, with HL7 v2 DSL, CDA, and FHIR; the HL7 v2 capability reuses the HAPI HL7 library underneath. LinuxForHealth FHIR Server: a modular, high-performance Java FHIR server. |
| Tech stack | **Java + Groovy + Apache Camel (IPF)**; the LinuxForHealth FHIR Server is Java/JAX-RS/JDBC/Open Liberty. |
| License | **Apache License 2.0 (IPF)**; Apache Camel itself is Apache-2.0; the LinuxForHealth FHIR Server is Apache-2.0 (open-sourced by IBM). |
| Reusable assets | (1) The **HL7 v2 processing/validation/ACK, CDA, and FHIR conversion pipeline paradigm** (benchmarking jlmedaios's HIS/EMR/LIS/PACS integration layer); (2) Camel's 350+ connectors and EIP library; (3) the IBM FHIR Server's high-performance modular design as another FHIR reference; (4) the "in-hospital low-level protocol → secure channel → platform" topology. |
| Limits | (1) Java/Groovy differs from jlmedaios's TypeScript main line (it can be deployed as a standalone engine or used for topology reference); (2) the current activity of LinuxForHealth sub-projects after IBM's strategic changes needs ongoing observation (**the maintenance status of some sub-projects is not individually verified**); (3) general Camel needs substantial engineering to reach the out-of-box level of a dedicated healthcare engine such as Mirth Connect. |
| Sources | IPF overview (Apache-2.0, Camel, Java/Groovy): https://project-awesome.org/r/oehf-ipf ; IPF docs (HL7 v2 reuses HAPI): https://oehf.github.io/ipf-docs/docs/hl7-groovy/ ; LinuxForHealth FHIR Server (Java/JAX-RS/JDBC): https://faraproject.com/topics/fhir ; IBM's positioning of LinuxForHealth: https://www.ibm.com/blog/author/tori-mccaffrey ; FHIR Server academic source (Alvearie, FHIR 4.3.0): https://ceur-ws.org/Vol-4196/paper_14.pdf |

---

## 4. Cloud-Native Engineering Paradigms

### 4.1 Service Mesh

The mainstream choices are **Istio** and **Linkerd** (with eBPF-based Cilium as a sidecar-free option):

| Dimension | Istio | Linkerd |
|---|---|---|
| Data plane | Envoy (C++) sidecars; an **Ambient sidecar-free mode** (the node-level Rust ztunnel handles mTLS/L4, with waypoints deployed on demand for L7, over the HBONE tunnel) | The in-house Rust linkerd2-proxy micro-proxy (per pod) |
| Traffic management | Strong: canary, fault injection, mirroring, retries, circuit breaking, VirtualService/DestinationRule | Basic: retries, timeouts, traffic splits |
| mTLS | Automatic (PERMISSIVE by default during rollout, switchable to STRICT after full mesh) | Automatic, zero-config |
| Observability | Rich Envoy metrics; integrates Prometheus/Grafana/Jaeger/Kiali | Built-in golden metrics and the `linkerd viz` dashboard |
| Complexity/overhead | Higher, most complete feature set | Low, lightweight, opinionated, fast to adopt |

**Healthcare adaptation:**

- Choose **Istio** when outpatient peaks and multi-campus operation require **fine-grained L7 routing, circuit breaking, retries, canaries, and multi-cluster federation**; choose **Linkerd** when the team wants low operations cost with only automatic mTLS + golden metrics;
- **mTLS rollout must go PERMISSIVE then STRICT**, to avoid cutting off legacy in-hospital systems (HIS/LIS/PACS gateways) without sidecars;
- The service mesh handles **inter-service encryption and policy** but **cannot replace business-level medical permissions (RBAC+ABAC), electronic signatures, or accountability**;
- Traffic from HIS/EMR/LIS/PACS connected via on-prem agents should be brought into the mesh at the gateway or explicitly whitelisted in policy.

Sources: Istio vs Linkerd (features/mTLS rollout): https://kubernetes.ae/istio-vs-linkerd/ ; pragmatic 2026 service-mesh analysis (Istio/Ambient): https://pdpspectra.com/blog/microservices-mesh-istio-2026/ ; Ambient vs Linkerd (ztunnel/waypoint/HBONE): https://www.buoyant.io/articles/linkerd-vs-istio-ambient-mode-an-operators-architecture-comparison-for-2026 ; mesh comparison (incl. Cilium/eBPF): https://calmops.com/devops/service-mesh-comparison-istio-linkerd-cilium/

### 4.2 Kafka Event Streaming

- **Core capabilities**: a distributed, persistent, partition-ordered event log; producer/consumer decoupling; replicated high availability; **idempotent producers (`enable.idempotence=true`) and a transactions API provide in-cluster exactly-once semantics**; replay is supported; application-level idempotency is still needed across system boundaries.
- **Healthcare use**: the **unified clinical event backbone** carrying ADT/registration, order status, lab results, imaging reports, critical values, and billing events; Kafka Streams/Flink for real-time processing (e.g. a critical-value alerting pipeline); events are partitioned by business keys (e.g. encounterId/patientId) for ordering and parallelism.
- **Key significance for jlmedaios**: the existing `src/core/events/AgentEventBus.ts` and `src/bff/alertBus.ts` are both **in-process in-memory buses** that cannot deliver across processes under horizontal scale-out; Kafka (or a managed/lightweight alternative such as Redpanda) is the clear direction to replace the in-memory bus and support multi-campus multi-instance operation (the replacement path is in the Strangler Fig roadmap).
- Healthcare notes: events contain PHI and need **encryption in transit, access control, tenant/campus isolation of topics or partitions, retention, and audit**; high-accountability events such as critical values require a "delivery confirmation + human acknowledged receipt" closed loop, not at-most-once push alone.

Sources: Kafka official intro (decoupling, exactly-once, persistence): https://kafka.apache.org/intro/ ; Kafka + FHIR real-time healthcare pipelines (ADT/labs/critical values, Kafka Streams): https://nirmitee.io/blog/streaming-healthcare-data-kafka-fhir-real-time-adt-labs-alerts/ ; EOS/idempotence/transactions: https://savitojs.github.io/k8s-learn-by-doing/labs/real-world/event-driven-kafka-deep-dive/

### 4.3 Observability

- **De-facto standard**: **OpenTelemetry (OTel) unifies Traces/Metrics/Logs collection (OTLP) + Prometheus metrics & alerting + Grafana visualization**; logs commonly use Loki/Fluent Bit and traces Tempo/Jaeger; at scale, Thanos/Mimir/VictoriaMetrics add long-term retention, HA, and cross-cluster queries to Prometheus.
- **K8s adoption**: use the **OpenTelemetry Operator** with auto-instrumentation and a Collector as the central gateway; observe control plane, data plane, and application in layers.
- **Healthcare/AI adaptation**: beyond RED/golden metrics (latency, traffic, errors, saturation), add (1) **LLM/Agent-specific observability** — time-to-first-token, token usage and cost, tool-call success rate, RAG hits, Agent step traces; (2) **business closed-loop metrics** — order execution closed-loop rate, prescription review time, critical-value acknowledgement time, registration-to-encounter latency; (3) correlation of audit and tracing for accountability.
- Principles: **alert before users notice**; SLO-driven; plaintext PHI and secrets must not enter logs (log after desensitization).

Sources: OTel K8s managed blueprint (Operator/Instrumentation): https://opentelemetry.io/docs/guidance/blueprints/managed-telemetry-platforms-for-k8s-workloads/ ; CNCF observability (metrics to meaning): https://www.cncf.io/blog/2026/08/31/observability-in-kubernetes-from-metrics-to-meaning/ ; Grafana zero-code AI/Agent observability: https://grafana.com/blog/ai-observability-zero-code/

### 4.4 Multi-tenancy

Three mainstream isolation models:

| Model | Form | Isolation | Cost/Ops | Suited to |
|---|---|---|---|---|
| Database/instance per tenant | Independent database/deployment per tenant (often a separate K8s Namespace) | Highest | High | Strong compliance / very large customers |
| Shared DB, schema per tenant (Bridge) | One database, separate schemas (PG `SET search_path`) | Medium | Medium | Tens to hundreds of tenants |
| Shared DB, shared tables, row-level `tenant_id` | Same DB/tables, discriminator column + app/RLS filtering | Low (logical) | Lowest | Mass of small/medium tenants |

**Healthcare adaptation (multi-campus):**

- Healthcare data needs strong isolation and compliance, so use a **hybrid model**: by default "**shared database + row-level `tenant_id` isolation + enforced PostgreSQL RLS + an application DataScopeGuard as double insurance**," with an upgrade path to "independent schema or database / Namespace" for hospital groups requiring strong isolation;
- A **three-level hierarchy of "tenant (hospital/group) → campus → department"**: the campus is a scope sub-level (campus_id) within the tenant, not a separate tenant, giving both a unified multi-campus view and data ownership;
- On K8s, tier by tenant: a basic tier sharing the application and a standard tier with a per-tenant Namespace for network/resource isolation;
- Connection pooling, backup/restore, and cross-tenant statistics (only with explicit authorization) are handled uniformly in the data-access layer to prevent cross-tenant leakage.

Sources: three multi-tenancy models: https://calmops.com/software-engineering/multi-tenant-saas-architecture/ ; K8s multi-tenancy (schema/row-level, tiered Namespaces): https://blog.4geeks.io/how-to-architect-multi-tenant-saas-application-on-kubernetes/ ; Azure AKS multi-tenancy (basic/standard tiers, storage isolation): https://learn.microsoft.com/zh-cn/azure/architecture/guide/multitenant/service/aks

---

## 5. Consolidated Comparison Tables

### 5.1 Mature HIS/EMR

| Project | Positioning | Architecture | Tech stack | License | Closed-source friendliness |
|---|---|---|---|---|---|
| OpenMRS | Medical-record platform | Modular monolith + OMOD; O3 SPA | Java/Spring/Hibernate, MySQL/PG, Liquibase, React(O3) | **MPL-2.0** | Medium (file-level copyleft; modified original files must be open) |
| Bahmni | Integrated EMR+HIS distribution | Multi-component integration | OpenMRS/OpenELIS/Odoo/dcm4chee/Jasper | **AGPL-3.0 (Core) + multi-license** | Low (AGPL network copyleft) |
| OpenEMR | EHR + practice management | Web monolith | PHP 8.2–8.5, MariaDB/MySQL | **GPL (version not verified)** | Low (GPL copyleft) |
| HospitalRun | Offline-first HIS | Monorepo, offline sync | React/Node/PouchDB-CouchDB | **MIT** | High |
| GNU Health | HMIS/EMR/HIS + public health | Tryton three tiers | Python/Tryton/PostgreSQL | **GPL-3.0-or-later** | Low (GPL copyleft) |
| Open Hospital | Primary-care EHR/HIS | Java desktop (portable/client-server) | Java Swing, MariaDB/MySQL | **GPL-3.0** | Low (GPL copyleft) |

### 5.2 Cloud-Native / FHIR / openEHR

| Project | Positioning | Architecture | Tech stack | License | Reusability |
|---|---|---|---|---|---|
| Medplum | Headless EHR/developer platform | FHIR-native cloud-native, Agent bridge | TypeScript/Node, PostgreSQL, Redis, React | **Apache-2.0** | High (same language/paradigm) |
| Aidbox | FHIR server + database | Metadata-driven, multi-tenant | JVM(Clojure), PostgreSQL JSONB | **Closed-source/commercial (free dev license, no PHI, ≤5 GB)** | Design reference only |
| HAPI FHIR | Full Java FHIR implementation | Plain/JPA server | Java, Hibernate, multi-DB (PG) | **Apache-2.0** | High (FHIR behavior standard) |
| EHRbase | openEHR CDR | Archetype/template-driven | Java/Spring Boot/jOOQ, PostgreSQL | **Apache-2.0** | Medium-high (openEHR reference) |
| LinuxForHealth/IPF | Integration platform/FHIR server | Camel pipelines | Java/Groovy, Apache Camel | **Apache-2.0** | Medium-high (integration pipeline reference) |

### 5.3 Cloud-Native Engineering Paradigm Choices

| Paradigm | Mainstream choice | Recommendation for jlmedaios |
|---|---|---|
| Service mesh | Istio / Linkerd / Cilium | Istio for L7/multi-cluster; Linkerd for simplicity; mTLS PERMISSIVE then STRICT |
| Event streaming | Apache Kafka (+ Streams/Flink; Redpanda-compatible) | Replace the in-process in-memory bus; isolate by tenant/campus; critical values need acknowledgement |
| Observability | OpenTelemetry + Prometheus + Grafana (Loki/Tempo) | OTel Operator auto-instrumentation; add LLM/Agent and business closed-loop metrics |
| Multi-tenancy | Row-level / schema-per-tenant / database-per-tenant | Default row-level + RLS + DataScopeGuard, campuses as scope; upgrade for strong isolation |

---

## 6. License Compatibility and Copyleft Analysis

> General engineering/compliance analysis, not legal advice; legal gives the final review before open-sourcing.

- **MIT / Apache-2.0 (permissive)**: commercial use, closed source, and modification are allowed; Apache-2.0 includes a patent grant and NOTICE requirements. **Fully compatible with jlmedaios's open-source (Apache-2.0) route.** Representatives: HospitalRun (MIT); Medplum, HAPI FHIR, EHRbase, IPF (Apache-2.0).
- **MPL-2.0 (file-level weak copyleft)**: copyleft applies only to **modified original MPL-licensed files**; new files and unmodified integration can keep their own licenses; compatible with Apache-2.0 and coexistence, but **file-level marking and compliance** are required. Representative: OpenMRS.
- **GPL-3.0 / GPL (strong copyleft)**: the **distributed derivative whole must be open-sourced under the GPL**; GPL code cannot be copied into closed-source jlmedaios parts. Representatives: GNU Health, Open Hospital, OpenEMR.
- **AGPL-3.0 (strong network copyleft)**: on top of the GPL, **providing the service over a network (SaaS/cloud) triggers the open-source obligation**; the strongest constraint on cloud-based commercial products. Representatives: Bahmni Core, OpenELIS.
- **CC BY-NC-SA 4.0 (non-commercial, share-alike)**: the jlmedaios DAMO-RADAR imaging **weights** are under this license — **no commercial use, derivatives under the same license**; hence RADAR can only be a non-commercial second-reader aid, with weights not committed and downloaded by the deployer, and must not be mixed into a commercial closed loop.
- **Closed-source commercial**: Aidbox cannot be an open-source base and its code cannot be reused; design benchmarking only.

**Overall compatibility conclusions for our open-sourcing:**

1. Open-sourcing jlmedaios's own code under **Apache-2.0** is the safest route — it can freely absorb the MIT/Apache ecosystem (Medplum, HAPI, EHRbase, IPF, HospitalRun assets);
2. **Never** directly copy code from GPL/AGPL projects (GNU Health, Open Hospital, OpenEMR, Bahmni Core, OpenELIS); their **domain ideas and processes** may inform us (ideas are not copyrightable, but use clean-room independent implementation and cite sources);
3. If OpenMRS (MPL-2.0) code is reused, keep those files under MPL and manage changes per file;
4. Physically isolate and separately declare the RADAR weights (CC BY-NC-SA) to avoid contaminating the main license;
5. Maintain a **THIRD_PARTY_LICENSES / NOTICE / DATA_LICENSES** ledger so the source and license of every third-party dependency and data asset are traceable.

---

## 7. Adoption Recommendations for jlmedaios

**Direct engineering benchmarks (same language/paradigm, priority):**

- **Medplum**: the FHIR-native platform, TypeScript SDK, React components, Bots automation, and Agent bridging in-hospital HL7/DICOM — the best fit for jlmedaios's BFF + 19 tools + Agent orchestration route, and the **number-one benchmark**;
- **HAPI FHIR**: the "standard answer" for FHIR correctness and an MDM reference;
- **EHRbase**: the reference for the openEHR CDR and AQL, supporting the "FHIR + openEHR dual track";
- **IPF/Apache Camel**: the topology reference for HIS/EMR/LIS/PACS integration pipelines and HL7 v2/CDA/FHIR conversion.

**Borrow domain ideas, not code:**

- OpenMRS's **Concept Dictionary** and Patient–Encounter–Obs model (code reuse requires MPL compliance);
- GNU Health's social-medicine/lab/federation breadth, Bahmni's distribution integration boundaries, OpenEMR's clinic closed loop and billing, Open Hospital's offline portable deployment, and HospitalRun's offline-first sync (MIT, reusable).

**Explicitly not adopted:**

- No GPL/AGPL project as jlmedaios's code base;
- No closed-source Aidbox as the base (design reference only);
- No CC BY-NC-SA RADAR weights in the commercial closed loop or main repository.

**Sequencing principle**: FHIR first (transaction/interface layer, benchmarking Medplum/HAPI), openEHR later (clinical repository/longitudinal consolidation, benchmarking EHRbase); use the Camel/IPF paradigm for the integration layer; introduce the mesh, Kafka, OTel, and multi-tenant RLS with K8s over time. Every milestone remains runnable, verifiable, and rollback-able (see the roadmap).

---

## 8. Not-Verified and Open Items

1. The **exact GPL version of OpenEMR** (GPL-2.0/3.0 or either) was not verified verbatim against the official LICENSE file — marked "version not verified";
2. The **current latest EHRbase version and the maintainer's corporate entity (vitagroup, etc.) / enterprise-edition relationship** are not fully verified; the official platform page lists Java 11/Postgres 11 while third-party comparisons cite PostgreSQL 16/RM 1.1.0 — different points in time;
3. The **current activity and latest versions of LinuxForHealth sub-projects (including IPF and the FHIR Server) after IBM's strategic changes** are not individually verified;
4. The **specific latest release versions** of GNU Health, Bahmni, Open Hospital, and HospitalRun were not individually checked against official release pages this round, so versions are not asserted in the body;
5. GitHub repository pages cannot be auto-fetched due to robots.txt; repository facts rely on official sites/docs/verifiable mirrors;
6. The **transitive dependency licenses** of each project were not checked at full SBOM level; a dependency-level license scan is required before commercial use;
7. An earlier draft claimed "EHRbase supports ~7.5 million residents in Catalonia, Spain"; this could not be verified from official sources (Catalonia's HC3 uses openEHR, but whether EHRbase hosts it is unverified), so this report does not adopt the claim and treats it as open.

> This report follows the principle of "slow is smooth, no claim without evidence": every unverified item is marked explicitly and memory or impression is not substituted for sources. Open items are closed one by one during later integration/legal stages.
