// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDisplayEvent } from "./use-display-event";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("counts a visible impression once in StrictMode and counts reopening separately", () => {
  const record = vi.fn();
  const { rerender } = renderHook(
    ({ target }: { target: string | undefined }) =>
      useDisplayEvent(target, "popup_opened", record),
    {
      initialProps: { target: "season:neutral" as string | undefined },
      wrapper: StrictMode,
    },
  );
  expect(record).toHaveBeenCalledTimes(1);
  rerender({ target: undefined });
  rerender({ target: "season:neutral" });
  expect(record).toHaveBeenCalledTimes(2);
});
it("does not count a background-tab display until it becomes visible", () => {
  const visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  const record = vi.fn();
  renderHook(() => useDisplayEvent("season:neutral", "popup_opened", record));
  expect(record).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(record).toHaveBeenCalledTimes(1);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(record).toHaveBeenCalledTimes(1);
});
