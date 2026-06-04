import type { Article, Assessment, AssessmentCategory, MembershipPlan } from "@/lib/types";

const frequency4 = [
  { label: "完全没有", value: "0", score: 0 },
  { label: "有几天", value: "1", score: 1 },
  { label: "一半以上时间", value: "2", score: 2 },
  { label: "几乎每天", value: "3", score: 3 }
];

const agreement5 = [
  { label: "非常不同意", value: "1", score: 1 },
  { label: "比较不同意", value: "2", score: 2 },
  { label: "不确定", value: "3", score: 3 },
  { label: "比较同意", value: "4", score: 4 },
  { label: "非常同意", value: "5", score: 5 }
];

const genericTemplate = (title: string): Record<string, Assessment["reportTemplates"][string]> => ({
  默认: {
    title,
    summary: "你的结果呈现出稳定而清晰的个人倾向，适合继续通过记录、反馈和行动实验加深自我理解。",
    traits: ["自我观察能力较好", "在熟悉环境中更容易发挥", "对关系和成长议题保持开放"],
    strengths: ["愿意复盘", "具备持续改善的意愿", "能在压力下寻找支持"],
    risks: ["容易在高压时过度消耗", "可能忽略身体信号", "需要避免把测评结果当成固定标签"],
    growth: ["每周做一次情绪记录", "为重要目标设置可量化行动", "把反馈转化为一个小实验"],
    careers: ["适合选择能提供清晰反馈和成长空间的环境", "在协作中明确边界与优先级"],
    relationships: ["表达需求时尽量具体", "用事实、感受、请求三步降低误解"]
  }
});

export const assessmentCategories: AssessmentCategory[] = [
  {
    slug: "personality",
    name: "人格探索",
    description: "MBTI、九型人格、DISC、艾森克等自我认知工具"
  },
  {
    slug: "emotion",
    name: "情绪压力",
    description: "PHQ-9、GAD-7、压力指数与睡眠质量筛查"
  },
  {
    slug: "career",
    name: "职业发展",
    description: "兴趣、能力与职业适配方向分析"
  },
  {
    slug: "relationship",
    name: "情感关系",
    description: "亲密关系、依恋模式与爱的表达方式"
  },
  {
    slug: "social",
    name: "社交关系",
    description: "情商、社交焦虑与人际交往能力"
  }
];

