import { prisma, safe } from "@/lib/db";
import { currentStudent } from "@/lib/auth";
import { aiEncouragement } from "./ai";
import { addDays, startOfDay } from "@/lib/utils";

export type DemoStudentHome = ReturnType<typeof demoStudentHome>;

function demoStudentHome() {
  const now = new Date();
  return {
    student: {
      id: "demo-student",
      name: "李小明",
      stage: "EXAM_PREP" as const,
      growthScore: 62,
      targetSchool: "東京大学 大学院",
      avatarUrl: null,
    },
    mentor: { name: "佐藤先生", avatarUrl: null },
    division: { name: "大学院", kind: "GRADUATE" as const },
    todayTopTask: {
      id: "demo-task",
      title: "完成研究计划书第二节修改",
      dueAt: addDays(now, 1),
    },
    nextLesson: {
      id: "demo-lesson",
      subject: "JLPT N1 阅读",
      teacherName: "山田先生",
      startsAt: addDays(now, 0),
    },
    upcomingDeadline: {
      id: "demo-dl",
      title: "JLPT N1 报名截止",
      dueAt: addDays(now, 5),
    },
    recentFeedbacks: [
      {
        id: "demo-fb-1",
        teacherName: "山田先生",
        createdAt: addDays(now, -1),
        aiBody:
          "今天阅读速度比上节课提升了一档，长难句的拆解明显熟练。下一步把语法 65 题做完，把错题归类到那个红色本子上。",
        aiPraise: "你今天明显更稳了，继续保持。",
      },
      {
        id: "demo-fb-2",
        teacherName: "佐藤先生",
        createdAt: addDays(now, -3),
        aiBody:
          "研究计划书的问题意识更清楚了。下一步把第二章的方法论写出 800 字初稿，周三我们再一起过一遍。",
        aiPraise: null,
      },
    ],
    watchers: [
      { id: "w1", name: "佐藤", avatarUrl: null },
      { id: "w2", name: "山田", avatarUrl: null },
      { id: "w3", name: "教务", avatarUrl: null },
    ],
    aiEncouragement: "今天就做一件事：把研究计划书第二节改完。",
    growthRecent: [40, 45, 48, 52, 55, 58, 62],
  };
}

export async function getStudentHome() {
  const s = await currentStudent();
  if (!s) return demoStudentHome();

  const today = startOfDay();
  const tomorrow = addDays(today, 1);

  const [topTask, nextLesson, upcomingDeadline, recentFeedbacks, recentEcho] =
    await Promise.all([
      safe(
        () =>
          prisma.todo.findFirst({
            where: {
              studentId: s.id,
              ownerType: "STUDENT",
              status: { not: "DONE" },
            },
            orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
          }),
        null,
      ),
      safe(
        () =>
          prisma.lesson.findFirst({
            where: {
              students: { some: { studentId: s.id } },
              startsAt: { gte: today },
              status: "SCHEDULED",
            },
            orderBy: { startsAt: "asc" },
            include: { teacher: true },
          }),
        null,
      ),
      safe(
        () =>
          prisma.deadline.findFirst({
            where: { studentId: s.id, completedAt: null, dueAt: { gte: today } },
            orderBy: { dueAt: "asc" },
          }),
        null,
      ),
      safe(
        () =>
          prisma.lessonFeedback.findMany({
            where: { studentId: s.id },
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { teacher: true },
          }),
        [],
      ),
      safe(
        () =>
          prisma.echoSnapshot.findMany({
            where: { studentId: s.id },
            orderBy: { date: "desc" },
            take: 7,
          }),
        [],
      ),
    ]);

  const lastFb = recentFeedbacks[0]?.aiBody ?? undefined;
  const enc = await aiEncouragement(s.name, s.growthScore, lastFb);

  return {
    student: {
      id: s.id, name: s.name, stage: s.stage,
      growthScore: s.growthScore, targetSchool: s.targetSchool,
      avatarUrl: s.avatarUrl,
    },
    mentor: s.mentor ? { name: s.mentor.name, avatarUrl: s.mentor.avatarUrl } : null,
    division: s.division,
    todayTopTask: topTask,
    nextLesson: nextLesson
      ? { id: nextLesson.id, subject: nextLesson.subject,
          teacherName: nextLesson.teacher.name, startsAt: nextLesson.startsAt }
      : null,
    upcomingDeadline: upcomingDeadline
      ? { id: upcomingDeadline.id, title: upcomingDeadline.title, dueAt: upcomingDeadline.dueAt }
      : null,
    recentFeedbacks: recentFeedbacks.map((f) => ({
      id: f.id, teacherName: f.teacher.name, createdAt: f.createdAt,
      aiBody: f.aiBody, aiPraise: f.aiPraise,
    })),
    watchers: [
      ...(s.mentor ? [{ id: s.mentor.id, name: s.mentor.name, avatarUrl: s.mentor.avatarUrl }] : []),
    ],
    aiEncouragement: enc,
    growthRecent: recentEcho.reverse().map((e) => e.studyMinutes),
  };
}
