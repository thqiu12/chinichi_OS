import { PrismaClient, type DivisionKind, type StudentStage } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    prisma.lead.deleteMany(),
    prisma.student.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.user.deleteMany(),
    prisma.division.deleteMany(),
  ]);

  // Divisions
  const divs = await Promise.all(
    [
      { name: "美术",      kind: "ART"      as DivisionKind, isShared: false },
      { name: "音乐",      kind: "MUSIC"    as DivisionKind, isShared: false },
      { name: "学部",      kind: "GAKUBU"   as DivisionKind, isShared: false },
      { name: "大学院",    kind: "GRADUATE" as DivisionKind, isShared: false },
      { name: "文理科",    kind: "LIBERAL"  as DivisionKind, isShared: false },
      { name: "日语组",    kind: "SHARED"   as DivisionKind, isShared: true  },
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

  await prisma.membership.createMany({
    data: [
      { userId: mentor.id,    divisionId: byKind.GRADUATE.id, role: "MENTOR" },
      { userId: teacherJp.id, divisionId: byKind.SHARED.id,   role: "TEACHER" },
      { userId: teacherJp.id, divisionId: byKind.GRADUATE.id, role: "TEACHER" },
      { userId: teacherJp.id, divisionId: byKind.ART.id,      role: "TEACHER" },
      { userId: teacherArt.id,divisionId: byKind.ART.id,      role: "TEACHER" },
    ],
  });

  // Leads
  await prisma.lead.createMany({
    data: [
      { name: "周晓雯", phone: "13800001111", wechatId: "zhouxw",
        nationality: "CN", targetDegree: "大学院", sourceChannel: "小红书",
        salesId: sales.id, status: "NEGOTIATING", conversionProbability: 70,
        nextAction: "本周三试听后跟进", nextActionDueAt: addDays(new Date(), 3) },
      { name: "刘星辰", phone: "13800002222",
        nationality: "CN", targetDegree: "学部", sourceChannel: "公众号",
        salesId: sales.id, status: "TRIAL", conversionProbability: 55,
        nextAction: "确认试听课时间", nextActionDueAt: addDays(new Date(), 1) },
      { name: "高奈奈", phone: "13800003333",
        nationality: "CN", targetDegree: "美术", sourceChannel: "B站",
        salesId: sales.id, status: "CONTACTED", conversionProbability: 30,
        nextAction: "约一次面咨", nextActionDueAt: addDays(new Date(), 5) },
      { name: "Tanaka Yui", phone: "08012345678",
        nationality: "JP", targetDegree: "大学院", sourceChannel: "推荐",
        salesId: sales.id, status: "NEW", conversionProbability: 15,
        nextAction: "首次电话沟通", nextActionDueAt: addDays(new Date(), 2) },
      { name: "李铭", phone: "13800005555",
        nationality: "CN", targetDegree: "音乐", sourceChannel: "小红书",
        salesId: sales.id, status: "LOST", conversionProbability: 0,
        notes: "预算不足，转介绍" },
    ],
  });

  // Students
  const now = new Date();

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

  const studentChen = await prisma.student.create({
    data: {
      name: "陈雨欣",
      divisionId: byKind.ART.id, mentorId: mentor.id,
      stage: "PORTFOLIO",
      riskLevel: "YELLOW",
      targetSchool: "武蔵野美術大学",
      growthScore: 38,
      nextAction: "本周提交作品集 v1",
      nextActionDueAt: addDays(now, 4),
      lastFollowUpAt: addDays(now, -8),
    },
  });

  const studentZhang = await prisma.student.create({
    data: {
      name: "张子轩",
      divisionId: byKind.GAKUBU.id, mentorId: mentor.id,
      stage: "FOUNDATION",
      riskLevel: "RED",
      targetSchool: "早稲田大学",
      growthScore: 18,
      nextAction: "约见家长沟通近期状态",
      nextActionDueAt: addDays(now, 0),
      lastFollowUpAt: addDays(now, -16),
    },
  });

  // Student account for the demo student
  await prisma.studentAccount.create({
    data: {
      studentId: studentLi.id,
      email: "student@chinichi.local",
      password: pw,
    },
  });

  // Deadlines (one full template applied for each student)
  const dlSeed = [
    { sid: studentLi.id, kind: "EXAM_REGISTRATION", title: "JLPT N1 报名", offset: 5  },
    { sid: studentLi.id, kind: "EXAM_DATE",         title: "JLPT N1 考试", offset: 60 },
    { sid: studentLi.id, kind: "ESSAY_DUE",         title: "研究计划书 v2", offset: 14 },
    { sid: studentChen.id,kind: "ESSAY_DUE",        title: "作品集 v1", offset: 4  },
    { sid: studentChen.id,kind: "INTERVIEW",        title: "Demo 面试", offset: 30 },
    { sid: studentZhang.id,kind: "EXAM_REGISTRATION",title: "EJU 报名", offset: 2  },
    { sid: studentZhang.id,kind: "ESSAY_DUE",       title: "小论文范文", offset: 21 },
  ] as const;
  await prisma.deadline.createMany({
    data: dlSeed.map((d) => ({
      studentId: d.sid, kind: d.kind, title: d.title,
      dueAt: addDays(now, d.offset),
    })),
  });

  // Todos
  await prisma.todo.createMany({
    data: [
      { ownerType: "STUDENT", studentId: studentLi.id, title: "研究计划书第二节修改", dueAt: addDays(now, 1) },
      { ownerType: "STUDENT", studentId: studentLi.id, title: "JLPT 模考阅读 1 套",   dueAt: addDays(now, 3) },
      { ownerType: "STUDENT", studentId: studentChen.id, title: "上传作品集 5 张",   dueAt: addDays(now, 4) },
      { ownerType: "STUDENT", studentId: studentZhang.id, title: "完成单词本 200 词", dueAt: addDays(now, -1), status: "OVERDUE" },
      { ownerType: "STAFF", assigneeId: mentor.id, studentId: studentZhang.id,
        title: "联系家长沟通", dueAt: addDays(now, 0) },
      { ownerType: "STAFF", assigneeId: mentor.id, studentId: studentChen.id,
        title: "面谈：作品集进度", dueAt: addDays(now, 1) },
    ],
  });

  // Lessons (today)
  const todayBase = new Date();
  todayBase.setHours(10, 0, 0, 0);
  const l1 = await prisma.lesson.create({
    data: {
      kind: "GROUP", divisionId: byKind.SHARED.id, teacherId: teacherJp.id,
      subject: "JLPT N1 阅读", classroom: "201",
      startsAt: todayBase, endsAt: addDays(todayBase, 0.0625),
    },
  });
  await prisma.lessonStudent.createMany({
    data: [
      { lessonId: l1.id, studentId: studentLi.id },
      { lessonId: l1.id, studentId: studentChen.id },
    ],
  });

  const todayPm = new Date();
  todayPm.setHours(14, 30, 0, 0);
  const l2 = await prisma.lesson.create({
    data: {
      kind: "ONE_ON_ONE", divisionId: byKind.ART.id, teacherId: teacherArt.id,
      subject: "作品集 1on1", classroom: "Atelier A",
      startsAt: todayPm, endsAt: addDays(todayPm, 0.0625),
    },
  });
  await prisma.lessonStudent.create({
    data: { lessonId: l2.id, studentId: studentChen.id },
  });

  // Past feedback
  await prisma.lessonFeedback.create({
    data: {
      lessonId: l1.id, studentId: studentLi.id, teacherId: teacherJp.id,
      tone: "GREAT", problems: ["阅读速度"], nextSteps: ["语法 65 题"],
      aiBody: "今天阅读速度比上节课提升了一档，长难句的拆解明显熟练。下一步把语法 65 题做完，把错题归类到那个红色本子上。",
      aiPraise: "你今天明显更稳了，继续保持。",
    },
  });

  // FollowUps
  await prisma.followUp.create({
    data: {
      studentId: studentLi.id, mentorId: mentor.id,
      content: "学生研究方向清晰，本周开始进入第二章写作。情绪稳定。",
      tags: ["状态稳定", "推进顺利"],
      nextAction: "周三过第二章方法论 800 字初稿",
      nextActionDueAt: addDays(now, 3),
      riskLevel: "GREEN",
      aiSummary: "稳定推进，本周进入第二章写作。",
    },
  });

  // Timeline seeds
  await prisma.timelineEvent.createMany({
    data: [
      { studentId: studentLi.id,  kind: "MILESTONE", title: "通过 N2 模考",       occurredAt: addDays(now, -10) },
      { studentId: studentLi.id,  kind: "FOLLOWUP",  title: "佐藤先生跟进了一次",  occurredAt: addDays(now, -2),
        body: "稳定推进，本周进入第二章写作。" },
      { studentId: studentChen.id,kind: "RISK_CHANGE", title: "风险升级到 YELLOW", body: "已超过 7 天未跟进",
        occurredAt: addDays(now, -1) },
      { studentId: studentZhang.id,kind: "RISK_CHANGE", title: "风险升级到 RED",   body: "已超过 14 天未跟进",
        occurredAt: addDays(now, 0) },
    ],
  });

  // Echo snapshots — 7 days
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

  // Workflow stub
  await prisma.workflow.create({
    data: {
      divisionId: byKind.GRADUATE.id,
      name: "大学院默认 workflow",
      config: {
        stages: ["ONBOARDING","FOUNDATION","EXAM_PREP","APPLICATION","INTERVIEW","ADMITTED"],
      },
    },
  });

  console.log("✓ seed done");
  console.log("  · admin:   admin@chinichi.local / admin1234");
  console.log("  · mentor:  mentor@chinichi.local / admin1234");
  console.log("  · sales:   sales@chinichi.local  / admin1234");
  console.log("  · student: student@chinichi.local / admin1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
