import { db } from "./db.js";
import { ApiError, courseAccess, type AuthRequest } from "./http.js";
export async function topicAccess(
  req: AuthRequest,
  topicId: string,
  write = false,
  author = false,
) {
  const topic = await db.courseTopic.findUnique({
    where: { id: topicId },
    include: {
      revision: true,
      sourceSubject: {
        include: { source: true, academicYear: true, semester: true },
      },
    },
  });
  if (!topic) throw new ApiError(404, "NOT_FOUND", "Topic not found.");
  await courseAccess(req, topic.revision.courseId, write);
  if (
    req.auth!.user.role === "STUDENT" &&
    topic.revision.status !== "PUBLISHED"
  )
    throw new ApiError(404, "NOT_FOUND", "Topic not found.");
  if (
    author &&
    (req.auth!.user.role === "STUDENT" || topic.revision.status !== "DRAFT")
  )
    throw new ApiError(
      409,
      "IMMUTABLE",
      "Published content is read-only. Create a new draft revision.",
    );
  return topic;
}
