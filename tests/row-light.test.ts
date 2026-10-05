import { expect, it } from "bun:test";
import { lightPosition } from "../src/lib/row-light";

it("clamps pointer lights when the pointer crosses a row edge", () => {
  const rect = { left: 50, top: 100, width: 400, height: 200 };
  expect(lightPosition(-20, 0, rect)).toEqual({
    "--row-x": "0.00%",
    "--row-y": "0.00%",
  });
  expect(lightPosition(1000, 1000, rect)).toEqual({
    "--row-x": "100.00%",
    "--row-y": "100.00%",
  });
});
it("keeps a centered light centered after responsive resize and avoids invalid zero-size values", () => {
  expect(lightPosition(200, 150, { left: 0, top: 0, width: 400, height: 300 })["--row-x"]).toBe(
    "50.00%",
  );
  for (const value of Object.values(lightPosition(0, 0, { left: 0, top: 0, width: 0, height: 0 })))
    expect(value).not.toMatch(/NaN|Infinity/);
});
