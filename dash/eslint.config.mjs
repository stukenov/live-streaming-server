import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships flat configs, so they are spread directly.
// `next lint` was removed in Next 16 — the lint script calls eslint itself.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // eslint-plugin-react-hooks 7 added the React Compiler rules. The
      // dashboard polls on mount and flips a refreshing flag from the effect,
      // which this rule flags. Keep it visible as a warning and raise it back
      // to "error" once the fetching is reworked.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
