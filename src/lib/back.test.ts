import { describe, expect, it, vi } from "vitest";
import { onHardwareBack } from "./back";

describe("hardware back button", () => {
  it("closes the open layer first", () => {
    const exit = vi.fn(), goDiary = vi.fn();
    expect(onHardwareBack({ closeLayer: () => true, onDiary: false, goDiary, exit })).toBe("closed");
    expect(goDiary).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
  it("goes back to the diary from another tab", () => {
    const exit = vi.fn(), goDiary = vi.fn();
    expect(onHardwareBack({ closeLayer: () => false, onDiary: false, goDiary, exit })).toBe("diary");
    expect(goDiary).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();
  });
  it("leaves the app only from the diary with nothing open", () => {
    const exit = vi.fn(), goDiary = vi.fn();
    expect(onHardwareBack({ closeLayer: () => false, onDiary: true, goDiary, exit })).toBe("exit");
    expect(exit).toHaveBeenCalledOnce();
  });
});
