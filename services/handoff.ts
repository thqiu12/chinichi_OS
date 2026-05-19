// The bridge from CRM (Lead) → Growth OS (Student).
// Used by /api/leads/[id]/convert to carry the academic snapshot over and
// auto-suggest a Division + Mentor.

import { prisma, safe } from "@/lib/db";
import type { Lead, Division, User, DivisionKind } from "@prisma/client";

/** Heuristic: pick a Division for a lead based on subjectArea + degreeType. */
export function inferDivisionKind(
  subjectArea: string | null | undefined,
  degreeType: string | null | undefined,
): DivisionKind {
  const sa = subjectArea?.trim();
  if (sa === "美术") return "ART";
  if (sa === "音乐") return "MUSIC";
  if (sa === "日语") return "SHARED";

  const dt = degreeType?.trim() ?? "";
  if (dt.startsWith("大学院")) return "GRADUATE";
  if (dt === "学部" || dt === "学部编入") return "GAKUBU";
  if (dt === "SGU申请") return "GRADUATE";
  if (dt === "专门学校" || dt === "语校申请" || dt === "语言学习") return "GAKUBU";

  if (sa === "文科" || sa === "理科") return "LIBERAL";
  return "LIBERAL";
}

/** Suggest a Division + a default Mentor for the inferred Division. */
export async function suggestAssignment(lead: Pick<Lead, "subjectArea" | "degreeType">) {
  const kind = inferDivisionKind(lead.subjectArea, lead.degreeType);

  const division = await safe(
    () => prisma.division.findFirst({ where: { kind } }),
    null as Division | null,
  );
  if (!division) return { kind, division: null, mentor: null };

  // First MENTOR who is a member of this Division (lowest load TBD; for now
  // pick first by name).
  const member = await safe(
    () =>
      prisma.membership.findFirst({
        where: { divisionId: division.id, role: "MENTOR" },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      }),
    null as { user: User } | null,
  );

  return { kind, division, mentor: member?.user ?? null };
}
