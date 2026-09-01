import { render, screen } from "@testing-library/react";
import { ActivityTimeline, FileCard, fileTypeLabel, formattedFileSize } from "./workflow-ui";

describe("workflow UI", () => {
  it("renders unified activity in order supplied by the workflow", () => {
    render(
      <ActivityTimeline
        empty="No activity"
        items={[
          { id: "1", title: "Status changed", meta: "Today", tone: "accent" },
          { id: "2", title: "File uploaded", description: "brief.pdf", tone: "success" },
        ]}
      />,
    );
    expect(screen.getByText("Status changed")).toBeInTheDocument();
    expect(screen.getByText("File uploaded")).toBeInTheDocument();
  });

  it("offers preview and download from the same file card", () => {
    render(
      <FileCard
        locale="en"
        file={{
          id: "file-1",
          downloadUrl: "https://files.example.test/brief.pdf",
          mimeType: "application/pdf",
          name: "brief.pdf",
          sizeBytes: 2048,
          version: 2,
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "Preview file" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Download file" })).toHaveAttribute(
      "href",
      "https://files.example.test/brief.pdf",
    );
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(formattedFileSize(2048, "en")).toContain("KB");
  });

  it("uses human Arabic file type labels instead of raw MIME subtypes", () => {
    expect(fileTypeLabel("text/plain", "ar")).toBe("ملف نصي");
    expect(fileTypeLabel("application/pdf", "ar")).toBe("مستند PDF");
    expect(fileTypeLabel("application/octet-stream", "ar")).toBe("ملف");
  });
});
