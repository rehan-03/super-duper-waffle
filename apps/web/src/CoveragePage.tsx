import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "./api";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Header,
  Loading,
  readable,
} from "./ui";
type CoverageEntry = {
  key: string;
  subjectCode: string;
  subjectTitle: string;
  title: string;
  sourceText: string;
  source: string;
  pages: number[];
  scope: string;
  status: string;
  reason: string;
  drafts: {
    id: string;
    authoringStatus: string;
    reviewed: boolean;
    revision: { courseId: string; status: string };
  }[];
};
export default function CoveragePage() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const q = useData<{
    entries: CoverageEntry[];
    total: number;
    summary: Record<string, number>;
    visualizers: { key: string; title: string }[];
  }>(`/faculty/coverage?page=${page}&q=${encodeURIComponent(search)}`);
  return (
    <>
      <Header
        eyebrow="SYLLABUS COVERAGE"
        title="Source and draft coverage"
        description="Review official topic groups and lab activities against authored material. Complete drafts still require faculty review and publication."
      />
      <Field label="Search source topics">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Field>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          <div className="course-grid">
            {Object.entries(q.data!.summary).map(([key, value]) => (
              <Card key={key}>
                <h2>{value}</h2>
                <p>{readable(key.replace(/([A-Z])/g, " $1"))}</p>
              </Card>
            ))}
          </div>
          <p>
            {q.data!.total} source groups and activities · Page {page}.{" "}
            {q.data!.visualizers.length} supported simulations are registered.
          </p>
          <div className="row">
            <Button
              kind="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              kind="secondary"
              disabled={page * 50 >= q.data!.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          {q.data!.entries.map((e) => (
            <Card key={e.key}>
              <Badge>
                {e.scope === "REFERENCE"
                  ? "Official reference"
                  : e.drafts.some((d) => d.authoringStatus === "COMPLETE_DRAFT")
                    ? "Complete draft"
                    : readable(e.status)}
              </Badge>
              <h2>
                {e.subjectCode} · {e.title}
              </h2>
              <p className="source-note">
                {e.source} · PDF pages {e.pages.join(", ")}
              </p>
              <p>{e.reason}</p>
              {e.sourceText && (
                <details>
                  <summary>Explicit source content</summary>
                  <p>{e.sourceText}</p>
                </details>
              )}
              {e.drafts.map((d) => (
                <p key={d.id}>
                  <Link to={`/faculty/courses/${d.revision.courseId}`}>
                    {readable(d.authoringStatus)} ·{" "}
                    {readable(d.revision.status)} ·{" "}
                    {d.reviewed ? "reviewed" : "review pending"}
                  </Link>
                </p>
              ))}
            </Card>
          ))}
        </>
      )}
    </>
  );
}
