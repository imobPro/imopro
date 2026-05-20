
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImobPro — Clay Design</title>
  <style>
    @font-face {
      font-family: 'Roobert';
      src: local('Roobert'), local('Inter'), local('system-ui');
      font-weight: 400 700;
      font-display: swap;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      /* Clay palette - warm cream canvas */
      --bg: #faf9f7;
      --surface: #ffffff;
      --fg: #000000;
      --muted: #9f9b93;
      --border: #dad4c8;
      --border-light: #eee9df;

      /* Dark sidebar (hybrid) */
      --sidebar-bg: #1a1815;
      --sidebar-surface: #252320;
      --sidebar-fg: #faf9f7;
      --sidebar-muted: #9f9b93;
      --sidebar-border: #3d3a35;

      /* Swatch palette - named colors */
      --matcha-300: #84e7a5;
      --matcha-600: #078a52;
      --matcha-800: #02492a;
      --slushie-500: #3bd3fd;
      --slushie-800: #0089ad;
      --lemon-400: #f8cc65;
      --lemon-500: #fbbd41;
      --lemon-700: #d08a11;
      --ube-300: #c1b0ff;
      --ube-800: #43089f;
      --pomegranate-400: #fc7981;
      --blueberry-800: #01418d;
      --dragonfruit: #e8348c;

      /* Primary accent */
      --accent: var(--matcha-600);
      --accent-light: var(--matcha-300);

      /* Typography */
      --font-display: 'Roobert', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      --font-body: 'Roobert', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      --font-mono: 'Space Mono', 'JetBrains Mono', ui-monospace, monospace;
      --opentype-display: "ss01", "ss03", "ss10", "ss11", "ss12";
      --opentype-body: "ss03", "ss10", "ss11", "ss12";

      /* Spacing */
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 16px;
      --space-lg: 24px;
      --space-xl: 32px;
      --space-2xl: 48px;
      --space-3xl: 72px;

      /* Transitions */
      --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-bounce: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

      /* Radius - Clay uses generous rounding */
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 24px;
      --radius-xl: 40px;
      --radius-pill: 9999px;

      /* Shadows - Clay signature: multi-layer with inset highlight */
      --shadow-card: rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px;
      --shadow-hard: rgb(0,0,0) -7px 7px;
    }

    html {
      font-family: var(--font-body);
      font-size: 16px;
      line-height: 1.5;
      color: var(--fg);
      background: var(--bg);
      font-feature-settings: var(--opentype-body);
    }

    /* App shell */
    .app { display: flex; min-height: 100vh; }

    /* Sidebar - dark hybrid */
    .sidebar {
      width: 260px;
      background: var(--sidebar-bg);
      color: var(--sidebar-fg);
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--sidebar-border);
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
    }

    .sidebar-header {
      padding: var(--space-lg);
      border-bottom: 1px solid var(--sidebar-border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.02em;
      font-feature-settings: var(--opentype-display);
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: var(--matcha-600);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }

    .logo-icon svg {
      width: 100%;
      height: 100%;
    }

    .sidebar-nav {
      flex: 1;
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .nav-section { margin-top: var(--space-lg); }

    .nav-section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.08px;
      color: var(--sidebar-muted);
      padding: var(--space-sm) var(--space-md);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: 10px var(--space-md);
      border-radius: var(--radius-md);
      color: var(--sidebar-muted);
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      border: 1px dashed transparent;
    }

    .nav-item:hover {
      background: var(--sidebar-surface);
      color: var(--sidebar-fg);
      border-color: var(--sidebar-border);
    }

    .nav-item.active {
      background: var(--matcha-600);
      color: white;
      border-color: transparent;
    }

    .nav-icon { width: 20px; height: 20px; opacity: 0.8; }
    .nav-item.active .nav-icon { opacity: 1; }

    .nav-badge {
      margin-left: auto;
      background: var(--lemon-500);
      color: var(--fg);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-pill);
    }

    .sidebar-footer {
      padding: var(--space-md);
      border-top: 1px solid var(--sidebar-border);
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .user-card:hover { background: var(--sidebar-surface); }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--slushie-500);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      color: var(--fg);
    }

    .user-info { flex: 1; min-width: 0; }
    .user-name { font-size: 14px; font-weight: 500; }
    .user-role { font-size: 12px; color: var(--sidebar-muted); }

    /* Main content */
    .main {
      flex: 1;
      margin-left: 260px;
      display: flex;
      flex-direction: column;
    }

    /* Top bar */
    .topbar {
      height: 64px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 var(--space-lg);
      gap: var(--space-md);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .topbar-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
      font-feature-settings: var(--opentype-display);
    }

    .topbar-tabs {
      display: flex;
      gap: var(--space-xs);
      margin-left: var(--space-lg);
      background: var(--bg);
      padding: 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
    }

    .topbar-tab {
      padding: var(--space-sm) var(--space-md);
      font-size: 14px;
      font-weight: 500;
      color: var(--muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      border: none;
      background: none;
    }

    .topbar-tab:hover { color: var(--fg); }
    .topbar-tab.active {
      color: var(--fg);
      background: var(--surface);
      box-shadow: var(--shadow-card);
    }

    .topbar-spacer { flex: 1; }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    /* Clay Buttons - with playful hover animation */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: 10px var(--space-md);
      font-size: 14px;
      font-weight: 500;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: none;
      white-space: nowrap;
      position: relative;
    }

    .btn-primary {
      background: var(--fg);
      color: var(--surface);
    }

    .btn-primary:hover {
      transform: rotateZ(-3deg) translateY(-4px);
      box-shadow: var(--shadow-hard);
    }

    .btn-primary:active {
      transform: rotateZ(0) translateY(0);
      box-shadow: none;
    }

    .btn-secondary {
      background: var(--surface);
      color: var(--fg);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-card);
    }

    .btn-secondary:hover {
      background: var(--lemon-400);
      border-color: var(--lemon-700);
      transform: rotateZ(-2deg) translateY(-2px);
      box-shadow: rgb(0,0,0) -4px 4px;
    }

    .btn-ghost {
      background: transparent;
      color: var(--muted);
    }

    .btn-ghost:hover { background: var(--bg); color: var(--fg); }

    .btn-icon {
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: var(--radius-md);
    }

    .btn-swatch {
      background: var(--matcha-600);
      color: white;
    }

    .btn-swatch:hover {
      background: var(--matcha-800);
      transform: rotateZ(-5deg) translateY(-6px);
      box-shadow: var(--shadow-hard);
    }

    .btn-lg {
      padding: var(--space-md) var(--space-xl);
      font-size: 16px;
      border-radius: var(--radius-lg);
    }

    /* Search */
    .search {
      position: relative;
      width: 300px;
    }

    .search-input {
      width: 100%;
      height: 44px;
      padding: 0 var(--space-md) 0 44px;
      font-size: 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--fg);
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-card);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--matcha-600);
      box-shadow: 0 0 0 3px rgba(7, 138, 82, 0.15);
    }

    .search-input::placeholder { color: var(--muted); }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--muted);
    }

    /* Content area */
    .content {
      flex: 1;
      padding: var(--space-lg);
      background: var(--bg);
    }

    /* Page views */
    .page { display: none; animation: slideIn var(--transition-base); }
    .page.active { display: block; }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ===================== LANDING PAGE ===================== */
    .landing { background: var(--surface); }

    .landing-hero {
      text-align: center;
      padding: var(--space-3xl) var(--space-lg);
      max-width: 800px;
      margin: 0 auto;
    }

    .landing-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: var(--matcha-300);
      color: var(--matcha-800);
      font-size: 12px;
      font-weight: 600;
      border-radius: var(--radius-pill);
      margin-bottom: var(--space-xl);
      border: 1px dashed var(--matcha-600);
    }

    .landing-title {
      font-family: var(--font-display);
      font-size: clamp(36px, 6vw, 60px);
      font-weight: 600;
      letter-spacing: -2.4px;
      line-height: 1.0;
      margin-bottom: var(--space-lg);
      font-feature-settings: var(--opentype-display);
    }

    .landing-title span { color: var(--matcha-600); }

    .landing-subtitle {
      font-size: 20px;
      color: var(--muted);
      line-height: 1.5;
      margin-bottom: var(--space-xl);
      font-weight: 400;
    }

    .landing-cta {
      display: flex;
      justify-content: center;
      gap: var(--space-md);
      flex-wrap: wrap;
    }

    /* Dark section - Matcha 800 */
    .section-dark {
      background: var(--matcha-800);
      color: white;
      padding: var(--space-3xl) var(--space-lg);
    }

    .section-dark .section-header {
      text-align: center;
      margin-bottom: var(--space-xl);
    }

    .section-dark .section-title {
      font-family: var(--font-display);
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 600;
      letter-spacing: -1.32px;
      margin-bottom: var(--space-md);
      font-feature-settings: var(--opentype-display);
    }

    .section-dark .section-subtitle {
      color: var(--matcha-300);
      font-size: 18px;
      max-width: 600px;
      margin: 0 auto;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--space-lg);
      max-width: 1100px;
      margin: 0 auto;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.06);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      transition: all var(--transition-base);
    }

    .feature-card:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      background: var(--matcha-300);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-md);
      color: var(--matcha-800);
    }

    .feature-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: var(--space-sm);
      letter-spacing: -0.4px;
      font-feature-settings: var(--opentype-display);
    }

    .feature-desc {
      color: var(--matcha-300);
      font-size: 15px;
      line-height: 1.6;
    }

    /* Pricing */
    .pricing {
      padding: var(--space-3xl) var(--space-lg);
      background: var(--bg);
    }

    .pricing-header {
      text-align: center;
      margin-bottom: var(--space-xl);
    }

    .pricing-title {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -1.28px;
      margin-bottom: var(--space-sm);
      font-feature-settings: var(--opentype-display);
    }

    .pricing-subtitle { color: var(--muted); font-size: 18px; }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--space-lg);
      max-width: 1100px;
      margin: 0 auto;
    }

    .pricing-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      position: relative;
      box-shadow: var(--shadow-card);
      transition: all var(--transition-base);
    }

    .pricing-card:hover {
      transform: translateY(-6px);
      box-shadow: rgba(0,0,0,0.12) 0px 8px 24px;
    }

    .pricing-card.featured {
      background: var(--matcha-800);
      color: white;
      border-color: var(--matcha-800);
    }

    .pricing-card.featured .plan-desc,
    .pricing-card.featured .plan-features li {
      color: var(--matcha-300);
    }

    .pricing-card.featured::before {
      content: 'Popular';
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--lemon-500);
      color: var(--fg);
      font-size: 11px;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: var(--radius-pill);
    }

    .plan-name {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.08px;
      color: var(--muted);
      margin-bottom: var(--space-sm);
    }

    .pricing-card.featured .plan-name { color: var(--matcha-300); }

    .plan-price {
      display: flex;
      align-items: baseline;
      gap: var(--space-xs);
      margin-bottom: var(--space-md);
    }

    .plan-currency { font-size: 24px; font-weight: 600; }
    .plan-value {
      font-size: 52px;
      font-weight: 600;
      letter-spacing: -2px;
      font-feature-settings: var(--opentype-display);
    }
    .plan-period { color: var(--muted); font-size: 16px; }
    .pricing-card.featured .plan-period { color: var(--matcha-300); }

    .plan-desc {
      color: var(--muted);
      font-size: 15px;
      margin-bottom: var(--space-lg);
      padding-bottom: var(--space-lg);
      border-bottom: 1px dashed var(--border);
    }

    .pricing-card.featured .plan-desc { border-color: rgba(255,255,255,0.2); }

    .plan-features {
      list-style: none;
      margin-bottom: var(--space-lg);
    }

    .plan-features li {
      display: flex;
      align-items: flex-start;
      gap: var(--space-sm);
      font-size: 15px;
      margin-bottom: var(--space-sm);
      color: var(--muted);
    }

    .plan-features li::before {
      content: '✓';
      color: var(--matcha-600);
      font-weight: 700;
      font-size: 14px;
    }

    .pricing-card.featured .plan-features li::before { color: var(--matcha-300); }

    .pricing-card .btn { width: 100%; }

    .pricing-card.featured .btn {
      background: var(--surface);
      color: var(--fg);
    }

    .pricing-card.featured .btn:hover { background: var(--lemon-400); }

    /* ===================== INBOX PAGE ===================== */
    .inbox-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 1px;
      background: var(--border);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      height: calc(100vh - 160px);
      box-shadow: var(--shadow-card);
    }

    .inbox-list {
      background: var(--surface);
      overflow-y: auto;
    }

    .inbox-list-header {
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      background: var(--surface);
      z-index: 10;
    }

    .inbox-list-title { font-weight: 600; font-size: 15px; }

    .inbox-filters {
      display: flex;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--border);
      background: var(--bg);
    }

    .filter-chip {
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--muted);
      border-radius: var(--radius-sm);
      border: none;
      background: none;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-chip:hover { color: var(--fg); }
    .filter-chip.active {
      background: var(--surface);
      color: var(--fg);
      box-shadow: var(--shadow-card);
    }

    .conversation-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border-light);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .conversation-item:hover { background: var(--bg); }
    .conversation-item.active { background: rgba(7, 138, 82, 0.08); }

    .conversation-unread {
      width: 8px;
      height: 8px;
      background: var(--matcha-600);
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 8px;
    }

    .conversation-avatar {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      color: var(--fg);
      flex-shrink: 0;
    }

    .conversation-content { flex: 1; min-width: 0; }

    .conversation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .conversation-name {
      font-weight: 500;
      font-size: 15px;
    }

    .conversation-time {
      font-size: 12px;
      color: var(--muted);
    }

    .conversation-preview {
      font-size: 14px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: var(--space-xs);
    }

    .conversation-meta { display: flex; gap: var(--space-xs); }

    .conversation-tag {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      background: rgba(7, 138, 82, 0.1);
      color: var(--matcha-600);
    }

    .conversation-tag.hot {
      background: rgba(252, 121, 129, 0.15);
      color: #d63031;
    }

    .conversation-tag.closed {
      background: var(--matcha-300);
      color: var(--matcha-800);
    }

    /* Chat area */
    .chat-area {
      background: var(--surface);
      display: flex;
      flex-direction: column;
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border);
    }

    .chat-contact { flex: 1; }
    .chat-contact-name { font-weight: 600; font-size: 16px; }
    .chat-contact-info {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: 13px;
      color: var(--muted);
    }

    .chat-contact-status { color: var(--matcha-600); }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background: var(--bg);
    }

    .message {
      max-width: 70%;
      padding: var(--space-md);
      border-radius: var(--radius-lg);
      font-size: 15px;
      line-height: 1.5;
    }

    .message.incoming {
      background: var(--surface);
      align-self: flex-start;
      border: 1px solid var(--border);
      border-bottom-left-radius: var(--radius-sm);
    }

    .message.outgoing {
      background: var(--matcha-600);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: var(--radius-sm);
    }

    .message-time {
      font-size: 11px;
      margin-top: var(--space-xs);
      opacity: 0.7;
    }

    .chat-input-area {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      border-top: 1px solid var(--border);
      background: var(--surface);
    }

    .chat-input {
      flex: 1;
      padding: var(--space-md);
      font-size: 15px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      resize: none;
      font-family: inherit;
    }

    .chat-input:focus {
      outline: none;
      border-color: var(--matcha-600);
    }

    /* ===================== METRICS PAGE ===================== */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-md);
      margin-bottom: var(--space-xl);
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow-card);
      transition: all var(--transition-base);
    }

    .stat-card:hover {
      transform: rotateZ(-1deg) translateY(-2px);
      box-shadow: rgb(0,0,0) -3px 3px;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .stat-card.accent-slushie::before { background: var(--slushie-500); }
    .stat-card.accent-lemon::before { background: var(--lemon-500); }
    .stat-card.accent-matcha::before { background: var(--matcha-600); }
    .stat-card.accent-pomegranate::before { background: var(--pomegranate-400); }
    .stat-card.accent-ube::before { background: var(--ube-300); }

    .stat-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.08px;
      color: var(--muted);
      margin-bottom: var(--space-sm);
    }

    .stat-value {
      font-size: 36px;
      font-weight: 600;
      letter-spacing: -1.5px;
      font-feature-settings: var(--opentype-display);
    }

    .stat-change {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 500;
      margin-top: var(--space-sm);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .stat-change.positive {
      background: rgba(7, 138, 82, 0.1);
      color: var(--matcha-600);
    }

    .stat-change.negative {
      background: rgba(252, 121, 129, 0.15);
      color: #d63031;
    }

    /* Charts */
    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: var(--space-lg);
      margin-bottom: var(--space-lg);
    }

    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      box-shadow: var(--shadow-card);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-lg);
    }

    .chart-title { font-weight: 600; font-size: 16px; }

    .chart-placeholder {
      height: 200px;
      background: linear-gradient(180deg, rgba(7, 138, 82, 0.1) 0%, transparent 100%);
      border-radius: var(--radius-md);
      display: flex;
      align-items: flex-end;
      padding: var(--space-md);
      gap: var(--space-sm);
    }

    .chart-bar {
      flex: 1;
      background: var(--matcha-600);
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      transition: all var(--transition-fast);
    }

    .chart-bar:hover { background: var(--matcha-800); }

    /* Funnel */
    .funnel-list { display: flex; flex-direction: column; gap: var(--space-md); }

    .funnel-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
    }

    .funnel-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .funnel-label { flex: 1; font-size: 14px; }

    .funnel-value {
      font-weight: 600;
      font-size: 16px;
      min-width: 40px;
      text-align: right;
    }

    .funnel-bar {
      width: 100px;
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
    }

    .funnel-fill { height: 100%; border-radius: 4px; }

    /* Mobile responsive */
    @media (max-width: 1024px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; }
      .inbox-layout { grid-template-columns: 1fr; }
      .chat-area { display: none; }
      .charts-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .topbar-tabs { display: none; }
      .search { width: 100%; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .features-grid { grid-template-columns: 1fr; }
      .pricing-grid { grid-template-columns: 1fr; }
    }

    .mobile-menu-toggle { display: none; }
    @media (max-width: 1024px) {
      .mobile-menu-toggle { display: flex; }
    }
  </style>
