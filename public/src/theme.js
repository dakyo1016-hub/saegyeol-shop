const THEME_KEY = "saegyeol_theme_v1";

function readTheme() {
  try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", dark ? "#11110f" : "#f3f1eb"));
  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "라이트 모드로 전환" : "다크 모드로 전환");
    button.title = dark ? "라이트 모드" : "다크 모드";
    button.querySelector("b").textContent = dark ? "DARK" : "LIGHT";
  });
}

function createThemeToggle() {
  if (!document.querySelector(".theme-toggle")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.innerHTML = '<span aria-hidden="true"><i></i></span><b>LIGHT</b>';
    const headerActions = document.querySelector(".site-header .header-actions, .checkout-header");
    if (headerActions) {
      const menu = headerActions.querySelector(".menu-toggle");
      if (menu) headerActions.insertBefore(button, menu);
      else headerActions.appendChild(button);
    } else {
      document.body.appendChild(button);
      button.classList.add("theme-toggle--floating");
    }
  }

  applyTheme(readTheme());
  document.querySelectorAll(".theme-toggle").forEach((button) => button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch { /* preferences may be unavailable */ }
    applyTheme(next);
  }));
}

applyTheme(readTheme());
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createThemeToggle, { once: true });
else createThemeToggle();
