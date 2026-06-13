import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      "id-length": ["error", { min: 2, exceptions: ["x", "y"] }],
    },
  },
  {
    ignores: ["dist/"],
  },
);
