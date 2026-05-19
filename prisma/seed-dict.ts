// Dictionary seed: 资源来源 (附录3) / 专业 (附录2) / 院校层次 (附录2).
// Imported and run by prisma/seed.ts.

import type { PrismaClient } from "@prisma/client";

// ───── 资源来源 (Channel tree) ──────────────────────────
// Structure: L1 [name] → L2 [name, [L3 names]]
type L2 = { name: string; l3?: string[] };
type L1 = { name: string; l2: L2[] };

export const CHANNEL_TREE: L1[] = [
  {
    name: "自主获客-运营",
    l2: [
      { name: "小红书", l3: [
        "@知日塾日本留学", "@知日音乐", "@元气体育", "@知日塾社会学研究所",
        "@知日塾学部咨询", "@知日塾日语频道", "@知日理工塾", "@知日塾·上海",
        "@知日教育集团", "@Aya学姐", "非官方账号/模糊",
      ]},
      { name: "微信",   l3: ["公众号", "视频号"] },
      { name: "B站",    l3: ["@知日塾日语频道", "@知日塾日本留学"] },
      { name: "网页",   l3: ["官网", "谷歌", "百度", "搜索"] },
      { name: "大众点评", l3: [
        "成都·留学·来福士", "成都·留学·IFS", "成都·日语·来福士",
        "上海·留学·鸿寿坊", "广州·留学·IFC",
      ]},
      { name: "知乎",      l3: ["@知日塾日本留学"] },
      { name: "YouTube",   l3: ["@知日塾日本留学"] },
      { name: "抖音",      l3: ["@知日塾日本留学"] },
      { name: "微博",      l3: ["@知日塾日本留学"] },
      { name: "自然流入walkin" },
      { name: "口碑/模糊搜索" },
    ],
  },
  {
    name: "自主获客-美术",
    l2: [
      { name: "小红书", l3: [
        "@CHIART知日美术", "@知日美术留学·上海", "@CHIART日本艺术留学",
        "@知日美术·关西校", "@CHI Gallery", "@知日美术合格档案",
      ]},
      { name: "微信",   l3: ["公众号", "视频号"] },
      { name: "B站",    l3: ["@CHIART知日美术"] },
      { name: "知乎",   l3: ["@知日美术CHIART"] },
      { name: "抖音",   l3: ["@CHIART知日美术"] },
      { name: "微博",   l3: ["@知日美术CHIART"] },
      { name: "口碑/模糊搜索" },
    ],
  },
  {
    name: "元气体育",
    l2: [
      { name: "个人渠道" }, { name: "小红书" }, { name: "微信" }, { name: "B站" },
    ],
  },
  {
    name: "市场渠道",
    l2: [
      { name: "官方合作", l3: [
        "线上留学平台", "留学服务中介", "日语培训机构", "英语培训机构",
        "作品集机构", "升学择校机构", "异业合作", "校园活动", "学生代理", "校园渠道",
      ]},
      { name: "个人渠道", l3: [
        "留学服务中介", "日语培训机构", "英语培训机构", "作品集机构",
        "升学择校机构", "异业合作", "校园活动", "学生代理", "校园渠道",
      ]},
    ],
  },
  {
    name: "决策中心直管",
    l2: [
      { name: "薛老师", l3: [
        "芥末","陈思宇","初心","妙途","青田","八角","峰峰","青柠","青创",
        "不二","早安","J研","稻承","北北","新思域","令和","和风","于老师",
        "小猫","武藏浦和","尹司","有间","小李校长","朱红","西瓜","江哥",
        "杭州陈老师","七七老师","佘映云","卢老师","其他",
      ]},
      { name: "高老师" },
      { name: "侯老师" },
    ],
  },
  {
    name: "推荐转介绍",
    l2: [
      { name: "员工推荐" }, { name: "塾生推荐" }, { name: "未知" },
    ],
  },
  {
    name: "分校区资源",
    l2: [
      { name: "武汉校", l3: [
        "小红书","大众点评","抖音","Call-in/Walk-in","市场渠道-个人","市场渠道-机构",
      ]},
      { name: "西安校", l3: [
        "小红书","微信","大众点评","抖音","百度/高德/腾讯地图","知了好学西安校",
        "Call-in/Walk-in","市场渠道-个人","市场渠道-机构",
      ]},
      { name: "上海校", l3: ["个人渠道"] },
      { name: "广州校", l3: ["个人渠道"] },
      { name: "杭州校", l3: ["个人渠道"] },
    ],
  },
];

