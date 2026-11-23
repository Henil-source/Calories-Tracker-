import { describe, expect, it } from "vitest";
import { cmToFtIn, ftInToCm, heightText, kgToLb, lbToKg, weightFrom, weightText } from "./units";

describe("units", () => {
  it("converts weight both ways", () => {
    expect(kgToLb(70)).toBeCloseTo(154.32, 1);
    expect(lbToKg(154.3)).toBeCloseTo(70, 1);
    expect(weightText(70, "imperial")).toBe("154.3 lb");
    expect(weightFrom(154.3, "imperial")).toBe(69.99);
  });
  it("converts height both ways", () => {
    expect(cmToFtIn(175)).toEqual({ ft: 5, inch: 9 });
    expect(ftInToCm(5, 9)).toBe(175.3);
    expect(cmToFtIn(182.9)).toEqual({ ft: 6, inch: 0 });
    expect(heightText(165, "imperial")).toBe("5 ft 5 in");
    expect(heightText(165, "metric")).toBe("165 cm");
  });
});
