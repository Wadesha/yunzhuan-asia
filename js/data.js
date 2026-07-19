/* ============================================================
   寰宇零售集团 · 组织与职位数据
   GlobalSphere Retail Group — Org & Position Data
   纯文本数据层，无 icon / emoji
   ============================================================ */

const GROUP = {
  name: "寰宇零售集团",
  nameEn: "GlobalSphere Retail Group",
  tagline: "连接全球市场，服务每一位顾客",
  profile:
    "寰宇零售集团是一家跨国零售集团，业务覆盖亚太、欧洲、北美三大区域，旗下运营六个零售品牌。" +
    "集团采用矩阵式管理：纵向按职能划分为十个业务部门，横向按区域划分为三大区域总部。" +
    "全球门店超过 3,800 家，员工约 12 万人，2025 财年零售总额达 2,140 亿元。",
  facts: [
    { label: "成立年份", value: "1998" },
    { label: "覆盖区域", value: "亚太 · 欧洲 · 北美" },
    { label: "零售品牌", value: "6 个" },
    { label: "全球门店", value: "3,800+ 家" },
    { label: "员工规模", value: "约 12 万人" },
    { label: "2025 财年总额", value: "2,140 亿元" }
  ]
};

/* 五个层级定义 */
const LEVELS = [
  { code: "L1", name: "集团高管", nameEn: "Group Executive", note: "制定集团战略与方向，向董事会汇报" },
  { code: "L2", name: "部门总监", nameEn: "Department Director", note: "负责单一职能部门的整体业绩与目标" },
  { code: "L3", name: "高级经理", nameEn: "Senior Manager", note: "管理跨团队的关键业务模块或区域" },
  { code: "L4", name: "经理 / 主管", nameEn: "Manager / Supervisor", note: "带领一线团队，执行具体业务" },
  { code: "L5", name: "专员 / 助理", nameEn: "Specialist / Associate", note: "承担专业或执行类岗位工作" }
];

