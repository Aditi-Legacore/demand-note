export function formatPromptVersionLabel(version?: number | null) {
  if (typeof version !== "number" || Number.isNaN(version)) {
    return "v?";
  }
  const normalizedVersion = version > 5 ? version - 5 : version;
  const displayVersion = Math.max(0, normalizedVersion);
  return `v${displayVersion}`;
}
