import { describe, expect, it } from "bun:test";
import { createSoundPlayer } from "../src/lib/sound-engine";

function audio(state = "running") {
  let resolveResume = () => {};
  let rejectResume = () => {};
  const oscillators: { frequency: number; stops: (number | undefined)[]; started: boolean }[] = [];
  let resumes = 0;
  let closes = 0;
  const context = {
    state,
    currentTime: 1,
    destination: {},
    resume() {
      resumes++;
      return new Promise<void>((resolve, reject) => {
        resolveResume = resolve;
        rejectResume = () => reject(new Error("Blocked"));
      });
    },
    close() {
      closes++;
      return Promise.resolve();
    },
    createOscillator() {
      const record = { frequency: 0, stops: [] as (number | undefined)[], started: false };
      oscillators.push(record);
      return {
        type: "sine",
        onended: null,
        frequency: {
          setValueAtTime(value: number) {
            record.frequency = value;
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
        start() {
          record.started = true;
        },
        stop(at?: number) {
          record.stops.push(at);
        },
      };
    },
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        disconnect() {},
      };
    },
  };
  return {
    context,
    oscillators,
    resumes: () => resumes,
    closes: () => closes,
    resolve: () => resolveResume(),
    reject: () => rejectResume(),
    factory: () => context as unknown as AudioContext,
  };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("computer audio lifecycle", () => {
  it("drops an autoplay-blocked power chime without resuming or queuing it", () => {
    const a = audio("suspended");
    const player = createSoundPlayer(a.factory);
    player.play("power");
    expect(a.resumes()).toBe(0);
    expect(a.oscillators).toHaveLength(0);
    a.context.state = "running";
    player.play("power");
    player.play("computer-click", true);
    expect(a.oscillators.map((o) => o.frequency)).toEqual([1400]);
  });
  it("plays power once and stops it before the tiny entry click", () => {
    const a = audio();
    const player = createSoundPlayer(a.factory);
    player.play("power");
    player.play("power");
    expect(a.oscillators).toHaveLength(1);
    player.play("computer-click", true);
    expect(a.oscillators[0].stops).toContain(undefined);
    expect(a.oscillators.map((o) => o.frequency)).toEqual([330, 1400]);
  });
  it("allows a promptly resumed click from a gesture", async () => {
    const a = audio("suspended");
    let time = 0;
    const player = createSoundPlayer(a.factory, true, () => time);
    player.play("computer-click", true);
    expect(a.oscillators).toHaveLength(0);
    expect(a.resumes()).toBe(1);
    time = 30;
    a.context.state = "running";
    a.resolve();
    await flush();
    expect(a.oscillators).toHaveLength(1);
  });
  it("keeps the first mobile click when audio startup exceeds the old 150ms cutoff", async () => {
    const a = audio("suspended");
    let time = 0;
    const player = createSoundPlayer(a.factory, true, () => time);
    player.play("computer-click", true);
    time = 350;
    a.context.state = "running";
    a.resolve();
    await flush();
    expect(a.oscillators).toHaveLength(1);
  });
  it("creates the first tap context synchronously instead of reusing blocked startup", () => {
    const blocked = audio("suspended");
    const tapped = audio("running");
    let gesture = false;
    const player = createSoundPlayer(() => (gesture ? tapped.factory() : blocked.factory()));
    player.play("power");
    gesture = true;
    player.play("computer-click", true);
    expect(blocked.closes()).toBe(1);
    expect(blocked.resumes()).toBe(0);
    expect(blocked.oscillators).toHaveLength(0);
    expect(tapped.oscillators.map((o) => o.frequency)).toEqual([1400]);
  });
  for (const state of ["interrupted", "closed"]) {
    it(`replaces a ${state} context on the next activation`, () => {
      const old = audio();
      const next = audio();
      let created = 0;
      const player = createSoundPlayer(() => (++created === 1 ? old.factory() : next.factory()));
      player.play("power");
      old.context.state = state;
      player.play("computer-click", true);
      expect(created).toBe(2);
      expect(next.oscillators).toHaveLength(1);
    });
  }
  it("resets hover throttling when recovery creates a new audio clock", () => {
    const old = audio();
    const next = audio();
    let created = 0;
    old.context.currentTime = 60;
    next.context.currentTime = 0;
    const player = createSoundPlayer(() => (++created === 1 ? old.factory() : next.factory()));
    player.play("hover");
    old.context.state = "interrupted";
    player.play("click", true);
    player.play("hover");
    expect(next.oscillators.map((o) => o.frequency)).toEqual([420, 1180]);
  });
  it("does not replay an older pending click after a newer running-context activation", async () => {
    const a = audio("suspended");
    const player = createSoundPlayer(a.factory, true, () => 0);
    player.play("computer-click", true);
    a.context.state = "running";
    player.play("click", true);
    a.resolve();
    await flush();
    expect(a.oscillators.map((o) => o.frequency)).toEqual([420]);
  });
  it("discards delayed resume results", async () => {
    const a = audio("suspended");
    let time = 0;
    const player = createSoundPlayer(a.factory, true, () => time);
    player.play("computer-click", true);
    time = 1001;
    a.context.state = "running";
    a.resolve();
    await flush();
    expect(a.oscillators).toHaveLength(0);
  });
  for (const cancel of ["mute", "stop", "dispose"] as const) {
    it(`cancels pending clicks on ${cancel}`, async () => {
      const a = audio("suspended");
      const player = createSoundPlayer(a.factory, true, () => 0);
      player.play("computer-click", true);
      if (cancel === "mute") player.setEnabled(false);
      else player[cancel]();
      a.context.state = "running";
      a.resolve();
      await flush();
      expect(a.oscillators).toHaveLength(0);
    });
  }
  it("keeps muted entry silent and never replays its skipped chime after unmuting", () => {
    const a = audio();
    const player = createSoundPlayer(a.factory, false);
    player.play("power");
    player.play("computer-click", true);
    expect(a.oscillators).toHaveLength(0);
    player.setEnabled(true);
    player.play("power");
    expect(a.oscillators).toHaveLength(0);
    player.play("computer-click", true);
    expect(a.oscillators).toHaveLength(1);
  });
  it("handles unsupported audio and resume rejection without throwing", async () => {
    expect(() =>
      createSoundPlayer(() => {
        throw new Error("Unsupported");
      }).play("power"),
    ).not.toThrow();
    const a = audio("suspended");
    const player = createSoundPlayer(a.factory);
    player.play("computer-click", true);
    a.reject();
    await flush();
    expect(a.oscillators).toHaveLength(0);
  });
  it("prevents an early entry from producing a later power-on chime", () => {
    const a = audio();
    const player = createSoundPlayer(a.factory);
    player.play("computer-click", true);
    player.play("power");
    expect(a.oscillators.map((o) => o.frequency)).toEqual([1400]);
  });
  it("cleans up voices on mute and context on unmount", () => {
    const a = audio();
    const player = createSoundPlayer(a.factory);
    player.play("power");
    player.setEnabled(false);
    expect(a.oscillators[0].stops).toContain(undefined);
    player.dispose();
    expect(a.closes()).toBe(1);
  });
});
