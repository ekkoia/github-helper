import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface ConversationFilters {
  tagIds: string[];
  assessorIds: string[];
  onlyNotStartedByAssessor: boolean;
}

const EMPTY: ConversationFilters = {
  tagIds: [],
  assessorIds: [],
  onlyNotStartedByAssessor: false,
};

const storageKey = (userId: string | undefined) =>
  `chat:conversation-filters:v1:${userId || "anon"}`;

export const useConversationFilters = () => {
  const { user } = useAuth();
  const [filters, setFiltersState] = useState<ConversationFilters>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(user?.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        setFiltersState({
          tagIds: Array.isArray(parsed.tagIds) ? parsed.tagIds : [],
          assessorIds: Array.isArray(parsed.assessorIds) ? parsed.assessorIds : [],
          onlyNotStartedByAssessor: !!parsed.onlyNotStartedByAssessor,
        });
      } else {
        setFiltersState(EMPTY);
      }
    } catch {
      setFiltersState(EMPTY);
    }
    setLoaded(true);
  }, [user?.id]);

  const setFilters = useCallback(
    (next: ConversationFilters) => {
      setFiltersState(next);
      try {
        localStorage.setItem(storageKey(user?.id), JSON.stringify(next));
      } catch {
        /* noop */
      }
    },
    [user?.id],
  );

  const clear = useCallback(() => setFilters(EMPTY), [setFilters]);

  const activeCount =
    filters.tagIds.length +
    filters.assessorIds.length +
    (filters.onlyNotStartedByAssessor ? 1 : 0);

  return { filters, setFilters, clear, activeCount, loaded };
};
