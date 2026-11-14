import { describe, expect, it } from "vitest";
import { customisedName, programOrigin } from "./programOrigin";

const readyMade = new Set(["Débuter la course : 5 km"]);
const me = "me";

describe("programOrigin", () => {
  it("follows a ready-made program added to one's list", () => {
    expect(programOrigin({ name: "Débuter la course : 5 km", ownerUserId: me }, me, readyMade)).toBe("followed");
    expect(programOrigin({ name: "Débuter la course : 5 km", ownerUserId: null }, me, readyMade)).toBe("followed");
  });

  it("leaves a coach's program to the coach", () => {
    expect(programOrigin({ name: "Plan de Léa", ownerUserId: "coach", assignedToUserId: me }, me, readyMade)).toBe("coach");
    expect(programOrigin({ name: "Débuter la course : 5 km", ownerUserId: "coach", assignedToUserId: me }, me, readyMade)).toBe("coach");
  });

  it("lets one edit one's own, and a coach the copies made for clients", () => {
    expect(programOrigin({ name: "Mon programme", ownerUserId: me }, me, readyMade)).toBe("mine");
    expect(programOrigin({ name: "Débuter la course : 5 km", ownerUserId: me, assignedToUserId: "lea" }, me, readyMade)).toBe("mine");
  });

  it("makes a customised ready-made program one's own", () => {
    const name = customisedName("Débuter la course : 5 km", "perso");
    expect(programOrigin({ name, ownerUserId: me }, me, readyMade)).toBe("mine");
  });
});
