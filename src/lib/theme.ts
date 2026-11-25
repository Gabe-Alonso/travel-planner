export type ThemePref = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "wayfarers-theme";

/**
 * Runs inline in <head> before first paint so there's no flash of the wrong theme.
 * Also follows OS changes while the preference is "system".
 */
export const themeInitScript = `(function(){
  var k=${JSON.stringify(THEME_STORAGE_KEY)};
  var m=window.matchMedia('(prefers-color-scheme: dark)');
  function apply(){
    var t; try { t = localStorage.getItem(k); } catch (e) {}
    var dark = t === 'dark' || (t !== 'light' && m.matches);
    document.documentElement.classList.toggle('dark', dark);
  }
  apply();
  try { m.addEventListener('change', apply); } catch (e) {}
  window.__applyTheme = apply;
})();`;

const listeners = new Set<() => void>();

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {}
  return "system";
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {}
  const apply = (window as unknown as { __applyTheme?: () => void }).__applyTheme;
  if (apply) apply();
  else
    document.documentElement.classList.toggle(
      "dark",
      pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );
  listeners.forEach((l) => l());
}

export function subscribeThemePref(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
