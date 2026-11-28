import { describe, expect, it } from "vitest";
import { savedAddress } from "@/lib/tenant-addresses";

const dto = {
  id: "a-1",
  placeType: "Apartment" as const,
  label: "المنزل",
  street: "شارع عباس العقاد",
  latitude: 30.0588,
  longitude: 31.3314,
  buildingName: "12",
  floor: "3",
  apartmentNumber: "7",
  landmark: null,
  isDefault: true,
  branchId: "b-alf",
  branchNameAr: "ألف مسكن - القاهرة",
  branchNameEn: "Alf Maskan - Cairo",
};

describe("savedAddress", () => {
  it("keeps the place the customer picked as the area, not the nearest branch", () => {
    const address = savedAddress(dto);
    expect(address.area).toBe("شارع عباس العقاد");
    expect(address.branchName).toBe("ألف مسكن - القاهرة");
    expect(address.branchId).toBe("b-alf");
  });

  it("falls back to the address label when the server sends no street", () => {
    expect(savedAddress({ ...dto, street: "" }).area).toBe("المنزل");
  });

  it("still builds the building detail line", () => {
    expect(savedAddress(dto).detail).toBe("12 - 3 - 7");
  });
});