export const assessments: Assessment[] = [
  {
    slug: "mbti-lite",
    title: "MBTI 人格倾向",
    subtitle: "探索你的能量、信息、决策与生活方式偏好",
    categorySlug: "personality",
    category: "人格探索",
    description: "基于四组偏好维度的快速自我探索版本，适合作为个人成长与团队沟通的参考。",
    estimatedMinutes: 8,
    tags: ["MBTI", "人格", "自我认知"],
    scoring: { kind: "mbti", maxScore: 8 },
    questions: [
      {
        id: "mbti-1",
        title: "经历一周密集社交后，你更想如何恢复能量？",
        type: "single",
        required: true,
        options: [
          { label: "继续和朋友聊聊，把感受说出来", value: "E", dimension: "E" },
          { label: "独处一会儿，慢慢整理自己的状态", value: "I", dimension: "I" }
        ]
      },
      {
        id: "mbti-2",
        title: "面对新项目时，你更关注什么？",
        type: "single",
        required: true,
        options: [
          { label: "已有数据、流程和可执行细节", value: "S", dimension: "S" },
          { label: "未来可能性、概念和整体模式", value: "N", dimension: "N" }
        ]
      },
      {
        id: "mbti-3",
        title: "做重要决定时，你通常优先考虑：",
        type: "single",
        required: true,
        options: [
          { label: "逻辑一致、标准清楚、利弊明确", value: "T", dimension: "T" },
          { label: "人的感受、关系影响和价值认同", value: "F", dimension: "F" }
        ]
      },
      {
        id: "mbti-4",
        title: "周末计划被临时改变时，你更容易：",
        type: "single",
        required: true,
        options: [
          { label: "希望尽快重新安排一个确定计划", value: "J", dimension: "J" },
          { label: "觉得也不错，可以顺势探索新选择", value: "P", dimension: "P" }
        ]
      },
      {
        id: "mbti-5",
        title: "你在会议中更常扮演的角色是：",
        type: "single",
        required: true,
        options: [
          { label: "边讨论边形成想法", value: "E", dimension: "E" },
          { label: "先听完再给出整理后的观点", value: "I", dimension: "I" }
        ]
      },
      {
        id: "mbti-6",
        title: "学习新知识时，你更偏好：",
        type: "single",
        required: true,
        options: [
          { label: "案例、步骤和可观察结果", value: "S", dimension: "S" },
          { label: "框架、隐喻和底层原理", value: "N", dimension: "N" }
        ]
      },
      {
        id: "mbti-7",
        title: "当团队发生分歧，你最先尝试：",
        type: "single",
        required: true,
        options: [
          { label: "厘清规则、目标和判断标准", value: "T", dimension: "T" },
          { label: "理解各方立场，先修复信任", value: "F", dimension: "F" }
        ]
      },
      {
        id: "mbti-8",
        title: "你更喜欢哪种工作节奏？",
        type: "single",
        required: true,
        options: [
          { label: "先规划，再稳定推进", value: "J", dimension: "J" },
          { label: "保留弹性，根据变化调整", value: "P", dimension: "P" }
        ]
      }
    ],
    reportTemplates: {
      默认: {
        title: "人格偏好画像",
        summary: "你的四维偏好组合展示了你在能量、信息、决策与节奏上的自然倾向。它不是能力边界，而是理解自己更省力工作方式的入口。",
        traits: ["有稳定的偏好模式", "在合适环境中效率更高", "面对压力时可能回到惯用策略"],
        strengths: ["更容易建立自我说明书", "能找到适合自己的协作方式", "有助于减少无谓自责"],
        risks: ["可能把偏好误当成能力限制", "在跨风格协作时需要刻意翻译表达方式"],
        growth: ["记录一周内让你充电和耗能的场景", "为一个弱偏好维度设计低风险练习", "在协作前主动说明工作偏好"],
        careers: ["选择与偏好匹配的沟通节奏和任务结构", "在团队中承担能发挥自然优势的角色"],
        relationships: ["表达偏好时避免贴标签", "把差异视为信息来源，而不是对错判断"]
      }
    }
  },
  {
    slug: "phq-9",
    title: "PHQ-9 情绪健康筛查",
    subtitle: "过去两周抑郁相关体验的自评筛查",
    categorySlug: "emotion",
    category: "情绪压力",
    description: "用于了解近期情绪低落、兴趣下降、睡眠和精力等状态。结果仅供自我观察，不构成诊断。",
    estimatedMinutes: 4,
    tags: ["PHQ-9", "情绪", "筛查"],
    scoring: { kind: "sum", maxScore: 27 },
    questions: [
      "做事时提不起劲或没有兴趣",
      "感到心情低落、沮丧或绝望",
      "入睡困难、睡不安稳或睡眠过多",
      "感到疲倦或没有精力",
      "食欲不振或吃太多",
      "觉得自己很糟，或觉得自己让自己或家人失望",
      "对事物专注有困难，例如看书或看电视",
      "动作或说话速度慢到别人可能注意到，或相反地坐立不安",
      "出现伤害自己的念头"
    ].map((title, index) => ({
      id: `phq9-${index + 1}`,
      title,
      helper: "请选择过去两周内该体验出现的频率。",
      type: "likert" as const,
      required: true,
      options: frequency4
    })),
    reportTemplates: {
      低: {
        title: "低水平情绪困扰",
        summary: "你的得分处于较低区间，近期抑郁相关体验不明显。继续保持稳定作息和支持性关系，会帮助你维持心理弹性。",
        traits: ["情绪波动整体可控", "日常功能受影响较少", "具备一定恢复资源"],
        strengths: ["能够维持基本节奏", "对自我状态有观察意识"],
        risks: ["低分不代表完全没有压力", "长期忽视疲劳可能累积成情绪消耗"],
        growth: ["保持睡眠与运动节律", "每周安排一次主动放松", "在压力上升时及时求助"],
        careers: ["维持任务边界", "避免长期超负荷"],
        relationships: ["持续表达需要", "保留稳定社交连接"]
      },
      中: {
        title: "中等情绪困扰",
        summary: "你的得分提示近期可能存在一定程度的情绪困扰。建议结合睡眠、工作压力和支持系统进行观察，必要时寻求专业帮助。",
        traits: ["情绪低落或兴趣下降可能更频繁", "精力与专注可能受影响", "需要更主动的恢复安排"],
        strengths: ["已经开始识别问题", "可以通过结构化行动改善状态"],
        risks: ["拖延求助可能增加功能损耗", "自责会放大情绪压力"],
        growth: ["建立两周情绪日志", "减少睡前刺激", "联系可信赖的人说明近况", "若持续加重，请预约专业咨询或就医"],
        careers: ["拆小任务并降低同时推进数量", "与上级沟通优先级"],
        relationships: ["用具体语言描述需要", "允许自己接受支持"]
      },
      高: {
        title: "较高情绪困扰",
        summary: "你的得分处于较高区间，建议尽快联系心理咨询师、精神科医生或当地危机支持资源。若出现伤害自己的想法，请立即联系身边可信任的人或紧急服务。",
        traits: ["情绪、睡眠、精力或自我评价可能明显受影响", "日常功能可能承压", "需要外部专业支持"],
        strengths: ["完成筛查本身就是求助信号", "你可以把结果作为沟通材料"],
        risks: ["独自承受会增加风险", "回避专业支持可能延误改善"],
        growth: ["今天就联系一位可信任的人", "预约专业评估", "移开潜在危险物品", "若有自伤风险，请立即拨打当地紧急电话"],
        careers: ["短期降低负荷并争取支持", "暂停重大不可逆决定"],
        relationships: ["明确告知近况和安全需求", "不要独自面对高风险时刻"]
      }
    }
  },
  {
    slug: "eysenck-personality",
    title: "艾森克人格测试",
    subtitle: "观察外向性、情绪稳定性与真实表达倾向",
    categorySlug: "personality",
    category: "人格探索",
    description: "轻量版人格维度探索，用于了解你在社交能量、情绪反应和自我表达上的常见模式。",
    estimatedMinutes: 6,
    tags: ["艾森克", "人格", "气质"],
    scoring: { kind: "dimension", maxScore: 6 },
    questions: [
      {
        id: "epq-1",
        title: "我在陌生环境里也比较容易主动开口。",
        type: "likert",
        dimension: "外向性",
        required: true,
        options: agreement5
      },
      {
        id: "epq-2",
        title: "遇到突发变化时，我的情绪会明显被带动。",
        type: "likert",
        dimension: "情绪敏感",
        required: true,
        options: agreement5
      },
      {
        id: "epq-3",
        title: "我更喜欢热闹、有互动感的场合。",
        type: "likert",
        dimension: "外向性",
        required: true,
        options: agreement5
      },
      {
        id: "epq-4",
        title: "我有时会为了显得更好而隐藏真实想法。",
        type: "likert",
        dimension: "社会赞许",
        required: true,
        options: agreement5
      },
      {
        id: "epq-5",
        title: "我会反复回想自己是否说错话或做错事。",
        type: "likert",
        dimension: "情绪敏感",
        required: true,
        options: agreement5
      },
      {
        id: "epq-6",
        title: "我通常愿意按自己的方式表达，而不太迎合别人期待。",
        type: "likert",
        dimension: "真实表达",
        required: true,
        options: agreement5
      }
    ],
    reportTemplates: genericTemplate("艾森克人格维度报告")
  },
  {
    slug: "gad-7",
    title: "GAD-7 焦虑筛查",
    subtitle: "过去两周焦虑相关体验自评",
    categorySlug: "emotion",
    category: "情绪压力",
    description: "评估担忧、紧张、放松困难等焦虑体验的频率。结果用于自我观察，不替代临床诊断。",
    estimatedMinutes: 3,
    tags: ["GAD-7", "焦虑", "筛查"],
    scoring: { kind: "sum", maxScore: 21 },
    questions: [
      "感到紧张、焦虑或急切",
      "不能停止或控制担忧",
      "对各种事情担忧过多",
      "很难放松下来",
      "坐立不安，以至于很难安静坐着",
      "变得容易烦恼或易怒",
      "感到似乎会有可怕的事情发生"
    ].map((title, index) => ({
      id: `gad7-${index + 1}`,
      title,
      helper: "请选择过去两周内该体验出现的频率。",
      type: "likert" as const,
      required: true,
      options: frequency4
    })),
    reportTemplates: {
      低: {
        title: "低水平焦虑体验",
        summary: "你的焦虑相关体验处于较低水平，说明当前担忧与紧张总体可管理。",
        traits: ["紧张体验较少", "能较快回到稳定状态", "日常判断受影响较低"],
        strengths: ["具备自我调节空间", "能维持基本节奏"],
        risks: ["突发压力仍可能带来波动", "过度追求稳定会降低弹性"],
        growth: ["保持规律运动", "为重要事务预留缓冲时间", "练习呼吸放松"],
        careers: ["用清单减少悬而未决感", "保持任务节奏"],
        relationships: ["在压力升高前提前沟通", "避免把担忧变成控制"]
      },
      中: {
        title: "中等焦虑体验",
        summary: "你的结果提示焦虑体验较明显。建议把担忧具体化，区分可行动事项与暂时不可控事项。",
        traits: ["担忧可能反复出现", "放松和睡眠可能受影响", "需要主动降载"],
        strengths: ["对风险敏感", "有提前规划能力"],
        risks: ["长期警觉会消耗精力", "回避会让焦虑维持"],
        growth: ["每天设置固定担忧时间", "把担忧写成行动清单", "逐步面对被回避的小任务"],
        careers: ["减少多线程任务", "确认优先级和截止时间"],
        relationships: ["表达担忧背后的需要", "避免用反复确认替代信任"]
      },
      高: {
        title: "较高焦虑体验",
        summary: "你的焦虑体验处于较高区间，建议考虑专业评估与支持，特别是当焦虑影响睡眠、工作或关系时。",
        traits: ["担忧强度和频率较高", "身体紧张可能更明显", "日常功能可能被影响"],
        strengths: ["你已经识别到状态变化", "适合借助专业工具系统改善"],
        risks: ["持续高警觉会引发疲劳", "过度回避可能缩小生活范围"],
        growth: ["预约心理咨询或医疗评估", "建立睡前放松流程", "减少咖啡因与熬夜", "联系支持者一起制定安全计划"],
        careers: ["协商阶段性目标", "保留恢复时间"],
        relationships: ["让亲近的人了解你的触发点", "共同约定支持方式"]
      }
    }
  },
  {
    slug: "stress-index",
    title: "压力指数测评",
    subtitle: "识别压力来源与恢复能力",
    categorySlug: "emotion",
    category: "情绪压力",
    description: "从身体、情绪、认知和行为四个层面评估近期压力水平。",
    estimatedMinutes: 5,
    tags: ["压力", "恢复力", "情绪管理"],
    scoring: { kind: "sum", maxScore: 30 },
    questions: [
      "最近我经常觉得时间不够用",
      "我比平时更容易烦躁",
      "我难以从工作或学习中抽离",
      "我感觉身体紧绷或疲惫",
      "我会因为小事反复担心",
      "我减少了让自己恢复的活动"
    ].map((title, index) => ({
      id: `stress-${index + 1}`,
      title,
      type: "likert" as const,
      required: true,
      options: agreement5
    })),
    reportTemplates: genericTemplate("压力恢复报告")
  },
  {
    slug: "sleep-quality",
    title: "睡眠质量测试",
    subtitle: "观察近期睡眠节律、恢复感与入睡压力",
    categorySlug: "emotion",
    category: "情绪压力",
    description: "从入睡、夜醒、晨起恢复和睡前心理负担四个角度，了解你的睡眠状态。",
    estimatedMinutes: 4,
    tags: ["睡眠", "压力", "恢复"],
    scoring: { kind: "sum", maxScore: 30 },
    questions: [
      "我最近入睡需要比平时更久",
      "我夜里容易醒来，或醒后很难再次入睡",
      "即使睡够时间，醒来后仍感觉疲惫",
      "睡前我会反复想白天没完成的事",
      "我会因为担心睡不好而更难放松",
      "我的作息时间最近比较不稳定"
    ].map((title, index) => ({
      id: `sleep-${index + 1}`,
      title,
      type: "likert" as const,
      required: true,
      options: agreement5
    })),
    reportTemplates: genericTemplate("睡眠恢复报告")
  },
  {
    slug: "disc",
    title: "DISC 行为风格",
    subtitle: "了解你在目标、协作与变化中的行为倾向",
    categorySlug: "personality",
    category: "人格探索",
    description: "识别 D/I/S/C 四类行为风格，帮助你优化沟通和团队角色。",
    estimatedMinutes: 6,
    tags: ["DISC", "团队", "沟通"],
    scoring: { kind: "disc", maxScore: 6 },
    questions: [
      {
        id: "disc-1",
        title: "面对困难任务，你更自然的反应是：",
        type: "single",
        required: true,
        options: [
          { label: "迅速推进，先拿到结果", value: "D", dimension: "D" },
          { label: "调动氛围，带动大家参与", value: "I", dimension: "I" },
          { label: "稳定节奏，照顾团队感受", value: "S", dimension: "S" },
          { label: "先分析风险，确保质量", value: "C", dimension: "C" }
        ]
      },
      {
        id: "disc-2",
        title: "别人通常认为你的优势是：",
        type: "single",
        required: true,
        options: [
          { label: "果断", value: "D", dimension: "D" },
          { label: "有感染力", value: "I", dimension: "I" },
          { label: "可靠", value: "S", dimension: "S" },
          { label: "严谨", value: "C", dimension: "C" }
        ]
      },
      {
        id: "disc-3",
        title: "当规则不清晰时，你倾向于：",
        type: "single",
        required: true,
        options: [
          { label: "先行动，再修正", value: "D", dimension: "D" },
          { label: "先沟通共识", value: "I", dimension: "I" },
          { label: "等待更多信息", value: "S", dimension: "S" },
          { label: "补齐标准与依据", value: "C", dimension: "C" }
        ]
      },
      {
        id: "disc-4",
        title: "高压时你最可能：",
        type: "single",
        required: true,
        options: [
          { label: "变得强势直接", value: "D", dimension: "D" },
          { label: "寻求互动支持", value: "I", dimension: "I" },
          { label: "避免冲突", value: "S", dimension: "S" },
          { label: "纠结细节", value: "C", dimension: "C" }
        ]
      }
    ],
    reportTemplates: genericTemplate("DISC 行为风格报告")
  },
  {
    slug: "enneagram",
    title: "九型人格测评",
    subtitle: "探索你的核心动机与防御模式",
    categorySlug: "personality",
    category: "人格探索",
    description: "从动机层面了解自己的惯性反应和成长方向。",
    estimatedMinutes: 8,
    tags: ["九型人格", "动机", "成长"],
    scoring: { kind: "enneagram", maxScore: 9 },
    questions: [
      {
        id: "enn-1",
        title: "以下哪句话更像你内心深处的驱动力？",
        type: "single",
        required: true,
        options: [
          { label: "我希望事情是正确和有原则的", value: "1", dimension: "1" },
          { label: "我希望自己被需要和感谢", value: "2", dimension: "2" },
          { label: "我希望达成目标并被认可", value: "3", dimension: "3" },
          { label: "我希望活得真实而独特", value: "4", dimension: "4" },
          { label: "我希望掌握知识并保持独立", value: "5", dimension: "5" },
          { label: "我希望安全可预期", value: "6", dimension: "6" },
          { label: "我希望拥有选择和快乐体验", value: "7", dimension: "7" },
          { label: "我希望掌控局面并保护自己人", value: "8", dimension: "8" },
          { label: "我希望保持和谐和平静", value: "9", dimension: "9" }
        ]
      },
      {
        id: "enn-2",
        title: "当你被误解时，最常见的反应是：",
        type: "single",
        required: true,
        options: [
          { label: "指出哪里不合理", value: "1", dimension: "1" },
          { label: "更努力地照顾对方", value: "2", dimension: "2" },
          { label: "证明自己的能力", value: "3", dimension: "3" },
          { label: "感到受伤并抽离", value: "4", dimension: "4" },
          { label: "退回自己的空间分析", value: "5", dimension: "5" },
          { label: "反复确认对方态度", value: "6", dimension: "6" },
          { label: "转向更轻松的事", value: "7", dimension: "7" },
          { label: "直接对抗", value: "8", dimension: "8" },
          { label: "先让事情过去", value: "9", dimension: "9" }
        ]
      }
    ],
    reportTemplates: genericTemplate("九型人格成长报告")
  },
  {
    slug: "holland-career",
    title: "霍兰德职业兴趣",
    subtitle: "了解你的职业兴趣代码",
    categorySlug: "career",
    category: "职业发展",
    description: "从 RIASEC 六类兴趣出发，识别更能激发投入感的职业环境。",
    estimatedMinutes: 6,
    tags: ["霍兰德", "职业兴趣", "RIASEC"],
    scoring: { kind: "holland", maxScore: 6 },
    questions: [
      {
        id: "hol-1",
        title: "你最愿意投入时间的活动是：",
        type: "multiple",
        required: true,
        max: 2,
        options: [
          { label: "动手制作或修理", value: "R", dimension: "R" },
          { label: "研究问题和数据", value: "I", dimension: "I" },
          { label: "创作表达", value: "A", dimension: "A" },
          { label: "帮助和教导他人", value: "S", dimension: "S" },
          { label: "影响和推动决策", value: "E", dimension: "E" },
          { label: "整理流程与细节", value: "C", dimension: "C" }
        ]
      },
      {
        id: "hol-2",
        title: "你理想的工作环境更接近：",
        type: "multiple",
        required: true,
        max: 2,
        options: [
          { label: "设备、工具和真实场景", value: "R", dimension: "R" },
          { label: "实验、分析和探索", value: "I", dimension: "I" },
          { label: "自由、有审美和表达空间", value: "A", dimension: "A" },
          { label: "合作、支持和服务", value: "S", dimension: "S" },
          { label: "竞争、目标和资源整合", value: "E", dimension: "E" },
          { label: "规范、秩序和稳定流程", value: "C", dimension: "C" }
        ]
      }
    ],
    reportTemplates: genericTemplate("职业兴趣报告")
  },
  {
    slug: "eq-test",
    title: "情商测试",
    subtitle: "了解你的情绪识别、表达与关系回应方式",
    categorySlug: "social",
    category: "社交关系",
    description: "从自我觉察、情绪调节、共情和沟通四个维度，观察你在人际互动中的情绪能力。",
    estimatedMinutes: 5,
    tags: ["情商", "情绪识别", "人际沟通"],
    scoring: { kind: "dimension", maxScore: 6 },
    questions: [
      {
        id: "eq-1",
        title: "我能比较快意识到自己情绪变化背后的原因。",
        type: "likert",
        dimension: "自我觉察",
        required: true,
        options: agreement5
      },
      {
        id: "eq-2",
        title: "即使情绪上来了，我也能尽量选择合适的表达方式。",
        type: "likert",
        dimension: "情绪调节",
        required: true,
        options: agreement5
      },
      {
        id: "eq-3",
        title: "别人没明说时，我也能从细节里觉察到对方的感受。",
        type: "likert",
        dimension: "共情理解",
        required: true,
        options: agreement5
      },
      {
        id: "eq-4",
        title: "发生误会时，我通常愿意先确认事实和感受。",
        type: "likert",
        dimension: "沟通修复",
        required: true,
        options: agreement5
      }
    ],
    reportTemplates: genericTemplate("情商能力报告")
  },
  {
    slug: "love-languages",
    title: "爱的五种语言",
    subtitle: "了解你接收和表达爱的方式",
    categorySlug: "relationship",
    category: "情感关系",
    description: "识别肯定言语、陪伴、礼物、服务行动、身体接触五类关系需求。",
    estimatedMinutes: 5,
    tags: ["亲密关系", "沟通", "爱的语言"],
    scoring: { kind: "dimension", maxScore: 5 },
    questions: [
      {
        id: "love-1",
        title: "以下哪件事最容易让你感到被爱？",
        type: "single",
        required: true,
        options: [
          { label: "真诚夸奖和肯定", value: "肯定言语", dimension: "肯定言语" },
          { label: "专注地一起相处", value: "高质量陪伴", dimension: "高质量陪伴" },
          { label: "收到用心准备的小礼物", value: "礼物", dimension: "礼物" },
          { label: "对方主动帮你分担事情", value: "服务行动", dimension: "服务行动" },
          { label: "拥抱、牵手或亲近接触", value: "身体接触", dimension: "身体接触" }
        ]
      },
      {
        id: "love-2",
        title: "你更常用哪种方式表达在乎？",
        type: "single",
        required: true,
        options: [
          { label: "说鼓励的话", value: "肯定言语", dimension: "肯定言语" },
          { label: "安排共同时间", value: "高质量陪伴", dimension: "高质量陪伴" },
          { label: "准备惊喜", value: "礼物", dimension: "礼物" },
          { label: "替对方处理实际问题", value: "服务行动", dimension: "服务行动" },
          { label: "用身体亲近传递安全感", value: "身体接触", dimension: "身体接触" }
        ]
      }
    ],
    reportTemplates: genericTemplate("关系需求报告")
  },
  {
    slug: "attachment-style",
    title: "依恋人格测试",
    subtitle: "理解亲密关系中的安全感模式",
    categorySlug: "relationship",
    category: "情感关系",
    description: "从安全、焦虑、回避等倾向看见关系里的触发点与修复方式。",
    estimatedMinutes: 6,
    tags: ["依恋", "亲密关系", "安全感"],
    scoring: { kind: "attachment", maxScore: 5 },
    questions: [
      {
        id: "att-1",
        title: "当对方回复变慢时，我通常会：",
        type: "single",
        required: true,
        options: [
          { label: "能理解对方可能在忙", value: "secure", dimension: "安全型" },
          { label: "担心是不是关系出问题", value: "anxious", dimension: "焦虑型" },
          { label: "提醒自己不要太依赖", value: "avoidant", dimension: "回避型" }
        ]
      },
      {
        id: "att-2",
        title: "关系越亲近时，我越容易：",
        type: "single",
        required: true,
        options: [
          { label: "感到踏实并愿意沟通", value: "secure", dimension: "安全型" },
          { label: "需要反复确认对方在乎我", value: "anxious", dimension: "焦虑型" },
          { label: "想保留更多距离和自由", value: "avoidant", dimension: "回避型" }
        ]
      },
      {
        id: "att-3",
        title: "发生冲突后，我更倾向于：",
        type: "single",
        required: true,
        options: [
          { label: "冷静后讨论如何修复", value: "secure", dimension: "安全型" },
          { label: "马上追问对方态度", value: "anxious", dimension: "焦虑型" },
          { label: "先躲开，不想谈", value: "avoidant", dimension: "回避型" }
        ]
      }
    ],
    reportTemplates: genericTemplate("依恋关系报告")
  },
  {
    slug: "love-attitude",
    title: "爱情态度测试",
    subtitle: "看见你在爱情中的期待、节奏与安全需求",
    categorySlug: "relationship",
    category: "情感关系",
    description: "从浪漫表达、承诺期待、自主空间和关系安全感四个角度观察你的爱情态度。",
    estimatedMinutes: 5,
    tags: ["爱情观", "亲密关系", "恋爱模式"],
    scoring: { kind: "dimension", maxScore: 6 },
    questions: [
      {
        id: "loveatt-1",
        title: "我认为爱情里仪式感和浪漫表达很重要。",
        type: "likert",
        dimension: "浪漫表达",
        required: true,
        options: agreement5
      },
      {
        id: "loveatt-2",
        title: "确认关系后，我会更期待稳定承诺和长期规划。",
        type: "likert",
        dimension: "承诺期待",
        required: true,
        options: agreement5
      },
      {
        id: "loveatt-3",
        title: "即使亲密，我也希望双方保留各自的空间。",
        type: "likert",
        dimension: "自主空间",
        required: true,
        options: agreement5
      },
      {
        id: "loveatt-4",
        title: "关系里的不确定感会让我很难放松。",
        type: "likert",
        dimension: "安全需求",
        required: true,
        options: agreement5
      }
    ],
    reportTemplates: genericTemplate("爱情态度报告")
  },
  {
    slug: "social-anxiety",
    title: "社交焦虑测试",
    subtitle: "了解你在社交场景中的紧张与回避倾向",
    categorySlug: "social",
    category: "社交关系",
    description: "评估公开表达、被评价担忧和社交后反刍等体验，结果仅用于自我觉察。",
    estimatedMinutes: 4,
    tags: ["社交焦虑", "人际", "自我觉察"],
    scoring: { kind: "sum", maxScore: 30 },
    questions: [
      "在需要主动开口的场合，我会明显紧张",
      "我担心别人注意到我的尴尬或不自然",
      "社交结束后，我会反复回想自己表现得怎样",
      "我会为了避免尴尬而减少某些社交机会",
      "被当众评价时，我会很难保持放松",
      "和不熟的人交流前，我会提前担心很多"
    ].map((title, index) => ({
      id: `social-anxiety-${index + 1}`,
      title,
      type: "likert" as const,
      required: true,
      options: agreement5
    })),
    reportTemplates: genericTemplate("社交焦虑观察报告")
  },
  {
    slug: "interpersonal-skills",
    title: "人际交往能力测试",
    subtitle: "观察你的沟通、边界、倾听与冲突修复能力",
    categorySlug: "social",
    category: "社交关系",
    description: "帮助你识别在人际互动中的优势能力与可练习方向。",
    estimatedMinutes: 5,
    tags: ["人际交往", "沟通", "边界"],
    scoring: { kind: "dimension", maxScore: 6 },
    questions: [
      {
        id: "interpersonal-1",
        title: "别人说话时，我能先听懂对方想表达的重点。",
        type: "likert",
        dimension: "倾听理解",
        required: true,
        options: agreement5
      },
      {
        id: "interpersonal-2",
        title: "我能比较清楚地表达自己的需求和边界。",
        type: "likert",
        dimension: "边界表达",
        required: true,
        options: agreement5
      },
      {
        id: "interpersonal-3",
        title: "发生分歧时，我愿意讨论问题而不是只争输赢。",
        type: "likert",
        dimension: "冲突修复",
        required: true,
        options: agreement5
      },
      {
        id: "interpersonal-4",
        title: "我能在关系中主动给予回应和支持。",
        type: "likert",
        dimension: "关系维护",
        required: true,
        options: agreement5
      }
    ],
    reportTemplates: genericTemplate("人际交往能力报告")
  }
];

