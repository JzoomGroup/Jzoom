import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

export default createJestConfig({
  clearMocks: true,
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.spec.tsx"],
});
