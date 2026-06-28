import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { validateRequestTemplateDefinition } from "../src/request-templates/request-templates.service.js";
import type { UpsertRequestTemplateVersionDto } from "../src/request-templates/request-templates.dto.js";

function validTemplate(
  overrides: Partial<UpsertRequestTemplateVersionDto> = {},
): UpsertRequestTemplateVersionDto {
  return {
    status: "DRAFT",
    instructionsEn: "Complete the service item form.",
    sections: [
      {
        code: "basic_request_information",
        titleAr: "Basic request information",
        titleEn: "Basic request information",
        sortOrder: 1,
      },
    ],
    fields: [
      {
        code: "employee_count",
        sectionCode: "basic_request_information",
        fieldType: "NUMBER",
        labelAr: "Employee count",
        labelEn: "Employee count",
        required: true,
        clientVisible: true,
        sortOrder: 1,
      },
    ],
    downloadableFiles: [],
    documentChecklist: [],
    reason: "Unit test template",
    ...overrides,
  };
}

describe("request template validation", () => {
  it("accepts a well-formed builder payload", () => {
    expect(() => validateRequestTemplateDefinition(validTemplate())).not.toThrow();
  });

  it("rejects duplicate field codes after normalization", () => {
    const template = validTemplate({
      fields: [
        validTemplate().fields[0]!,
        {
          ...validTemplate().fields[0]!,
          code: "Employee Count",
          sortOrder: 2,
        },
      ],
    });

    expect(() => validateRequestTemplateDefinition(template)).toThrow(BadRequestException);
  });

  it("rejects fields that point to an unknown section", () => {
    const template = validTemplate({
      fields: [
        {
          ...validTemplate().fields[0]!,
          sectionCode: "missing_section",
        },
      ],
    });

    expect(() => validateRequestTemplateDefinition(template)).toThrow(BadRequestException);
  });

  it("requires active options for selectable fields", () => {
    const template = validTemplate({
      fields: [
        {
          ...validTemplate().fields[0]!,
          fieldType: "DROPDOWN",
          options: [],
        },
      ],
    });

    expect(() => validateRequestTemplateDefinition(template)).toThrow(BadRequestException);
  });

  it("rejects options on non-selectable fields", () => {
    const template = validTemplate({
      fields: [
        {
          ...validTemplate().fields[0]!,
          fieldType: "SHORT_TEXT",
          options: [
            {
              value: "yes",
              labelAr: "Yes",
              labelEn: "Yes",
              active: true,
              sortOrder: 1,
            },
          ],
        },
      ],
    });

    expect(() => validateRequestTemplateDefinition(template)).toThrow(BadRequestException);
  });
});
