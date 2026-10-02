import { describe, expect, it } from "bun:test";
import {
  createRevealSchedule,
  RAINBOW_HOLD_MS,
  RAINBOW_FADE_MS,
} from "../src/lib/experience-timing";

describe("rainbow after the computer transition", () => {
  it("starts on reveal, holds for four seconds, then fades before cleanup", () => {
    const events: string[] = [];
    const queue: { callback: () => void; delay: number }[] = [];
    const schedule = ((callback: () => void, delay: number) => {
      queue.push({ callback, delay });
      return queue.length;
    }) as unknown as typeof setTimeout;
    createRevealSchedule({
      visible: () => events.push("visible"),
      fade: () => events.push("fade"),
      done: () => events.push("done"),
      schedule,
    });
    expect(events).toEqual(["visible"]);
    expect(queue[0].delay).toBe(RAINBOW_HOLD_MS);
    expect(RAINBOW_HOLD_MS).toBe(4000);
    queue[0].callback();
    expect(events).toEqual(["visible", "fade"]);
    expect(queue[1].delay).toBe(RAINBOW_FADE_MS);
    queue[1].callback();
    expect(events).toEqual(["visible", "fade", "done"]);
  });
  it("cancels pending timers on navigation or unmount", () => {
    const removed: unknown[] = [];
    const schedule = (() => 17) as unknown as typeof setTimeout;
    const unschedule = ((id: unknown) => removed.push(id)) as typeof clearTimeout;
    const cancel = createRevealSchedule({
      visible() {},
      fade() {},
      done() {},
      schedule,
      unschedule,
    });
    cancel();
    expect(removed).toEqual([17]);
  });
  it("keeps the four-second hold with no animated fade for reduced motion", () => {
    const queue: { callback: () => void; delay: number }[] = [];
    const schedule = ((callback: () => void, delay: number) => {
      queue.push({ callback, delay });
      return queue.length;
    }) as unknown as typeof setTimeout;
    createRevealSchedule({ fadeMs: 0, visible() {}, fade() {}, done() {}, schedule });
    expect(queue[0].delay).toBe(4000);
    queue[0].callback();
    expect(queue[1].delay).toBe(0);
  });
});
