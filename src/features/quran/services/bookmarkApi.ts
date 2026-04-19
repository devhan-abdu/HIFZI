import { callQF, QFRequestError } from "./index";

export const BOOKMARKS_MUSHAF_ID = 4;
const BOOKMARKS_PAGE_SIZE = 20;
const BOOKMARKS_MAX_PAGES = 50;

type BookmarkType = "ayah";

export type ParsedVerseKey = {
  sura: number;
  ayah: number;
  verseKey: string;
};

export type RemoteBookmarkRecord = {
  id: string;
  createdAt?: string;
  type: BookmarkType;
  key: number; // This is the Surah ID in QF API
  verseNumber?: number | null; // This is the Ayah ID
  group?: string | null;
  isInDefaultCollection?: boolean;
};

type RemoteBookmarkListResponse = {
  success: boolean;
  data?: RemoteBookmarkRecord[];
  pagination?: {
    startCursor?: string;
    endCursor?: string;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

type RemoteBookmarkMutationResponse = {
  success: boolean;
  data?: RemoteBookmarkRecord;
  message?: string;
};

export type NormalizedRemoteBookmark = {
  id: string;
  verseKey: string;
};

/**
 * Ensures verse keys are valid (1-based index).
 * This prevents the "2:0" error you encountered.
 */
export function parseVerseKey(verseKey: string): ParsedVerseKey | null {
  const match = /^(\d+):(\d+)$/.exec(String(verseKey).trim());
  if (!match) return null;

  const sura = Number(match[1]);
  const ayah = Number(match[2]);

  // Ayah must be 1 or greater. 0 is invalid.
  if (!Number.isInteger(sura) || !Number.isInteger(ayah) || sura < 1 || ayah < 1) {
    return null;
  }

  return {
    sura,
    ayah,
    verseKey: `${sura}:${ayah}`,
  };
}

/**
 * POST /auth/v1/bookmarks
 * Maps "2:3" to { key: 2, verseNumber: 3 ... }
 */
export async function createRemoteBookmark(verseKey: string) {
  const parsed = parseVerseKey(verseKey);
  if (!parsed) {
    throw new Error(`INVALID_VERSE_KEY_FORMAT: ${verseKey}`);
  }

  const payload = {
    key: parsed.sura,
    type: "ayah" as const,
    verseNumber: parsed.ayah,
    isReading: true,
    mushaf: BOOKMARKS_MUSHAF_ID,
  };

  const response = (await callQF("/auth/v1/bookmarks", {
    method: "POST",
    body: payload,
  })) as RemoteBookmarkMutationResponse | null;

  if (!response?.data?.id) {
    throw new Error("FAILED_TO_CREATE_REMOTE_BOOKMARK");
  }

  return response.data;
}

/**
 * DELETE /auth/v1/bookmarks/:id
 */
export async function deleteRemoteBookmark(bookmarkId: string) {
  if (!bookmarkId) throw new Error("MISSING_BOOKMARK_ID");

  await callQF(`/auth/v1/bookmarks/${bookmarkId}`, {
    method: "DELETE",
    params: {
      mushafId: BOOKMARKS_MUSHAF_ID,
    },
  });
}

/**
 * GET /auth/v1/bookmarks
 * Fetches one page of bookmarks
 */
export async function listRemoteBookmarksPage(after?: string) {
  const response = (await callQF("/auth/v1/bookmarks", {
    method: "GET",
    params: {
      mushafId: BOOKMARKS_MUSHAF_ID,
      type: "ayah",
      first: BOOKMARKS_PAGE_SIZE,
      ...(after && { after }),
    },
  })) as RemoteBookmarkListResponse | null;

  return {
    items: response?.data ?? [],
    pagination: response?.pagination,
  };
}

/**
 * Background utility to normalize all remote bookmarks into our local verseKey format
 */
export async function listAllRemoteBookmarks() {
  const bookmarks: NormalizedRemoteBookmark[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  while (pageCount < BOOKMARKS_MAX_PAGES) {
    const { items, pagination } = await listRemoteBookmarksPage(cursor);

    for (const item of items) {
      if (item.type === "ayah" && item.verseNumber) {
        bookmarks.push({
          id: String(item.id),
          verseKey: `${item.key}:${item.verseNumber}`,
        });
      }
    }

    if (!pagination?.hasNextPage || !pagination.endCursor || pagination.endCursor === cursor) {
      break;
    }

    cursor = pagination.endCursor;
    pageCount++;
  }

  return bookmarks;
}

/**
 * Error Handling Helpers
 */
export function isQFValidationError(error: unknown) {
  return error instanceof QFRequestError && error.status === 422;
}

export function getRawQFErrorMessage(error: unknown) {
  if (error instanceof QFRequestError) return error.bodyText;
  if (error instanceof Error) return error.message;
  return String(error);
}
