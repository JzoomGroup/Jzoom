import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateTimeEntryDto, UpdateTimeEntryDto } from "../src/requests/requests.dto.js";

describe("request time entry validation", () => {
  it.each([0.25, 0.5, 1, 1.25, 2.5, 24])(
    "accepts %s hours as a quarter-hour increment",
    (hours) => {
      const createInput = plainToInstance(CreateTimeEntryDto, {
        billable: true,
        hours,
        workDate: "2026-08-17T00:00:00.000Z",
      });
      const updateInput = plainToInstance(UpdateTimeEntryDto, { hours });

      expect(validateSync(createInput)).toEqual([]);
      expect(validateSync(updateInput)).toEqual([]);
    },
  );

  it.each([0.1, 0.3, 1.1, 2.55, 24.25])(
    "rejects %s hours when it is not a valid quarter-hour increment",
    (hours) => {
      const createInput = plainToInstance(CreateTimeEntryDto, {
        billable: true,
        hours,
        workDate: "2026-08-17T00:00:00.000Z",
      });
      const updateInput = plainToInstance(UpdateTimeEntryDto, { hours });

      expect(validateSync(createInput).some((error) => error.property === "hours")).toBe(true);
      expect(validateSync(updateInput).some((error) => error.property === "hours")).toBe(true);
    },
  );
});
