import test from "node:test";
import assert from "node:assert/strict";

// Simulated queue navigation logic based on service-worker.js
function getNextIndex({ queue, index, repeat, shuffle, played = [], isAutoEnded = false }) {
  if (!queue.length) return -1;

  if (isAutoEnded && repeat === "one" && index >= 0 && index < queue.length) {
    return index;
  }

  if (shuffle && queue.length > 1) {
    let candidates = queue
      .map((t, idx) => ({ t, idx }))
      .filter((item) => item.idx !== index && !played.includes(item.t.videoId));

    if (!candidates.length && repeat === "all") {
      candidates = queue
        .map((t, idx) => ({ t, idx }))
        .filter((item) => item.idx !== index);
    }

    if (candidates.length > 0) {
      // Pick candidates
      return candidates.map(c => c.idx);
    }
  }

  if (index + 1 < queue.length) return index + 1;
  if (repeat === "all" && queue.length > 0) return 0;
  return -1; // end of queue (fallback to radio)
}

function getPrevIndex({ queue, index, repeat, time = 0 }) {
  if (time > 3 || index <= 0) {
    if (index === 0 && repeat === "all" && queue.length > 1 && time <= 3) {
      return queue.length - 1;
    }
    return "seek_0";
  }
  return index - 1;
}

test("repeat one replays same track on auto-ended", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }];
  const nextIdx = getNextIndex({ queue, index: 1, repeat: "one", shuffle: false, isAutoEnded: true });
  assert.equal(nextIdx, 1);
});

test("repeat one advances to next track on manual skip", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }];
  const nextIdx = getNextIndex({ queue, index: 0, repeat: "one", shuffle: false, isAutoEnded: false });
  assert.equal(nextIdx, 1);
});

test("repeat all wraps around to 0 at end of queue", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }, { videoId: "c" }];
  const nextIdx = getNextIndex({ queue, index: 2, repeat: "all", shuffle: false });
  assert.equal(nextIdx, 0);
});

test("repeat off returns -1 at end of queue", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }];
  const nextIdx = getNextIndex({ queue, index: 1, repeat: "off", shuffle: false });
  assert.equal(nextIdx, -1);
});

test("shuffle picks among unplayed candidates", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }, { videoId: "c" }];
  const candidates = getNextIndex({ queue, index: 0, repeat: "off", shuffle: true, played: ["a"] });
  assert.deepEqual(candidates, [1, 2]);
});

test("prev wraps to end of queue when at index 0 and repeat is all", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }, { videoId: "c" }];
  const prevIdx = getPrevIndex({ queue, index: 0, repeat: "all", time: 1 });
  assert.equal(prevIdx, 2);
});

test("prev seeks to 0 when time > 3s", () => {
  const queue = [{ videoId: "a" }, { videoId: "b" }];
  const prevIdx = getPrevIndex({ queue, index: 1, repeat: "all", time: 10 });
  assert.equal(prevIdx, "seek_0");
});
