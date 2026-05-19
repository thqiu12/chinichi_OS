import { PrismaClient, type DivisionKind, type StudentStage } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDictionaries } from "./seed-dict";

const prisma = new PrismaClient();

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

async function main() {
  console.log("→ seeding…");

  // Wipe (dev only)
  await prisma.$transaction([
    prisma.timelineEvent.deleteMany(),
    prisma.lessonFeedback.deleteMany(),
    prisma.lessonStudent.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.deadline.deleteMany(),
    prisma.todo.deleteMany(),
    prisma.followUp.deleteMany(),
    prisma.echoSnapshot.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.studentAccount.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.advisorFollowUp.deleteMany(),
    prisma.frontendFollowUp.deleteMany(),
    prisma.leadActivity.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.student.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.user.deleteMany(),
    prisma.division.deleteMany(),
  ]);

  // ── Dictionaries (Channel / Major / SchoolTier) ──
  const dict = await seedDictionaries(prisma);
  console.log(`  ✓ dict seeded: ${dict.channels} channels · ${dict.majors} majors · ${dict.schoolTiers} school tiers`);

  // Divisions
  const divs = await Promise.all(
    [
      { name: "美术",   kind: "ART"      as DivisionKind, isShared: false },
      { name: "音乐",   kind: "MUSIC"    as DivisionKind, isShared: false },
      { name: "学部",   kind: "GAKUBU"   as DivisionKind, isShared: false },
      { name: "大学院", kind: "GRADUATE" as DivisionKind, isShared: false },
      { name: "文理科", kind: "LIBERAL"  as DivisionKind, isShared: false },
      { name: "日语组", kind: "SHARED"   as DivisionKind, isShared: true  },
    ].map((d) => prisma.division.create({ data: d })),
  );
  const byKind = Object.fromEntries(divs.map((d) => [d.kind, d]));

  // Users
  const pw = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.create({
    data: { email: "admin@chinichi.local", password: pw, name: "管理员", role: "ADMIN" },
  });
  const mentor = await prisma.user.create({
    data: { email: "mentor@chinichi.local", password: pw, name: "佐藤先生", role: "MENTOR" },
  });
  const teacherJp = await prisma.user.create({
    data: { email: "jp@chinichi.local", password: pw, name: "山田先生", role: "TEACHER" },
  });
  const teacherArt = await prisma.user.create({
    data: { email: "art@chinichi.local", password: pw, name: "鈴木先生", role: "TEACHER" },
  });
  const sales = await prisma.user.create({
    data: { email: "sales@chinichi.local", password: pw, name: "王 sales", role: "SALES" },
  });
  const channel = await prisma.user.create({
    data: { email: "channel@chinichi.local", password: pw, name: "李 渠道", role: "CHANNEL" },
  });
  const marketing = await prisma.user.create({
    data: { email: "mkt@chinichi.local", password: pw, name: "赵 品宣", role: "MARKETING" },
  });
  const head = await prisma.user.create({
    data: { email: "head@chinichi.local", password: pw, name: "陈 校长", role: "HEAD" },
  });

  await prisma.membership.createMany({
    data: [
      { userId: mentor.id,    divisionId: byKind.GRADUATE.id, role: "MENTOR" },
      { userId: teacherJp.id, divisionId: byKind.SHARED.id,   role: "TEACHER" },
      { userId: teacherJp.id, divisionId: byKind.GRADUATE.id, role: "TEACHER" },
      { userId: teacherJp.id, divisionId: byKind.ART.id,      role: "TEACHER" },
      { userId: teacherArt.id,divisionId: byKind.ART.id,      role: "TEACHER" },
    ],
  });

  // Pick some seed channels by name for the sample leads
  const ch = async (name: string, level: "L1"|"L2"|"L3" = "L3") =>
    prisma.channel.findFirst({ where: { name, level } });

  const chXiaoHongShu = await ch("小红书", "L2");
  const chZhirisuLearn = await ch("@知日塾日本留学", "L3");
  const chChiart = await ch("@CHIART知日美术", "L3");
  const chReferralEmp = await ch("员工推荐", "L2");
  const chXueLaoshi = await ch("薛老师", "L2");

  // Sample majors
  const majorJobao = await prisma.major.findFirst({ where: { name: "情报学", level: 2 } });
  const majorEdu   = await prisma.major.findFirst({ where: { name: "教育学", level: 2 } });
  const majorIllu  = await prisma.major.findFirst({ where: { name: "插画",   level: 2 } });

  // Sample school tiers
  const tier211   = await prisma.schoolTier.findFirst({ where: { name: "211及以上" } });
  const tierArt   = await prisma.schoolTier.findFirst({ where: { name: "美术类" } });
  const tierJpHs  = await prisma.schoolTier.findFirst({ where: { name: "日本学校（所有学段）" } });

  // ── Leads ──
  const now = new Date();

  const leadZhou = await prisma.lead.create({
    data: {
      name: "周晓雯",
      phone: "13800001111", wechatId: "zhouxw",
      resourceAttribute: "VALID",
      advisorConfirmation: "INTENT_CONFIRMED",
      conversionStage: "长线资源",
      primaryChannelId: chZhirisuLearn?.id,
      sourceDetail: "笔记《东大情报学院申请攻略》评论区",
      sourceCampus: "成都",
      degreeType: "大学院-修士",
      subjectArea: "理科",
      targetMajorId: majorJobao?.id,
      schoolTierId: tier211?.id,
      grade: "大四",
      graduationYear: 2026,
      province: "四川", city: "成都",
      identityKind: "STUDENT",
      jlpt: "N2",
      englishLevel: "CET6",
      japanStatus: "尚未赴日",
      langSchoolStatus: "NO_NEED",
      salesId: sales.id,
      ownerIds: [sales.id],
      conversionProbability: 70,
      nextAction: "本周三试听后跟进",
      nextActionDueAt: addDays(now, 3),
      lastAdvisorFollowUpAt: addDays(now, -2),
    },
  });

  const leadLiu = await prisma.lead.create({
    data: {
      name: "刘星辰",
      phone: "13800002222", wechatId: "liu_xingchen",
      resourceAttribute: "VALID",
      advisorConfirmation: "PENDING",
      conversionStage: "机会资源",
      primaryChannelId: (await ch("公众号", "L3"))?.id ?? chXiaoHongShu?.id,
      degreeType: "学部",
      subjectArea: "文科",
      targetMajorId: majorEdu?.id,
      schoolTierId: tier211?.id,
      grade: "高三", graduationYear: 2027,
      province: "上海", city: "上海",
      identityKind: "STUDENT",
      jlpt: "N3_N4",
      langSchoolStatus: "NOT_APPLIED",
      salesId: sales.id,
      ownerIds: [sales.id],
      conversionProbability: 55,
      nextAction: "确认试听课时间", nextActionDueAt: addDays(now, 1),
    },
  });

  await prisma.lead.create({
    data: {
      name: "高奈奈",
      phone: "13800003333", wechatId: "gaonana",
      resourceAttribute: "VALID",
      advisorConfirmation: "PENDING",
      conversionStage: "挖需中",
      primaryChannelId: chChiart?.id,
      degreeType: "学部",
      subjectArea: "美术",
      targetMajorId: majorIllu?.id,
      schoolTierId: tierArt?.id,
      grade: "高三", graduationYear: 2027,
      province: "广东", city: "广州",
      identityKind: "STUDENT",
      jlpt: "STUDYING",
      langSchoolStatus: "NOT_APPLIED",
      salesId: sales.id,
      ownerIds: [sales.id, marketing.id],
      conversionProbability: 30,
      nextAction: "约一次面咨", nextActionDueAt: addDays(now, 5),
    },
  });

  await prisma.lead.create({
    data: {
      name: "Tanaka Yui",
      phone: "08012345678", wechatId: "tanaka_yui",
      resourceAttribute: "PENDING",
      primaryChannelId: chReferralEmp?.id,
      degreeType: "大学院-修士",
      subjectArea: "暂未知",
      schoolTierId: tierJpHs?.id,
      identityKind: "STUDENT",
      jlpt: "N1",
      langSchoolStatus: "ENROLLED",
      langSchoolEnrollMonth: "2025-04",
      salesId: sales.id, ownerIds: [sales.id],
      conversionProbability: 15,
      nextAction: "首次电话沟通", nextActionDueAt: addDays(now, 2),
    },
  });

  await prisma.lead.create({
    data: {
      name: "李铭",
      phone: "13800005555", wechatId: "liming_music",
      resourceAttribute: "INVALID",
      invalidReason: "学生需求不合理",
      primaryChannelId: chXiaoHongShu?.id,
      degreeType: "大学院-修士",
      subjectArea: "音乐",
      salesId: sales.id, ownerIds: [sales.id],
      notes: "预算不足，转介绍",
    },
  });

  await prisma.lead.create({
    data: {
      name: "陈思琪",
      wechatId: "chensiqi_2025",
      resourceAttribute: "VALID",
      advisorConfirmation: "EXPIRED",
      conversionStage: "挖需中",
      primaryChannelId: chXueLaoshi?.id,
      sourceDetail: "薛老师介绍·芥末机构",
      degreeType: "学部",
      subjectArea: "文科",
      salesId: sales.id,
      ownerIds: [sales.id],
      conversionProbability: 10,
      nextAction: "添加微信", nextActionDueAt: addDays(now, 0),
    },
  });

  await prisma.lead.create({
    data: {
      name: "王宇翔",
      phone: "13800007777", wechatId: "wangyuxiang",
      resourceAttribute: "VALID",
      advisorConfirmation: "INTENT_CONFIRMED",
      conversionStage: "签约",
      primaryChannelId: chReferralEmp?.id,
      degreeType: "大学院-修士",
      subjectArea: "理科",
      salesId: sales.id, ownerIds: [sales.id],
      conversionProbability: 100,
      lastAdvisorFollowUpAt: addDays(now, -5),
    },
  });

  // AdvisorFollowUps on 周晓雯
  await prisma.advisorFollowUp.createMany({
    data: [
      { leadId: leadZhou.id, authorId: sales.id,
        advisorConfirmation: "PENDING", isEffective: true,
        detail: "首次电话沟通 20 分钟。目标 東大 情報，9 月入学。考虑过京大但更倾向 东京。",
        conversionStage: "挖需中",
        createdAt: addDays(now, -8) },
      { leadId: leadZhou.id, authorId: sales.id,
        advisorConfirmation: "PENDING", isEffective: true,
        detail: "发了大学院班介绍 PDF + 周三试听课时间表，已回复确认。",
        conversionStage: "机会资源",
        createdAt: addDays(now, -5) },
      { leadId: leadZhou.id, authorId: sales.id,
        advisorConfirmation: "INTENT_CONFIRMED", isEffective: true,
        detail: "试听 N1 阅读课，状态投入，与佐藤老师 5 分钟面谈也很积极。",
        conversionStage: "长线资源",
        attendedTrial: true,
        createdAt: addDays(now, -2) },
    ],
  });

  // FrontendFollowUp on 高奈奈
  await prisma.frontendFollowUp.create({
    data: {
      leadId: (await prisma.lead.findFirstOrThrow({ where: { name: "高奈奈" } })).id,
      authorId: marketing.id,
      communicationRef: "小红书私信→引导添加企业微信→约面咨",
      assignedCampus: "广州",
      assignedAt: addDays(now, -3),
      addedOwnerIds: [marketing.id],
      revisitDetail: "有效ing→机会资源",
      revisitAt: addDays(now, -1),
      revisitNote: "对插画专业感兴趣，需要看作品",
    },
  });

  // Sample Student (kept from previous seed shape; minimal)
  const studentLi = await prisma.student.create({
    data: {
      name: "李小明", nameKana: "リ ショウメイ",
      divisionId: byKind.GRADUATE.id, mentorId: mentor.id,
      stage: "EXAM_PREP" as StudentStage,
      riskLevel: "GREEN",
      targetSchool: "東京大学 大学院", targetMajor: "情報学",
      growthScore: 62,
      nextAction: "完成研究计划书第二节修改",
      nextActionDueAt: addDays(now, 1),
      lastFollowUpAt: addDays(now, -2),
    },
  });

  await prisma.studentAccount.create({
    data: {
      studentId: studentLi.id,
      email: "student@chinichi.local",
      password: pw,
    },
  });

  // Echo snapshots — 7 days for the student demo
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    await prisma.echoSnapshot.create({
      data: {
        studentId: studentLi.id, date: day,
        studyMinutes: 20 + i * 4 + Math.floor(Math.random() * 8),
        shadowingDone: 3 + (i % 3),
        aiConvCount: 1 + (i % 2),
        pronScore: 80 + Math.floor(Math.random() * 10),
        streak: 7 - i,
        raw: { source: "echo-mock" },
      },
    });
  }

  console.log("✓ seed done");
  console.log("  · admin:     admin@chinichi.local / admin1234");
  console.log("  · mentor:    mentor@chinichi.local / admin1234");
  console.log("  · sales:     sales@chinichi.local / admin1234");
  console.log("  · channel:   channel@chinichi.local / admin1234");
  console.log("  · marketing: mkt@chinichi.local / admin1234");
  console.log("  · head:      head@chinichi.local / admin1234");
  console.log("  · student:   student@chinichi.local / admin1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
