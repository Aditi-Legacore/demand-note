import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // ✅ Extend Next.js + TypeScript configs
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ✅ Add custom ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",

      // ✅ Ignore Prisma-generated and runtime code
      ".prisma/**",
      "prisma/generated/**",
      "node_modules/@prisma/client/**",
      "src/generated/prisma/**", // <-- add this line
    ],
  },
];

export default eslintConfig;