/* 十个业务部门 */
const DEPARTMENTS = [
  {
    id: "hq",
    name: "集团总部",
    nameEn: "Group Headquarters",
    desc: "集团最高决策中枢，统筹战略、治理与跨职能协同。",
    regions: "全球",
    headcount: "180",
    positions: [
      {
        level: "L1", title: "集团首席执行官", titleEn: "Group Chief Executive Officer",
        reportsTo: "董事会",
        summary: "对集团整体经营业绩与长期战略负总责，领导执行委员会。",
        responsibilities: [
          "制定集团三年战略与年度经营目标",
          "主持执行委员会，决策重大投资与并购",
          "代表集团对接资本市场与监管机构",
          "塑造企业文化与高管团队建设"
        ],
        requirements: [
          "15 年以上零售或消费品行业经验",
          "具备跨国集团一把手或核心高管任职经历",
          "熟悉多区域市场与资本运作"
        ]
      },
      {
        level: "L2", title: "集团首席运营官", titleEn: "Group Chief Operating Officer",
        reportsTo: "集团首席执行官",
        summary: "统筹全球门店与供应链的日常运营，对运营效率与利润负责。",
        responsibilities: [
          "管理区域总部与营运体系的协同",
          "推动运营标准化与降本增效",
          "监督重大运营风险与危机处置"
        ],
        requirements: [
          "12 年以上零售运营经验",
          "具备跨区域、多品牌管理经验",
          "强数据驱动的决策能力"
        ]
      },
      {
        level: "L3", title: "总裁办公室主任", titleEn: "Chief of Staff",
        reportsTo: "集团首席执行官",
        summary: "保障决策落地与高管议程，统筹跨部门专项工作。",
        responsibilities: [
          "组织执行委员会例会与决议跟踪",
          "管理集团级专项与重大汇报材料",
          "协调总部与各区域总部的沟通"
        ],
        requirements: [
          "8 年以上战略或运营管理经验",
          "优秀的统筹与文字表达能力",
          "保密意识与跨层级沟通力"
        ]
      }
    ]
  },
  {
    id: "buy",
    name: "采购与商品",
    nameEn: "Procurement & Merchandising",
    desc: "负责全球选品、供应商管理与商品组合策略。",
    regions: "全球买手网络",
    headcount: "640",
    positions: [
      {
        level: "L2", title: "商品采购总监", titleEn: "Merchandising Director",
        reportsTo: "集团首席运营官",
        summary: "对商品毛利率与库存周转负总责，制定选品策略。",
        responsibilities: [
          "制定年度商品组合与品类策略",
          "管理全球供应商体系与采购预算",
          "平衡自有品牌与第三方品牌结构"
        ],
        requirements: [
          "10 年以上采购 / 买手经验",
          "具备跨国供应链与谈判能力",
          "敏锐的商品趋势判断"
        ]
      },
      {
        level: "L3", title: "品类采购高级经理", titleEn: "Senior Category Manager",
        reportsTo: "商品采购总监",
        summary: "负责单一品类的全生命周期管理与业绩。",
        responsibilities: [
          "管理品类采购计划与上新节奏",
          "分析销售数据并优化货品结构",
          "维护核心供应商关系"
        ],
        requirements: [
          "6 年以上品类管理经验",
          "扎实的数据分析与预测能力"
        ]
      },
      {
        level: "L4", title: "采购经理", titleEn: "Buying Manager",
        reportsTo: "品类采购高级经理",
        summary: "执行具体品类的下单、跟单与到货管理。",
        responsibilities: [
          "执行采购订单与交期跟进",
          "处理退换货与质量异常",
          "整理周度采购执行报表"
        ],
        requirements: [
          "3 年以上采购执行经验",
          "细致、抗压、沟通顺畅"
        ]
      }
    ]
  },
  {
    id: "supply",
    name: "供应链与物流",
    nameEn: "Supply Chain & Logistics",
    desc: "构建全球履约网络，保障门店与电商的库存供应。",
    regions: "三大区域枢纽",
    headcount: "2,100",
    positions: [
      {
        level: "L2", title: "供应链总监", titleEn: "Supply Chain Director",
        reportsTo: "集团首席运营官",
        summary: "对端到端履约成本与时效负责，优化全球网络。",
        responsibilities: [
          "规划区域仓与跨境干线网络",
          "设定库存健康度与履约时效目标",
          "推动自动化与绿色物流"
        ],
        requirements: [
          "12 年以上供应链经验",
          "具备跨国网络规划能力"
        ]
      },
      {
        level: "L3", title: "区域物流高级经理", titleEn: "Regional Logistics Senior Manager",
        reportsTo: "供应链总监",
        summary: "负责单一区域的仓储配送与运力调度。",
        responsibilities: [
          "管理区域配送中心日常运营",
          "优化最后一公里与门店补货",
          "控制物流成本与破损率"
        ],
        requirements: [
          "8 年以上仓储 / 配送管理经验"
        ]
      },
      {
        level: "L4", title: "仓储运营主管", titleEn: "Warehouse Supervisor",
        reportsTo: "区域物流高级经理",
        summary: "带领班组完成收货、拣货、发货作业。",
        responsibilities: [
          "排班与现场作业管理",
          "保障盘点准确率与作业安全",
          "处理异常工单"
        ],
        requirements: [
          "3 年以上仓储现场经验",
          "熟悉 WMS 系统操作"
        ]
      }
    ]
  },
  {
    id: "store",
    name: "门店运营",
    nameEn: "Store Operations",
    desc: "管理全球门店网络，直接服务终端顾客。",
    regions: "全球 3,800+ 门店",
    headcount: "86,000",
    positions: [
      {
        level: "L2", title: "营运总监", titleEn: "Operations Director",
        reportsTo: "集团首席运营官",
        summary: "对门店业绩、服务标准与人员效率负总责。",
        responsibilities: [
          "制定门店运营标准与激励方案",
          "管理区域营运团队",
          "推动门店数字化与体验升级"
        ],
        requirements: [
          "12 年以上连锁零售经验",
          "大规模团队管理能力"
        ]
      },
      {
        level: "L3", title: "区域营运经理", titleEn: "Regional Operations Manager",
        reportsTo: "营运总监",
        summary: "负责一个区域内数百家门店的业绩达成。",
        responsibilities: [
          "巡店与门店诊断",
          "推动区域销售目标达成",
          "培养店长梯队"
        ],
        requirements: [
          "8 年以上门店管理经验"
        ]
      },
      {
        level: "L4", title: "门店店长", titleEn: "Store Manager",
        reportsTo: "区域营运经理",
        summary: "对单店销售、利润与团队负责。",
        responsibilities: [
          "带领门店团队完成销售目标",
          "管理排班、库存与陈列",
          "处理顾客投诉与突发事件"
        ],
        requirements: [
          "3 年以上零售管理经验",
          "顾客导向与服务意识"
        ]
      },
      {
        level: "L5", title: "门店导购", titleEn: "Sales Associate",
        reportsTo: "门店店长",
        summary: "一线顾客接触点，提供商品推荐与收银服务。",
        responsibilities: [
          "接待顾客并完成销售",
          "维护货架陈列与库存",
          "执行收银与会员登记"
        ],
        requirements: [
          "良好的沟通与亲和力",
          "基本的数字设备操作能力"
        ]
      }
    ]
  },
  {
    id: "digital",
    name: "电子商务与数字化",
    nameEn: "E-commerce & Digital",
    desc: "运营全渠道电商，驱动集团数字化转型。",
    regions: "全球线上",
    headcount: "920",
    positions: [
      {
        level: "L2", title: "数字化总监", titleEn: "Head of Digital",
        reportsTo: "集团首席运营官",
        summary: "对线上 GMV 与数字化战略负责。",
        responsibilities: [
          "制定全渠道数字化路线图",
          "管理电商各平台与私域运营",
          "推动数据能力与 AI 应用"
        ],
        requirements: [
          "10 年以上电商 / 数字化经验",
          "兼具业务与技术的全局观"
        ]
      },
      {
        level: "L3", title: "电商平台高级经理", titleEn: "Senior E-commerce Manager",
        reportsTo: "数字化总监",
        summary: "负责单一平台或渠道的增长与转化。",
        responsibilities: [
          "制定平台营销与促销节奏",
          "优化转化率与客单价",
          "管理站内流量与内容"
        ],
        requirements: [
          "6 年以上平台运营经验"
        ]
      },
      {
        level: "L4", title: "数字营销经理", titleEn: "Digital Marketing Manager",
        reportsTo: "电商平台高级经理",
        summary: "执行投放、内容与用户增长动作。",
        responsibilities: [
          "管理付费与自有流量",
          "策划内容与社群活动",
          "输出周度投放效果报告"
        ],
        requirements: [
          "3 年以上数字营销经验",
          "熟悉主流广告后台"
        ]
      }
    ]
  },
  {
    id: "mkt",
    name: "市场营销",
    nameEn: "Marketing",
    desc: "塑造品牌形象，统筹全球整合营销传播。",
    regions: "全球品牌矩阵",
    headcount: "430",
    positions: [
      {
        level: "L2", title: "市场总监", titleEn: "Marketing Director",
        reportsTo: "集团首席运营官",
        summary: "对品牌资产与营销投资回报负责。",
        responsibilities: [
          "制定品牌与传播战略",
          "管理全球营销预算",
          "统筹重大 campaign 与赞助"
        ],
        requirements: [
          "12 年以上市场营销经验",
          "跨国品牌管理背景"
        ]
      },
      {
        level: "L3", title: "品牌高级经理", titleEn: "Senior Brand Manager",
        reportsTo: "市场总监",
        summary: "负责单一品牌或产品线的定位与传播。",
        responsibilities: [
          "撰写品牌年历与关键信息",
          "管理创意与媒介代理",
          "监测品牌健康度指标"
        ],
        requirements: [
          "7 年以上品牌管理经验"
        ]
      },
      {
        level: "L4", title: "市场活动经理", titleEn: "Campaign Manager",
        reportsTo: "品牌高级经理",
        summary: "落地具体营销活动与项目管理。",
        responsibilities: [
          "执行活动排期与物料",
          "协调内外部资源",
          "复盘活动效果"
        ],
        requirements: [
          "3 年以上活动执行经验",
          "强项目协调能力"
        ]
      }
    ]
  },
  {
    id: "fin",
    name: "财务",
    nameEn: "Finance",
    desc: "集团财务管控、合并报表与资本配置。",
    regions: "全球",
    headcount: "560",
    positions: [
      {
        level: "L2", title: "财务总监", titleEn: "Chief Financial Officer",
        reportsTo: "集团首席执行官",
        summary: "对集团财务健康、合规与资本效率负责。",
        responsibilities: [
          "制定财务战略与预算框架",
          "管理资金、税务与投资者关系",
          "把控财务合规与内控"
        ],
        requirements: [
          "15 年以上财务经验",
          "跨国集团 CFO 或核心财务高管背景",
          "熟悉多准则合并报表"
        ]
      },
      {
        level: "L3", title: "财务控制高级经理", titleEn: "Senior Financial Controller",
        reportsTo: "财务总监",
        summary: "负责区域财务报告与内控。",
        responsibilities: [
          "合并区域财务报表",
          "管理内控与审计配合",
          "分析经营偏差"
        ],
        requirements: [
          "8 年以上财务控制经验"
        ]
      },
      {
        level: "L4", title: "财务分析经理", titleEn: "FP&A Manager",
        reportsTo: "财务控制高级经理",
        summary: "建立经营模型，支持业务决策。",
        responsibilities: [
          "搭建滚动预测与预算模型",
          "输出业务单元盈利分析",
          "支持定价与投资测算"
        ],
        requirements: [
          "4 年以上 FP&A 经验",
          "精通 Excel 与建模"
        ]
      }
    ]
  },
  {
    id: "hr",
    name: "人力资源",
    nameEn: "Human Resources",
    desc: "支撑集团人才战略与组织能力建设。",
    regions: "全球",
    headcount: "380",
    positions: [
      {
        level: "L2", title: "人力资源总监", titleEn: "HR Director",
        reportsTo: "集团首席执行官",
        summary: "对人才供给、组织健康与文化负责。",
        responsibilities: [
          "制定全球人才战略",
          "管理中高层继任与薪酬体系",
          "推动多元包容文化"
        ],
        requirements: [
          "12 年以上 HR 经验",
          "跨国组织发展背景"
        ]
      },
      {
        level: "L3", title: "人才发展高级经理", titleEn: "Senior Talent Manager",
        reportsTo: "人力资源总监",
        summary: "负责关键人才盘点与领导力培养。",
        responsibilities: [
          "运行人才盘点与继任计划",
          "设计中高层培养项目",
          "管理高潜人才库"
        ],
        requirements: [
          "7 年以上 TD / OD 经验"
        ]
      },
      {
        level: "L4", title: "招聘经理", titleEn: "Recruiting Manager",
        reportsTo: "人才发展高级经理",
        summary: "保障各部门人才供给。",
        responsibilities: [
          "管理招聘渠道与供应商",
          "推进关键岗位招聘",
          "优化候选人体验"
        ],
        requirements: [
          "4 年以上招聘经验"
        ]
      }
    ]
  },
  {
    id: "it",
    name: "信息技术",
    nameEn: "Information Technology",
    desc: "建设集团数字化底座与业务系统。",
    regions: "全球",
    headcount: "740",
    positions: [
      {
        level: "L2", title: "首席信息官", titleEn: "Chief Information Officer",
        reportsTo: "集团首席执行官",
        summary: "对 IT 战略、系统稳定与安全负责。",
        responsibilities: [
          "制定技术架构与路线图",
          "管理数据中心与信息安全",
          "推动 AI 与数据平台建设"
        ],
        requirements: [
          "15 年以上 IT 经验",
          "大型零售 / 电商技术背景"
        ]
      },
      {
        level: "L3", title: "系统架构高级经理", titleEn: "Senior Solutions Architect",
        reportsTo: "首席信息官",
        summary: "负责核心系统的架构设计与治理。",
        responsibilities: [
          "定义技术选型与标准",
          "评审重大系统方案",
          "管理技术债与演进"
        ],
        requirements: [
          "10 年以上架构经验"
        ]
      },
      {
        level: "L4", title: "开发团队主管", titleEn: "Dev Team Lead",
        reportsTo: "系统架构高级经理",
        summary: "带领研发小组交付业务系统。",
        responsibilities: [
          "拆分需求与排期",
          "代码评审与质量保障",
          "培养工程师梯队"
        ],
        requirements: [
          "5 年以上研发经验",
          "具备团队管理经验"
        ]
      }
    ]
  },
  {
    id: "intl",
    name: "国际业务",
    nameEn: "International Business",
    desc: "拓展与管理海外区域市场。",
    regions: "欧洲 · 北美",
    headcount: "510",
    positions: [
      {
        level: "L2", title: "国际业务总监", titleEn: "International Director",
        reportsTo: "集团首席运营官",
        summary: "对海外市场的进入与增长负责。",
        responsibilities: [
          "制定海外市场进入策略",
          "管理海外区域总经理",
          "协调跨境合规与本地化"
        ],
        requirements: [
          "12 年以上国际业务经验",
          "熟悉多国零售法规"
        ]
      },
      {
        level: "L3", title: "海外区域总经理", titleEn: "Overseas General Manager",
        reportsTo: "国际业务总监",
        summary: "对单一海外国家的全渠道业绩负责。",
        responsibilities: [
          "经营海外国家 P&L",
          "组建本地团队",
          "对接本地供应商与政府"
        ],
        requirements: [
          "8 年以上海外管理经验",
          "流利当地语言"
        ]
      },
      {
        level: "L4", title: "跨文化运营经理", titleEn: "Cross-market Operations Manager",
        reportsTo: "海外区域总经理",
        summary: "协调总部与海外市场的运营衔接。",
        responsibilities: [
          "本地化流程适配",
          "跨文化团队沟通",
          "输出市场洞察"
        ],
        requirements: [
          "4 年以上跨境运营经验",
          "多语言沟通能力"
        ]
      }
    ]
  }
];

