import { describe, expect, it } from "vitest";
import { reconcileJambBookmarks, reconcileJambProgress } from "./jamb-local-sync";

describe("reconcileJambProgress", () => {
  it("keeps a newer offline answer and schedules it for cloud upsert", () => {
    const result = reconcileJambProgress(
      { q1: { selected: "C", savedAt: 2000 } },
      [{ questionId: "q1", selected: "A", savedAt: 1000 }],
    );

    expect(result.merged.q1).toEqual({ selected: "C", savedAt: 2000 });
    expect(result.pendingUpserts).toEqual([["q1", { selected: "C", savedAt: 2000 }]]);
  });

  it("accepts a newer cloud answer without scheduling a redundant write", () => {
    const result = reconcileJambProgress(
      { q1: { selected: "C", savedAt: 1000 } },
      [{ questionId: "q1", selected: "A", savedAt: 2000 }],
    );

    expect(result.merged.q1).toEqual({ selected: "A", savedAt: 2000 });
    expect(result.pendingUpserts).toEqual([]);
  });

  it("uploads locally saved answers that do not exist in the cloud", () => {
    const result = reconcileJambProgress(
      { q1: { selected: "B", savedAt: 1000 }, q2: { selected: "D", savedAt: 1500 } },
      [{ questionId: "q1", selected: "B", savedAt: 1000 }],
    );

    expect(result.pendingUpserts).toEqual([["q2", { selected: "D", savedAt: 1500 }]]);
  });

  it("prefers local data on timestamp ties when the selected answers differ", () => {
    const result = reconcileJambProgress(
      { q1: { selected: "E", savedAt: 1000 } },
      [{ questionId: "q1", selected: "A", savedAt: 1000 }],
    );

    expect(result.merged.q1.selected).toBe("E");
    expect(result.pendingUpserts).toEqual([["q1", { selected: "E", savedAt: 1000 }]]);
  });

  it("preserves local answers when a remote row has no selected option", () => {
    const result = reconcileJambProgress(
      { q1: { selected: "D", savedAt: 1000 } },
      [{ questionId: "q1", selected: null, savedAt: 0 }],
    );

    expect(result.merged.q1).toEqual({ selected: "D", savedAt: 1000 });
    expect(result.pendingUpserts).toHaveLength(1);
  });
});

describe("reconcileJambBookmarks", () => {
  it("does not resurrect bookmarks removed offline", () => {
    const result = reconcileJambBookmarks(["keep"], ["keep", "removed-offline"], ["removed-offline"]);

    expect(result.merged).toEqual(["keep"]);
    expect(result.remoteToDelete).toEqual(["removed-offline"]);
    expect(result.localToUpsert).toEqual([]);
  });

  it("merges remote additions and queues local additions", () => {
    const result = reconcileJambBookmarks(["local-only", "shared"], ["remote-only", "shared"], []);

    expect(result.merged).toEqual(["local-only", "shared", "remote-only"]);
    expect(result.remoteToDelete).toEqual([]);
    expect(result.localToUpsert).toEqual(["local-only"]);
  });

  it("deduplicates ids and honors deletion tombstones for both copies", () => {
    const result = reconcileJambBookmarks(
      ["q1", "q1", "q2"],
      ["q2", "q3", "q3"],
      ["q2", "q3"],
    );

    expect(result.merged).toEqual(["q1"]);
    expect(result.remoteToDelete).toEqual(["q2", "q3"]);
    expect(result.localToUpsert).toEqual(["q1"]);
  });
});