export const membershipPlans: MembershipPlan[] = [
  {
    slug: "free",
    name: "免费版",
    priceCents: 0,
    period: "每日 1 次",
    description: "适合首次体验心理测评与基础报告。",
    features: ["每日 1 次测评", "查看基础报告", "文章阅读与收藏"]
  },
  {
    slug: "monthly",
    name: "月会员",
    priceCents: 1990,
    period: "每月",
    description: "适合持续探索人格、情绪与关系议题。",
    features: ["无限测评", "高级报告", "历史记录", "专属内容"],
    highlighted: true
  },
  {
    slug: "quarterly",
    name: "季会员",
    priceCents: 2380,
    period: "每季",
    description: "适合连续 3 个月使用心理测评与高级报告。",
    features: ["3 个月会员权益", "无限测评", "高级报告", "历史记录"]
  },
  {
    slug: "yearly",
    name: "年会员",
    priceCents: 16800,
    period: "每年",
    description: "适合建立长期心理成长档案。",
    features: ["无限测评", "高级报告", "心理成长档案", "优先体验功能"]
  },
  {
    slug: "single-report",
    name: "单次解锁",
    priceCents: 390,
    period: "当前报告",
    description: "无需开通会员，解锁当前测评高级分析。",
    features: ["解锁当前报告", "无需订阅", "永久查看该报告"]
  }
];

