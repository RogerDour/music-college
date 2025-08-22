// Small stateful hook that fetches + filters lessons.
// Pass a fetcher: () => axios.get(...), e.g. getLessons or getMyLessons

import { useCallback, useEffect, useMemo, useState } from "react";

export function useLessons(fetcher, { initialStatus = "all" } = {}) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data?.lessons ?? []);
      setAll(list.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = all;
    if (status !== "all") list = list.filter((l) => l.status === status);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((l) => {
        const teacher = l.teacherId?.name || l.teacherId?.email || "";
        const student = l.studentId?.name || l.studentId?.email || "";
        return (
          (l.title || "").toLowerCase().includes(needle) ||
          teacher.toLowerCase().includes(needle) ||
          student.toLowerCase().includes(needle)
        );
      });
    }
    return list;
  }, [all, status, q]);

  return {
    loading,
    lessons: filtered,
    allCount: all.length,
    setAll, // allow pages to optimistically update
    refresh,
    status,
    setStatus,
    q,
    setQ,
  };
}