// ───── 专业 (附录2.专业列表) ──────────────────────────
type MajorL2 = { l1: string; l2: string[] };

export const MAJOR_TREE: MajorL2[] = [
  { l1: "文科", l2: [
    "社会学","经营学","经济学","教育学","传媒学","法学","心理学","表象文化论",
    "日本语教育","国际关系","文学","文化人类学","会计学","观光学","福祉学","其他&未定",
  ]},
  { l1: "理科", l2: [
    "化学","情报学","生物学","数学","电气工学","环境学","建筑学","经营工学",
    "机械工学","土木工学","物理学","材料学","其他&未定",
  ]},
  { l1: "美术", l2: [
    "平面/视传","插画","ACG","服装/染织","映像/写真/映画","纯艺","工艺","情报/媒体",
    "艺术理论","产品/工业","文物修复","书法","环境/建筑","新兴专业","其他&未定",
  ]},
  { l1: "音乐", l2: [
    "音乐制作","古典作曲","音乐治疗","音乐学","音乐表演","流行乐","爵士乐",
    "音乐教育","艺术管理（音乐）","其他&未定",
  ]},
  { l1: "体育", l2: [
    "体育教育学","体育社会学","体育历史","体育哲学","体育传媒学","体育经营管理学",
    "运动训练学","体育医科学","运动康复学","人体工学人体力学","体育健康学","其他&未定",
  ]},
  { l1: "医学", l2: ["医学大类","其他&未定"] },
];

// ───── 院校层次 (附录2.前置学校层级) ──────────────────────
type Tier = { category: string; subgroup: string | null; name: string };
export const SCHOOL_TIERS: Tier[] = [
  // 文理类
  { category: "ARTS_SCIENCES", subgroup: null, name: "211及以上" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "双非一本/二本/民办本科" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "大专/职校" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "日本学校（所有学段）" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "其他海外地区高校" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "国际教育（中学）" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "公立中学" },
  { category: "ARTS_SCIENCES", subgroup: null, name: "未知" },
  // 艺术类 - 美术
  { category: "ART", subgroup: "美术", name: "美术类" },
  { category: "ART", subgroup: "美术", name: "非美术类" },
  { category: "ART", subgroup: "美术", name: "其他" },
  // 艺术类 - 音乐
  { category: "ART", subgroup: "音乐", name: "音乐学院" },
  { category: "ART", subgroup: "音乐", name: "综合类大学音乐系" },
  { category: "ART", subgroup: "音乐", name: "其他" },
  // 体育类
  { category: "SPORTS", subgroup: null, name: "专业体育生" },
  { category: "SPORTS", subgroup: null, name: "非专业体育生" },
];

// ───── Seed function ──────────────────────────────────
export async function seedDictionaries(prisma: PrismaClient) {
  // Wipe dict tables
  await prisma.major.deleteMany();
  await prisma.schoolTier.deleteMany();
  await prisma.channel.deleteMany();

  // Channels
  for (const l1 of CHANNEL_TREE) {
    const top = await prisma.channel.create({
      data: { name: l1.name, level: "L1" },
    });
    for (const l2 of l1.l2) {
      const mid = await prisma.channel.create({
        data: { name: l2.name, level: "L2", parentId: top.id },
      });
      for (const l3name of l2.l3 ?? []) {
        await prisma.channel.create({
          data: { name: l3name, level: "L3", parentId: mid.id },
        });
      }
    }
  }

  // Majors
  for (const grp of MAJOR_TREE) {
    const l1 = await prisma.major.create({
      data: { name: grp.l1, level: 1 },
    });
    for (const m of grp.l2) {
      await prisma.major.create({
        data: { name: m, level: 2, parentId: l1.id },
      });
    }
  }

  // SchoolTiers
  await prisma.schoolTier.createMany({
    data: SCHOOL_TIERS.map((t, i) => ({ ...t, order: i })),
  });

  // Counts for the log
  const [c, m, s] = await Promise.all([
    prisma.channel.count(),
    prisma.major.count(),
    prisma.schoolTier.count(),
  ]);
  return { channels: c, majors: m, schoolTiers: s };
}
