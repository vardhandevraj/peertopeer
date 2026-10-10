const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "static");
const DIST = path.join(ROOT, "dist");
const SKIP = new Set([".gitkeep", ".DS_Store"]);

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

rmrf(DIST);
copyDir(SRC, DIST);

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IVY — Peer Learning Network</title>
  <link rel="stylesheet" href="/style.css">
  <script>
    (function() {
      var savedTheme = localStorage.getItem("ivy-theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      document.documentElement.setAttribute("data-theme", savedTheme);
    })();
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">
      <img class="brand-logo" src="/images/logo.webp" alt="IVY">
    </a>
    <nav class="nav-links" id="navLinks">
      <a href="#features">Features</a>
      <a href="#register">Register</a>
      <a href="#login">Login</a>
    </nav>
    <div class="topbar-actions">
      <button id="themeToggle" class="theme-toggle-btn" aria-label="Toggle theme" title="Toggle theme">
        <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>
      <button class="menu-button" id="menuButton" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-orbs" aria-hidden="true">
        <span class="orb orb-a"></span>
        <span class="orb orb-b"></span>
        <span class="orb orb-c"></span>
      </div>
      <div class="hero-content">
        <div class="eyebrow">The Modern Student Network</div>
        <h1>Intelligent collaboration for higher learning.</h1>
        <p class="hero-text">Share course materials, discover study partners, and collaborate on coursework in real time.</p>
        <div class="hero-actions">
          <a class="primary-button" href="#register">Get Started</a>
          <a class="secondary-button" href="#login">Sign In</a>
        </div>
      </div>
    </section>

    <section class="feature-strip" id="features">
      <div class="feature-intro">
        <h2>Engineered for academic momentum</h2>
        <p>An integrated ecosystem designed to streamline knowledge sharing and peer collaboration.</p>
      </div>
      <div class="feature-grid">
        <article>
          <span class="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
          <h3>Resource Exchange</h3>
          <p>Share verified lecture notes, code snippets, and research materials in real time.</p>
        </article>
        <article>
          <span class="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          <h3>Peer Network</h3>
          <p>Connect with peers across departments, form study cohorts, and exchange direct messages.</p>
        </article>
        <article>
          <span class="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg></span>
          <h3>AI Learning Assistant</h3>
          <p>Ask IVY for explanations, summaries, and study help right inside your study rooms.</p>
        </article>
      </div>
    </section>
  </main>

  <script src="/script.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(DIST, "index.html"), indexHtml);
console.log("✓ Static assets staged in dist/");
