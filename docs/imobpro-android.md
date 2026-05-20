
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImobPro — Android</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      /* Modern Minimal palette */
      --bg: #f8f9fa;
      --surface: #ffffff;
      --fg: #1a1a1a;
      --muted: #6b7280;
      --border: #e5e7eb;
      --accent: #5b5fc7;
      --accent-light: #8b8fe0;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;

      --font: 'Roboto', -apple-system, system-ui, sans-serif;
      --radius: 12px;
      --radius-sm: 8px;
      --radius-lg: 16px;
      --radius-xl: 24px;
      --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    html, body {
      font-family: var(--font);
      background: #1a1a2e;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    /* Android Phone Frame - Pixel style */
    .phone-frame {
      width: 412px;
      height: 900px;
      background: #1a1a1a;
      border-radius: 44px;
      padding: 12px;
      box-shadow:
        0 50px 100px rgba(0, 0, 0, 0.5),
        inset 0 0 0 2px #333,
        inset 0 0 0 3px #1a1a1a;
      position: relative;
    }

    .phone-screen {
      width: 100%;
      height: 100%;
      background: var(--bg);
      border-radius: 36px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Android Status Bar */
    .status-bar {
      height: 28px;
      background: var(--surface);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      font-size: 12px;
      font-weight: 500;
      color: var(--fg);
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-time { font-weight: 600; }

    .status-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-icon {
      width: 16px;
      height: 16px;
    }

    /* Punch hole camera */
    .camera-punch {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      background: #1a1a1a;
      border-radius: 50%;
      z-index: 100;
    }

    /* App Content */
    .app-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* App Bar - Material Design 3 */
    .app-bar {
      background: var(--surface);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .app-bar-title {
      flex: 1;
      font-size: 20px;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .icon-btn {
      width: 48px;
      height: 48px;
      border: none;
      background: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background var(--transition);
      color: var(--fg);
    }

    .icon-btn:active {
      background: rgba(0, 0, 0, 0.08);
    }

    .icon-btn svg {
      width: 24px;
      height: 24px;
    }

    /* Tabs - Material Design 3 */
    .tabs {
      display: flex;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }

    .tab {
      flex: 1;
      height: 48px;
      border: none;
      background: none;
      font-size: 14px;
      font-weight: 500;
      color: var(--muted);
      position: relative;
      cursor: pointer;
      transition: color var(--transition);
    }

    .tab.active {
      color: var(--accent);
    }

    .tab.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 16px;
      right: 16px;
      height: 3px;
      background: var(--accent);
      border-radius: 3px 3px 0 0;
    }

    /* Page views */
    .page { display: none; flex: 1; overflow-y: auto; }
    .page.active { display: flex; flex-direction: column; }

    /* ===================== INBOX ===================== */
    .conversation-list {
      flex: 1;
      overflow-y: auto;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background var(--transition);
      min-height: 72px;
    }

    .conversation-item:active {
      background: rgba(0, 0, 0, 0.04);
    }

    .conversation-item.unread {
      background: rgba(91, 95, 199, 0.04);
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      color: white;
      flex-shrink: 0;
    }

    .conversation-content {
      flex: 1;
      min-width: 0;
    }

    .conversation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .conversation-name {
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conversation-time {
      font-size: 12px;
      color: var(--muted);
      flex-shrink: 0;
    }

    .conversation-item.unread .conversation-time {
      color: var(--accent);
      font-weight: 500;
    }

    .conversation-preview {
      font-size: 14px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .conversation-item.unread .conversation-preview {
      color: var(--fg);
    }

    .tag {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(91, 95, 199, 0.1);
      color: var(--accent);
      flex-shrink: 0;
    }

    .tag.hot {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
    }

    .unread-dot {
      width: 10px;
      height: 10px;
      background: var(--accent);
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* FAB */
    .fab {
      position: absolute;
      bottom: 80px;
      right: 16px;
      width: 56px;
      height: 56px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(91, 95, 199, 0.4);
      transition: all var(--transition);
    }

    .fab:active {
      transform: scale(0.95);
    }

    .fab svg {
      width: 24px;
      height: 24px;
    }

    /* ===================== METRICS ===================== */
    .metrics-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .period-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--fg);
      align-self: flex-start;
    }

    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .stat-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .stat-card.wide {
      grid-column: span 2;
    }

    .stat-label {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .stat-change {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 4px;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .stat-change.positive {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }

    .stat-change.negative {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger);
    }

    .chart-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .chart-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .mini-chart {
      height: 120px;
      display: flex;
      align-items: flex-end;
      gap: 6px;
    }

    .mini-bar {
      flex: 1;
      background: var(--accent);
      border-radius: 4px 4px 0 0;
      opacity: 0.7;
      transition: all var(--transition);
    }

    .mini-bar:last-child {
      opacity: 1;
    }

    .funnel-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .funnel-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .funnel-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .funnel-label {
      flex: 1;
      font-size: 14px;
    }

    .funnel-value {
      font-size: 16px;
      font-weight: 600;
      min-width: 40px;
      text-align: right;
    }

    .funnel-bar-track {
      width: 60px;
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
    }

    .funnel-bar-fill {
      height: 100%;
      border-radius: 3px;
    }

    /* ===================== SETTINGS ===================== */
    .settings-content {
      flex: 1;
      overflow-y: auto;
    }

    .settings-section {
      padding: 16px;
    }

    .settings-section-title {
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding: 0 16px;
    }

    .settings-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--surface);
      border-radius: var(--radius);
      margin-bottom: 8px;
      cursor: pointer;
      transition: background var(--transition);
      min-height: 56px;
    }

    .settings-item:active {
      background: rgba(0,0,0,0.02);
    }

    .settings-icon {
      width: 24px;
      height: 24px;
      color: var(--muted);
    }

    .settings-text {
      flex: 1;
    }

    .settings-label {
      font-size: 16px;
    }

    .settings-desc {
      font-size: 14px;
      color: var(--muted);
    }

    .settings-chevron {
      width: 20px;
      height: 20px;
      color: var(--muted);
    }

    /* Bottom Navigation - Material Design 3 */
    .bottom-nav {
      background: var(--surface);
      border-top: 1px solid var(--border);
      display: flex;
      height: 80px;
      padding-bottom: 16px;
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--muted);
      cursor: pointer;
      transition: color var(--transition);
      border: none;
      background: none;
      position: relative;
    }

    .nav-item.active {
      color: var(--accent);
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      top: 8px;
      width: 56px;
      height: 28px;
      background: rgba(91, 95, 199, 0.12);
      border-radius: 14px;
    }

    .nav-icon {
      width: 24px;
      height: 24px;
      position: relative;
      z-index: 1;
    }

    .nav-label {
      font-size: 12px;
      font-weight: 500;
      position: relative;
      z-index: 1;
    }

    .nav-badge {
      position: absolute;
      top: 4px;
      right: 50%;
      transform: translateX(16px);
      background: var(--danger);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    /* Navigation gestures indicator */
    .gesture-indicator {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 134px;
      height: 5px;
      background: rgba(0,0,0,0.2);
      border-radius: 3px;
    }

    /* Screen transitions */
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .page.active {
      animation: slideInRight 0.2s ease-out;
    }
  </style>
</head>
<body>
  <div class="phone-frame">
    <div class="phone-screen">
      <div class="camera-punch"></div>

      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-left">
          <span class="status-time">10:42</span>
        </div>
        <div class="status-right">
          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71s.11.53.29.71l2.48 2.48c.18.18.43.29.71.29s.53-.11.71-.29c1.44-1.44 3.41-2.33 5.59-2.33s4.15.89 5.59 2.33c.18.18.43.29.71.29s.53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71s-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/>
            <circle cx="12" cy="17" r="3"/>
          </svg>
          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
          </svg>
        </div>
      </div>

      <!-- App Content -->
      <div class="app-content">
        <!-- Inbox Page -->
        <div class="page active" id="page-inbox">
          <div class="app-bar">
            <div class="app-bar-title">Conversas</div>
            <button class="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button class="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="12" cy="5" r="1"/>
                <circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
          </div>

          <div class="tabs">
            <button class="tab active">Todos</button>
            <button class="tab">Não lidos</button>
            <button class="tab">Favoritos</button>
          </div>

          <div class="conversation-list">
            <div class="conversation-item unread">
              <div class="avatar" style="background: linear-gradient(135deg, #5b5fc7, #7c3aed);">MS</div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <span class="conversation-name">Marina Santos</span>
                  <span class="conversation-time">10:42</span>
                </div>
                <div class="conversation-preview">
                  <span>Olá! Vi o apartamento no Itaim...</span>
                  <span class="tag hot">Quente</span>
                </div>
              </div>
              <div class="unread-dot"></div>
            </div>

            <div class="conversation-item">
              <div class="avatar" style="background: linear-gradient(135deg, #10b981, #059669);">CF</div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <span class="conversation-name">Carlos Ferreira</span>
                  <span class="conversation-time">09:15</span>
                </div>
                <div class="conversation-preview">
                  <span>Pode me enviar mais fotos da área de lazer?</span>
                </div>
              </div>
            </div>

            <div class="conversation-item">
              <div class="avatar" style="background: linear-gradient(135deg, #f59e0b, #d97706);">JO</div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <span class="conversation-name">Julia Oliveira</span>
                  <span class="conversation-time">Ontem</span>
                </div>
                <div class="conversation-preview">
                  <span>Perfeito! Vamos agendar a visita para sábado</span>
                  <span class="tag">Visita</span>
                </div>
              </div>
            </div>

            <div class="conversation-item">
              <div class="avatar" style="background: linear-gradient(135deg, #ec4899, #db2777);">RM</div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <span class="conversation-name">Roberto Mendes</span>
                  <span class="conversation-time">Ontem</span>
                </div>
                <div class="conversation-preview">
                  <span>Qual o valor da entrada mínima?</span>
                </div>
              </div>
            </div>

            <div class="conversation-item">
              <div class="avatar" style="background: linear-gradient(135deg, #10b981, #047857);">AC</div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <span class="conversation-name">Amanda Costa</span>
                  <span class="conversation-time">Seg</span>
                </div>
                <div class="conversation-preview">
                  <span>Fechamos negócio! Muito obrigada...</span>
                  <span class="tag" style="background: rgba(16,185,129,0.1); color: #059669;">Fechado</span>
                </div>
              </div>
            </div>

            <div class="conversation-item">
              <div class="avatar" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">PL</div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <span class="conversation-name">Paulo Lima</span>
                  <span class="conversation-time">Dom</span>
                </div>
                <div class="conversation-preview">
                  <span>Tenho interesse no imóvel da Rua Augusta</span>
                </div>
              </div>
            </div>
          </div>

          <button class="fab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <!-- Metrics Page -->
        <div class="page" id="page-metrics">
          <div class="app-bar">
            <div class="app-bar-title">Métricas</div>
            <button class="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>

          <div class="metrics-content">
            <div class="period-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Este mês
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-label">Leads novos</div>
                <div class="stat-value">247</div>
                <span class="stat-change positive">+18%</span>
              </div>
              <div class="stat-card">
                <div class="stat-label">Visitas</div>
                <div class="stat-value">34</div>
                <span class="stat-change positive">+24%</span>
              </div>
              <div class="stat-card">
                <div class="stat-label">Fechados</div>
                <div class="stat-value">8</div>
                <span class="stat-change negative">-5%</span>
              </div>
              <div class="stat-card">
                <div class="stat-label">Vendas</div>
                <div class="stat-value">R$ 4.2M</div>
                <span class="stat-change positive">+32%</span>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-title">Leads por dia</div>
              <div class="mini-chart">
                <div class="mini-bar" style="height: 45%;"></div>
                <div class="mini-bar" style="height: 62%;"></div>
                <div class="mini-bar" style="height: 38%;"></div>
                <div class="mini-bar" style="height: 75%;"></div>
                <div class="mini-bar" style="height: 52%;"></div>
                <div class="mini-bar" style="height: 88%;"></div>
                <div class="mini-bar" style="height: 95%;"></div>
              </div>
            </div>

            <div class="funnel-card">
              <div class="chart-title">Funil de vendas</div>
              <div class="funnel-item">
                <div class="funnel-dot" style="background: #5b5fc7;"></div>
                <span class="funnel-label">Lead</span>
                <span class="funnel-value">247</span>
                <div class="funnel-bar-track">
                  <div class="funnel-bar-fill" style="width: 100%; background: #5b5fc7;"></div>
                </div>
              </div>
              <div class="funnel-item">
                <div class="funnel-dot" style="background: #8b8fe0;"></div>
                <span class="funnel-label">Qualificado</span>
                <span class="funnel-value">142</span>
                <div class="funnel-bar-track">
                  <div class="funnel-bar-fill" style="width: 57%; background: #8b8fe0;"></div>
                </div>
              </div>
              <div class="funnel-item">
                <div class="funnel-dot" style="background: #f59e0b;"></div>
                <span class="funnel-label">Proposta</span>
                <span class="funnel-value">58</span>
                <div class="funnel-bar-track">
                  <div class="funnel-bar-fill" style="width: 23%; background: #f59e0b;"></div>
                </div>
              </div>
              <div class="funnel-item">
                <div class="funnel-dot" style="background: #ec4899;"></div>
                <span class="funnel-label">Negociação</span>
                <span class="funnel-value">21</span>
                <div class="funnel-bar-track">
                  <div class="funnel-bar-fill" style="width: 8%; background: #ec4899;"></div>
                </div>
              </div>
              <div class="funnel-item">
                <div class="funnel-dot" style="background: #10b981;"></div>
                <span class="funnel-label">Fechado</span>
                <span class="funnel-value">8</span>
                <div class="funnel-bar-track">
                  <div class="funnel-bar-fill" style="width: 3%; background: #10b981;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Funnel/Kanban Page -->
        <div class="page" id="page-funnel">
          <div class="app-bar">
            <div class="app-bar-title">Funil</div>
            <button class="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </button>
          </div>

          <div class="metrics-content" style="padding: 12px;">
            <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;">
              <div style="background: var(--surface); border-radius: var(--radius); padding: 12px; min-width: 140px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 8px; height: 8px; border-radius: 2px; background: #5b5fc7;"></div>
                  <span style="font-size: 13px; font-weight: 500;">Lead</span>
                  <span style="font-size: 12px; color: var(--muted); margin-left: auto;">247</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px;">Marina S.</div>
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px;">Carlos F.</div>
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px; color: var(--muted);">+245</div>
                </div>
              </div>
              <div style="background: var(--surface); border-radius: var(--radius); padding: 12px; min-width: 140px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 8px; height: 8px; border-radius: 2px; background: #8b8fe0;"></div>
                  <span style="font-size: 13px; font-weight: 500;">Qualificado</span>
                  <span style="font-size: 12px; color: var(--muted); margin-left: auto;">142</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px;">Julia O.</div>
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px;">Roberto M.</div>
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px; color: var(--muted);">+140</div>
                </div>
              </div>
              <div style="background: var(--surface); border-radius: var(--radius); padding: 12px; min-width: 140px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 8px; height: 8px; border-radius: 2px; background: #10b981;"></div>
                  <span style="font-size: 13px; font-weight: 500;">Fechado</span>
                  <span style="font-size: 12px; color: var(--muted); margin-left: auto;">8</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="background: rgba(16,185,129,0.1); border-radius: 8px; padding: 8px; font-size: 13px; color: #059669;">Amanda C.</div>
                  <div style="background: var(--bg); border-radius: 8px; padding: 8px; font-size: 13px; color: var(--muted);">+7</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Page -->
        <div class="page" id="page-settings">
          <div class="app-bar">
            <div class="app-bar-title">Configurações</div>
          </div>

          <div class="settings-content">
            <div class="settings-section">
              <div class="settings-section-title">Conta</div>
              <div class="settings-item">
                <div class="avatar" style="background: var(--accent); width: 40px; height: 40px; font-size: 14px;">RS</div>
                <div class="settings-text">
                  <div class="settings-label">Ricardo Silva</div>
                  <div class="settings-desc">ricardo@imobiliaria.com</div>
                </div>
                <svg class="settings-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">Integrações</div>
              <div class="settings-item">
                <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <div class="settings-text">
                  <div class="settings-label">WhatsApp Business</div>
                  <div class="settings-desc">Conectado</div>
                </div>
                <svg class="settings-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="settings-item">
                <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                <div class="settings-text">
                  <div class="settings-label">Instagram</div>
                  <div class="settings-desc">Não conectado</div>
                </div>
                <svg class="settings-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>

            <div class="settings-section">
              <div class="settings-section-title">Preferências</div>
              <div class="settings-item">
                <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <div class="settings-text">
                  <div class="settings-label">Notificações</div>
                </div>
                <svg class="settings-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="settings-item">
                <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div class="settings-text">
                  <div class="settings-label">Ajuda e suporte</div>
                </div>
                <svg class="settings-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav">
        <button class="nav-item active" data-page="inbox">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="nav-label">Inbox</span>
          <span class="nav-badge">12</span>
        </button>
        <button class="nav-item" data-page="funnel">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span class="nav-label">Funil</span>
        </button>
        <button class="nav-item" data-page="metrics">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 20V10"/>
            <path d="M12 20V4"/>
            <path d="M6 20v-6"/>
          </svg>
          <span class="nav-label">Métricas</span>
        </button>
        <button class="nav-item" data-page="settings">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span class="nav-label">Config</span>
        </button>
      </nav>

      <div class="gesture-indicator"></div>
    </div>
  </div>

  <script>
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const tabs = document.querySelectorAll('.tab');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.page;

        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        pages.forEach(p => {
          p.classList.remove('active');
          if (p.id === `page-${pageId}`) {
            p.classList.add('active');
          }
        });
      });
    });

    // Tabs
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Conversation selection feedback
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        // Visual feedback only - in real app would navigate to chat
      });
    });
  </script>
</body>
</html>