</head>
<body>
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- House outline - symmetric, minimal line style -->
              <path d="M4 11L12 4L20 11" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M6 10V20H18V10" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
              <!-- Centered door (open at bottom like reference) -->
              <path d="M10 20V14H14V20" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
          ImobPro
        </div>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item" data-page="landing">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Home
        </a>

        <div class="nav-section">
          <div class="nav-section-title">Atendimento</div>
          <a class="nav-item active" data-page="inbox">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Caixa de entrada
            <span class="nav-badge">12</span>
          </a>
          <a class="nav-item" data-page="funnel">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Funil
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Análise</div>
          <a class="nav-item" data-page="metrics">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Métricas
          </a>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Sistema</div>
          <a class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Configurações
          </a>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">RS</div>
          <div class="user-info">
            <div class="user-name">Ricardo Silva</div>
            <div class="user-role">Corretor</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main">
      <!-- Landing Page -->
      <div class="page landing" id="page-landing">
        <section class="landing-hero">
          <span class="landing-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Integração WhatsApp Business
          </span>
          <h1 class="landing-title">
            Gerencie seus leads<br>
            <span>de forma inteligente</span>
          </h1>
          <p class="landing-subtitle">
            A plataforma completa para corretores e imobiliárias que querem
            converter mais leads em vendas. CRM, automações e métricas.
          </p>
          <div class="landing-cta">
            <button class="btn btn-swatch btn-lg">
              Começar teste grátis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button class="btn btn-secondary btn-lg">Ver demonstração</button>
          </div>
        </section>

        <section class="section-dark">
          <div class="section-header">
            <h2 class="section-title">Tudo que você precisa para vender mais</h2>
            <p class="section-subtitle">Ferramentas pensadas para corretores que querem resultados, não burocracia.</p>
          </div>

          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 class="feature-title">Inbox unificado</h3>
              <p class="feature-desc">WhatsApp, Instagram e email em um só lugar. Nunca mais perca uma mensagem.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 class="feature-title">Automações inteligentes</h3>
              <p class="feature-desc">Respostas automáticas, follow-ups programados e lembretes de visita.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <h3 class="feature-title">Métricas em tempo real</h3>
              <p class="feature-desc">Dashboard com conversões, tempo de resposta e performance por canal.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <h3 class="feature-title">Funil visual</h3>
              <p class="feature-desc">Kanban drag-and-drop para acompanhar cada lead do primeiro contato ao fechamento.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 class="feature-title">Gestão de equipe</h3>
              <p class="feature-desc">Distribua leads automaticamente e acompanhe a performance de cada corretor.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 class="feature-title">Seguro e LGPD</h3>
              <p class="feature-desc">Dados criptografados, backup automático e conformidade total com a LGPD.</p>
            </div>
          </div>
        </section>

        <section class="pricing">
          <div class="pricing-header">
            <h2 class="pricing-title">Planos que crescem com você</h2>
            <p class="pricing-subtitle">Sem contratos longos. Cancele quando quiser.</p>
          </div>

          <div class="pricing-grid">
            <div class="pricing-card">
              <div class="plan-name">Iniciante</div>
              <div class="plan-price">
                <span class="plan-currency">R$</span>
                <span class="plan-value">149</span>
                <span class="plan-period">/mês</span>
              </div>
              <p class="plan-desc">Ideal para corretores autônomos iniciando sua jornada digital.</p>
              <ul class="plan-features">
                <li>Até 100 leads/mês</li>
                <li>1 usuário</li>
                <li>Integração WhatsApp</li>
                <li>Funil de vendas básico</li>
                <li>Suporte por email</li>
              </ul>
              <button class="btn btn-secondary">Escolher plano</button>
            </div>

            <div class="pricing-card featured">
              <div class="plan-name">Profissional</div>
              <div class="plan-price">
                <span class="plan-currency">R$</span>
                <span class="plan-value">279</span>
                <span class="plan-period">/mês</span>
              </div>
              <p class="plan-desc">Para corretores que querem escalar suas operações.</p>
              <ul class="plan-features">
                <li>Até 500 leads/mês</li>
                <li>3 usuários</li>
                <li>WhatsApp + Instagram</li>
                <li>Automações avançadas</li>
                <li>Métricas completas</li>
                <li>Suporte prioritário</li>
              </ul>
              <button class="btn btn-secondary">Escolher plano</button>
            </div>

            <div class="pricing-card">
              <div class="plan-name">Imobiliária</div>
              <div class="plan-price">
                <span class="plan-currency">R$</span>
                <span class="plan-value">549</span>
                <span class="plan-period">/mês</span>
              </div>
              <p class="plan-desc">Solução completa para imobiliárias com múltiplos corretores.</p>
              <ul class="plan-features">
                <li>Leads ilimitados</li>
                <li>10 usuários</li>
                <li>Todas as integrações</li>
                <li>API personalizada</li>
                <li>Relatórios white-label</li>
                <li>Gerente de sucesso dedicado</li>
              </ul>
              <button class="btn btn-secondary">Falar com vendas</button>
            </div>
          </div>
        </section>
      </div>

      <!-- Inbox Page -->
      <div class="page active" id="page-inbox">
        <div class="topbar">
          <button class="mobile-menu-toggle btn btn-ghost btn-icon" onclick="document.getElementById('sidebar').classList.toggle('open')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 class="topbar-title">Caixa de entrada</h1>
          <div class="topbar-tabs">
            <button class="topbar-tab active">Todos</button>
            <button class="topbar-tab">Não lidos</button>
            <button class="topbar-tab">Favoritos</button>
          </div>
          <div class="topbar-spacer"></div>
          <div class="topbar-actions">
            <div class="search">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" class="search-input" placeholder="Buscar conversas...">
            </div>
            <button class="btn btn-swatch">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova conversa
            </button>
          </div>
        </div>

        <div class="content">
          <div class="inbox-layout">
            <div class="inbox-list">
              <div class="inbox-list-header">
                <span class="inbox-list-title">Conversas</span>
                <button class="btn btn-ghost btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                </button>
              </div>
              <div class="inbox-filters">
                <button class="filter-chip active">Todos</button>
                <button class="filter-chip">WhatsApp</button>
                <button class="filter-chip">Instagram</button>
                <button class="filter-chip">Email</button>
              </div>

              <div class="conversation-item active">
                <div class="conversation-unread"></div>
                <div class="conversation-avatar" style="background: var(--ube-300);">MS</div>
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">Marina Santos</span>
                    <span class="conversation-time">10:42</span>
                  </div>
                  <div class="conversation-preview">Olá! Vi o apartamento no Itaim e gostaria de...</div>
                  <div class="conversation-meta">
                    <span class="conversation-tag hot">Quente</span>
                    <span class="conversation-tag">3 quartos</span>
                  </div>
                </div>
              </div>

              <div class="conversation-item">
                <div class="conversation-avatar" style="background: var(--slushie-500);">CF</div>
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">Carlos Ferreira</span>
                    <span class="conversation-time">09:15</span>
                  </div>
                  <div class="conversation-preview">Pode me enviar mais fotos da área de lazer?</div>
                  <div class="conversation-meta">
                    <span class="conversation-tag">Qualificado</span>
                  </div>
                </div>
              </div>

              <div class="conversation-item">
                <div class="conversation-avatar" style="background: var(--lemon-400);">JO</div>
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">Julia Oliveira</span>
                    <span class="conversation-time">Ontem</span>
                  </div>
                  <div class="conversation-preview">Perfeito! Vamos agendar a visita para sábado...</div>
                  <div class="conversation-meta">
                    <span class="conversation-tag" style="background: var(--lemon-400); color: var(--lemon-700);">Visita agendada</span>
                  </div>
                </div>
              </div>

              <div class="conversation-item">
                <div class="conversation-avatar" style="background: var(--pomegranate-400); color: white;">RM</div>
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">Roberto Mendes</span>
                    <span class="conversation-time">Ontem</span>
                  </div>
                  <div class="conversation-preview">Qual o valor da entrada mínima?</div>
                  <div class="conversation-meta">
                    <span class="conversation-tag">Financiamento</span>
                  </div>
                </div>
              </div>

              <div class="conversation-item">
                <div class="conversation-avatar" style="background: var(--matcha-300);">AC</div>
                <div class="conversation-content">
                  <div class="conversation-header">
                    <span class="conversation-name">Amanda Costa</span>
                    <span class="conversation-time">Seg</span>
                  </div>
                  <div class="conversation-preview">Fechamos negócio! Muito obrigada pelo atendimento...</div>
                  <div class="conversation-meta">
                    <span class="conversation-tag closed">Fechado</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="chat-area">
              <div class="chat-header">
                <div class="conversation-avatar" style="background: var(--ube-300);">MS</div>
                <div class="chat-contact">
                  <div class="chat-contact-name">Marina Santos</div>
                  <div class="chat-contact-info">
                    <span class="chat-contact-status">Online</span>
                    <span>•</span>
                    <span>WhatsApp</span>
                  </div>
                </div>
                <button class="btn btn-ghost btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
                  </svg>
                </button>
                <button class="btn btn-ghost btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="19" cy="12" r="1"/>
                    <circle cx="5" cy="12" r="1"/>
                  </svg>
                </button>
              </div>

              <div class="chat-messages">
                <div class="message incoming">
                  <div>Olá! Vi o apartamento no Itaim e gostaria de saber mais detalhes. Qual a metragem exata?</div>
                  <div class="message-time">10:30</div>
                </div>
                <div class="message outgoing">
                  <div>Olá Marina! O apartamento tem 120m² de área útil, com 3 suítes e 2 vagas de garagem. Posso te enviar a planta?</div>
                  <div class="message-time">10:35</div>
                </div>
                <div class="message incoming">
                  <div>Sim, por favor! E o valor do condomínio?</div>
                  <div class="message-time">10:40</div>
                </div>
                <div class="message outgoing">
                  <div>O condomínio é R$ 1.850/mês. Inclui academia, piscina, salão de festas e portaria 24h. Vou te enviar a planta agora!</div>
                  <div class="message-time">10:42</div>
                </div>
              </div>

              <div class="chat-input-area">
                <button class="btn btn-ghost btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <textarea class="chat-input" placeholder="Digite sua mensagem..." rows="1"></textarea>
                <button class="btn btn-swatch btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics Page -->
      <div class="page" id="page-metrics">
        <div class="topbar">
          <button class="mobile-menu-toggle btn btn-ghost btn-icon" onclick="document.getElementById('sidebar').classList.toggle('open')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 class="topbar-title">Métricas</h1>
          <div class="topbar-spacer"></div>
          <div class="topbar-actions">
            <select class="search-input" style="width: auto; padding: 0 var(--space-md); cursor: pointer;">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
              <option selected>Este mês</option>
              <option>Último trimestre</option>
            </select>
            <button class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
          </div>
        </div>

        <div class="content">
          <div class="stats-grid">
            <div class="stat-card accent-slushie">
              <div class="stat-label">Leads novos</div>
              <div class="stat-value">247</div>
              <span class="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                </svg>
                +18%
              </span>
            </div>
            <div class="stat-card accent-lemon">
              <div class="stat-label">Visitas agendadas</div>
              <div class="stat-value">34</div>
              <span class="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                </svg>
                +24%
              </span>
            </div>
            <div class="stat-card accent-matcha">
              <div class="stat-label">Negócios fechados</div>
              <div class="stat-value">8</div>
              <span class="stat-change negative">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                </svg>
                -5%
              </span>
            </div>
            <div class="stat-card accent-pomegranate">
              <div class="stat-label">Taxa de conversão</div>
              <div class="stat-value">3.2%</div>
              <span class="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                </svg>
                +0.4%
              </span>
            </div>
            <div class="stat-card accent-ube">
              <div class="stat-label">Tempo médio de resposta</div>
              <div class="stat-value">4min</div>
              <span class="stat-change positive">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                </svg>
                -2min
              </span>
            </div>
          </div>

          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">Leads por dia</span>
              </div>
              <div class="chart-placeholder">
                <div class="chart-bar" style="height: 40%;"></div>
                <div class="chart-bar" style="height: 65%;"></div>
                <div class="chart-bar" style="height: 50%;"></div>
                <div class="chart-bar" style="height: 80%;"></div>
                <div class="chart-bar" style="height: 45%;"></div>
                <div class="chart-bar" style="height: 70%;"></div>
                <div class="chart-bar" style="height: 100%;"></div>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">Funil de vendas</span>
              </div>
              <div class="funnel-list">
                <div class="funnel-item">
                  <div class="funnel-color" style="background: var(--slushie-500);"></div>
                  <span class="funnel-label">Novos leads</span>
                  <span class="funnel-value">247</span>
                  <div class="funnel-bar">
                    <div class="funnel-fill" style="width: 100%; background: var(--slushie-500);"></div>
                  </div>
                </div>
                <div class="funnel-item">
                  <div class="funnel-color" style="background: var(--ube-300);"></div>
                  <span class="funnel-label">Qualificados</span>
                  <span class="funnel-value">89</span>
                  <div class="funnel-bar">
                    <div class="funnel-fill" style="width: 36%; background: var(--ube-300);"></div>
                  </div>
                </div>
                <div class="funnel-item">
                  <div class="funnel-color" style="background: var(--lemon-500);"></div>
                  <span class="funnel-label">Visita agendada</span>
                  <span class="funnel-value">34</span>
                  <div class="funnel-bar">
                    <div class="funnel-fill" style="width: 14%; background: var(--lemon-500);"></div>
                  </div>
                </div>
                <div class="funnel-item">
                  <div class="funnel-color" style="background: var(--matcha-600);"></div>
                  <span class="funnel-label">Fechados</span>
                  <span class="funnel-value">8</span>
                  <div class="funnel-bar">
                    <div class="funnel-fill" style="width: 3%; background: var(--matcha-600);"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    // Page navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.page;

        // Update nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById('page-' + pageId);
        if (page) page.classList.add('active');

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    // Tab switching
    document.querySelectorAll('.topbar-tabs').forEach(tabs => {
      tabs.querySelectorAll('.topbar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.querySelectorAll('.topbar-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        });
      });
    });

    // Filter chips
    document.querySelectorAll('.inbox-filters').forEach(filters => {
      filters.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          filters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        });
      });
    });
  </script>
</body>
</html>
