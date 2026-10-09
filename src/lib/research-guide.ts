export const guideKey = "kanzquant.guide.v031";
type GuideStorage = Pick<Storage, "getItem" | "setItem">;
export function shouldShowGuide(storage: GuideStorage): boolean {
  try { return storage.getItem(guideKey) !== "dismissed"; } catch { return false; }
}
export function dismissGuide(storage: GuideStorage): void {
  try { storage.setItem(guideKey, "dismissed"); } catch { /* The session can still dismiss the guide. */ }
}