/* 每周工作报告样例 */
const REPORTS = [
  {
    id: "R-2601", week: "2026-W29", dateRange: "07/13 - 07/19",
    deptId: "buy", level: "L2", author: "林若云", authorTitle: "商品采购总监",
    title: "夏季品类清仓与秋季上新筹备",
    summary: "完成夏季服饰清仓策略落地，秋季新品选品进入终审。",
    highlights: [
      "夏季服饰清仓动销率提升至 82%，超目标 7 个百分点",
      "秋季新品选品会审通过 312 个 SKU，毛利目标 41%",
      "与三家东南亚供应商签订次年框架协议"
    ],
    challenges: [
      "欧洲线物流时效较计划延迟 5 天，影响部分秋装到货",
      "棉价波动导致成本预估需重新测算"
    ],
    nextWeek: [
      "召开秋装上新发布会",
      "锁定双十一核心备货清单",
      "完成自有品牌占比提升至 35% 的测算"
    ],
    metrics: [
      { k: "清仓动销率", v: "82%" },
      { k: "秋装 SKU 通过", v: "312" },
      { k: "目标毛利", v: "41%" }
    ]
  },
  {
    id: "R-2602", week: "2026-W29", dateRange: "07/13 - 07/19",
    deptId: "store", level: "L4", author: "赵敏", authorTitle: "门店店长（华东旗舰店）",
    title: "旗舰店 weekly 运营复盘",
    summary: "本周客流回升，会员复购改善，需关注晚高峰人力。",
    highlights: [
      "门店周销售额 186 万元，同比增长 9%",
      "新增会员 412 人，复购率 28%",
      "完成夏季陈列切换，顾客停留时长提升"
    ],
    challenges: [
      "周末晚高峰收银排队超过 6 分钟",
      "两名导购请假导致排班紧张"
    ],
    nextWeek: [
      "增开晚市临时收银台",
      "启动新人带教计划补足人力",
      "筹备周末亲子体验活动"
    ],
    metrics: [
      { k: "周销售额", v: "186 万" },
      { k: "新增会员", v: "412" },
      { k: "复购率", v: "28%" }
    ]
  },
  {
    id: "R-2603", week: "2026-W29", dateRange: "07/13 - 07/19",
    deptId: "supply", level: "L3", author: "陈昊", authorTitle: "区域物流高级经理（亚太）",
    title: "亚太枢纽仓周转优化",
    summary: "华东 hub 自动化分拣上线，履约时效缩短。",
    highlights: [
      "华东 hub 自动分拣线投产，人均效能 +23%",
      "门店补货满足率回升至 96.5%",
      "破损率降至 0.4%"
    ],
    challenges: [
      "华南暴雨导致两日干线延误",
      "大促前置仓容量接近上限"
    ],
    nextWeek: [
      "扩容华南临时仓",
      "演练双十一峰值履约方案",
      "推进绿色包装替换"
    ],
    metrics: [
      { k: "补货满足率", v: "96.5%" },
      { k: "破损率", v: "0.4%" },
      { k: "人均效能", v: "+23%" }
    ]
  },
  {
    id: "R-2604", week: "2026-W29", dateRange: "07/13 - 07/19",
    deptId: "digital", level: "L2", author: "吴桐", authorTitle: "数字化总监",
    title: "全渠道 GMV 与会员增长",
    summary: "私域小程序爆发，直播贡献显著提升。",
    highlights: [
      "全渠道 GMV 周环比 +14%",
      "小程序日活突破 92 万",
      "会员体系打通线上线下积分"
    ],
    challenges: [
      "搜索召回相关度仍需优化",
      "海外站点加载速度偏慢"
    ],
    nextWeek: [
      "上线智能推荐 v2",
      "优化海外 CDN 节点",
      "策划会员日大促"
    ],
    metrics: [
      { k: "GMV 环比", v: "+14%" },
      { k: "小程序日活", v: "92 万" },
      { k: "会员打通", v: "已上线" }
    ]
  },
  {
    id: "R-2605", week: "2026-W29", dateRange: "07/13 - 07/19",
    deptId: "fin", level: "L4", author: "黄海", authorTitle: "财务分析经理",
    title: "六月经营偏差分析与七月预测",
    summary: "半年度利润达成 97%，七月预计回正。",
    highlights: [
      "完成六月合并报表，偏差说明归档",
      "七月滚动预测利润回正 1.2 亿元",
      "建立门店级盈利看板"
    ],
    challenges: [
      "欧洲子公司汇率波动影响折算",
      "部分费用归集口径待统一"
    ],
    nextWeek: [
      "发布七月经营预测",
      "统一跨境费用归集规则",
      "支持双十一预算编制"
    ],
    metrics: [
      { k: "半年度达成", v: "97%" },
      { k: "七月预测利润", v: "1.2 亿" }
    ]
  },
  {
    id: "R-2606", week: "2026-W29", dateRange: "07/13 - 07/19",
    deptId: "hr", level: "L3", author: "周婷", authorTitle: "人才发展高级经理",
    title: "中高层继任与高潜盘点",
    summary: "完成区域总经理后备盘点，高潜池扩充。",
    highlights: [
      "盘点 86 名中高层，继任就绪度达 71%",
      "高潜人才池新增 24 人",
      "启动跨国轮岗项目"
    ],
    challenges: [
      "海外本地高管储备不足",
      "部分岗位继任断层"
    ],
    nextWeek: [
      "推进海外本地化招聘",
      "设计区域 GM 培养营",
      "复盘轮岗项目"
    ],
    metrics: [
      { k: "继任就绪度", v: "71%" },
      { k: "高潜新增", v: "24" }
    ]
  },
  {
    id: "R-2607", week: "2026-W30", dateRange: "07/20 - 07/26",
    deptId: "buy", level: "L3", author: "孙琳", authorTitle: "品类采购高级经理（美妆）",
    title: "美妆品类年中复盘",
    summary: "美妆毛利改善，自有品牌占比提升。",
    highlights: [
      "美妆品类毛利率回升至 38%",
      "自有品牌美妆上新 28 款",
      "联名系列首发售罄"
    ],
    challenges: [
      "国际大牌供货价上调",
      "部分爆品断货"
    ],
    nextWeek: [
      "谈判大牌供货条款",
      "加大自有品牌推广",
      "补货爆品"
    ],
    metrics: [
      { k: "毛利率", v: "38%" },
      { k: "自有上新", v: "28 款" }
    ]
  },
  {
    id: "R-2608", week: "2026-W30", dateRange: "07/20 - 07/26",
    deptId: "store", level: "L3", author: "李强", authorTitle: "区域营运经理（华南）",
    title: "华南区域门店巡检",
    summary: "巡检 42 家门店，服务标准整体达标。",
    highlights: [
      "区域周销售同比 +6%",
      "服务标准达标率 94%",
      "培养储备店长 9 人"
    ],
    challenges: [
      "3 家门店陈列不达标已整改",
      "高温导致客流波动"
    ],
    nextWeek: [
      "复查整改门店",
      "推进店长认证",
      "筹备区域促销活动"
    ],
    metrics: [
      { k: "销售同比", v: "+6%" },
      { k: "达标率", v: "94%" }
    ]
  },
  {
    id: "R-2609", week: "2026-W30", dateRange: "07/20 - 07/26",
    deptId: "it", level: "L4", author: "郑凯", authorTitle: "开发团队主管（中台）",
    title: "订单中台稳定性治理",
    summary: "完成大促前的容量压测与限流加固。",
    highlights: [
      "中台压测通过 5 万 QPS",
      "核心接口 P99 降至 180ms",
      "上线限流与降级策略"
    ],
    challenges: [
      "老旧库存服务耦合度高",
      "压测环境数据不完整"
    ],
    nextWeek: [
      "推进库存服务拆分",
      "完善全链路灰度",
      "复盘故障演练"
    ],
    metrics: [
      { k: "压测 QPS", v: "5 万" },
      { k: "P99 延迟", v: "180ms" }
    ]
  },
  {
    id: "R-2610", week: "2026-W30", dateRange: "07/20 - 07/26",
    deptId: "mkt", level: "L2", author: "何雪", authorTitle: "市场总监",
    title: "夏季品牌战役收官",
    summary: "全球夏季战役达成曝光目标，口碑向好。",
    highlights: [
      "战役总曝光 6.8 亿次",
      "社媒互动率 4.2%",
      "品牌偏好度提升 3 点"
    ],
    challenges: [
      "欧洲创意本地化延迟",
      "部分媒介成本超支"
    ],
    nextWeek: [
      "启动秋季战役筹备",
      "优化媒介组合",
      "输出战役复盘"
    ],
    metrics: [
      { k: "总曝光", v: "6.8 亿" },
      { k: "互动率", v: "4.2%" }
    ]
  },
  {
    id: "R-2611", week: "2026-W30", dateRange: "07/20 - 07/26",
    deptId: "intl", level: "L3", author: "Maria Lopez", authorTitle: "海外区域总经理（西欧）",
    title: "西欧市场半年回顾",
    summary: "西欧线上增长强劲，门店需提速。",
    highlights: [
      "西欧全渠道增长 +18%",
      "线上占比升至 34%",
      "新增两家本地仓"
    ],
    challenges: [
      "本地门店人效偏低",
      "合规申报流程偏长"
    ],
    nextWeek: [
      "优化门店排班模型",
      "对接本地合规顾问",
      "上线本地会员计划"
    ],
    metrics: [
      { k: "全渠道增长", v: "+18%" },
      { k: "线上占比", v: "34%" }
    ]
  },
  {
    id: "R-2612", week: "2026-W30", dateRange: "07/20 - 07/26",
    deptId: "supply", level: "L2", author: "徐磊", authorTitle: "供应链总监",
    title: "全球网络成本季度回顾",
    summary: "履约成本下降，绿色物流推进顺利。",
    highlights: [
      "单件履约成本下降 6%",
      "可循环箱使用率 41%",
      "跨境干线时效稳定"
    ],
    challenges: [
      "油价波动压缩降本空间",
      "部分区域产能瓶颈"
    ],
    nextWeek: [
      "签订全年运力协议",
      "扩大多式联运",
      "推进仓网再平衡"
    ],
    metrics: [
      { k: "履约成本", v: "-6%" },
      { k: "循环箱率", v: "41%" }
    ]
  },
  {
    id: "R-2613", week: "2026-W28", dateRange: "07/06 - 07/12",
    deptId: "digital", level: "L4", author: "钱悦", authorTitle: "数字营销经理",
    title: "会员日投放复盘",
    summary: "会员日 ROI 达标，私域贡献突出。",
    highlights: [
      "投放 ROI 4.6",
      "私域成交占比 38%",
      "新客成本下降 12%"
    ],
    challenges: [
      "公域流量成本上升",
      "创意产能吃紧"
    ],
    nextWeek: [
      "加大私域投放",
      "扩充创意外包",
      "测试新渠道"
    ],
    metrics: [
      { k: "ROI", v: "4.6" },
      { k: "新客成本", v: "-12%" }
    ]
  },
  {
    id: "R-2614", week: "2026-W28", dateRange: "07/06 - 07/12",
    deptId: "hr", level: "L4", author: "冯洁", authorTitle: "招聘经理",
    title: "关键岗位招聘周报",
    summary: "门店与仓储岗位补员进度良好。",
    highlights: [
      "本周入职 286 人",
      "店长岗位关闭率 73%",
      "校招Offer 发出 1,200 份"
    ],
    challenges: [
      "技术岗到岗周期偏长",
      "部分区域人才密度低"
    ],
    nextWeek: [
      "推进技术岗猎头",
      "下沉区域招聘会",
      "优化面试漏斗"
    ],
    metrics: [
      { k: "本周入职", v: "286" },
      { k: "店长关闭率", v: "73%" }
    ]
  }
];

/* 导出到全局（供 app.js 使用） */
window.GROUP = GROUP;
window.LEVELS = LEVELS;
window.DEPARTMENTS = DEPARTMENTS;
window.REPORTS = REPORTS;