export const articles: Article[] = [
  {
    slug: "emotion-labeling",
    title: "把情绪说清楚，压力会先下降一点",
    excerpt: "情绪命名不是鸡汤，而是让大脑从警报模式回到观察模式的练习。",
    category: "情绪管理",
    tags: ["情绪", "压力", "自我觉察"],
    readingMinutes: 6,
    publishedAt: "2026-05-12",
    content:
      "当你把“我很糟糕”拆成“我现在焦虑、疲惫，还有一点失望”，体验会从混乱变得可观察。下一步不是立刻解决全部问题，而是问自己：这份情绪在提醒我什么需求？"
  },
  {
    slug: "relationship-boundary",
    title: "边界感不是疏远，而是让关系更可持续",
    excerpt: "清楚表达时间、精力和情绪边界，能减少关系里的猜测与消耗。",
    category: "人际关系",
    tags: ["边界", "沟通", "亲密关系"],
    readingMinutes: 7,
    publishedAt: "2026-05-18",
    content:
      "好的边界通常包含三件事：我能做什么、我暂时不能做什么、我愿意如何继续连接。它不是惩罚对方，而是告诉关系如何更稳定地运转。"
  },
  {
    slug: "career-energy-audit",
    title: "职业选择前，先做一次能量审计",
    excerpt: "比起只问喜欢什么，更有效的问题是：哪些任务让你更有生命力？",
    category: "职场成长",
    tags: ["职业", "能量", "成长"],
    readingMinutes: 5,
    publishedAt: "2026-05-21",
    content:
      "连续记录两周工作任务，把每件事标记为充电、持平或耗电。你会更快看到适合自己的工作结构，而不是只被职位名称吸引。"
  },
  {
    slug: "self-growth-system",
    title: "自我提升真正有效时，通常很朴素",
    excerpt: "稳定记录、小步实验、及时反馈，比一次性改变更可持续。",
    category: "自我提升",
    tags: ["习惯", "复盘", "成长"],
    readingMinutes: 6,
    publishedAt: "2026-05-26",
    content:
      "把成长目标缩小到可执行动作，例如“每天睡前写三行复盘”。持续两周后，根据真实反馈调整，而不是凭意志力硬撑。"
  }
];
