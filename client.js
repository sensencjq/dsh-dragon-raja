/**
 * Dragon Raja executive-login skin for DeepSeek Harness (Client half).
 *
 * Surfaces, all registered through the public Client services:
 *  - a token-level skin ("dragon-raja-skin") stacked with
 *    `ctx.theme.overrideTokens`, so the stock light/dark preference keeps
 *    working and the palette is a layer on top (no unrepresentable preference
 *    id, no forced theme on every boot);
 *  - a `shell.overlay` entry that plays the Cassell clearance sequence on open,
 *    greets the operator, and keeps a faint frame-wide HUD;
 *  - a Settings section ("执行员档案") for the operator codename, autoplay,
 *    skin and HUD switches, and replaying the sequence.
 */
window.__ModuleLoader__.load({
  id: 'dsh-dragon-raja',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback } = React;

    const NS = 'dragon-raja';
    const SKIN = 'dragon-raja-skin';
    const KEY_OPERATOR = 'dragon-raja.operator';
    const KEY_HUD = 'dragon-raja.hud';
    const KEY_SKIN = 'dragon-raja.skin';
    const KEY_AUTOPLAY = 'dragon-raja.autoplay';
    const SESSION_SEEN = 'dragon-raja.gate.seen';
    const DEFAULT_OPERATOR = '无名';
    const EVENT_PROFILE = 'dragon-raja:profile';
    const EVENT_REPLAY = 'dragon-raja:replay';
    const EVENT_SKIN = 'dragon-raja:skin';

    /** Timeline of the clearance sequence, in milliseconds. */
    const AUTH_END = 3200;
    const WELCOME_END = 6400;
    const FADE_END = 7000;
    const SKIPPABLE_AFTER = 1200;
    const CHECK_AT = [450, 1050, 1700, 2350, 2900];
    const CHECK_KEYS = ['gate.beacon', 'gate.bio', 'gate.ling', 'gate.runes', 'gate.clear'];

    /**
     * Token layer: the alias palette plus the few internals whose stock values
     * are cold blue and would otherwise leak into a black-and-gold UI
     * (primary-button hover, selection border, business focus ring).
     */
    const TOKEN_MODES = {
      '--dsw-alias-bg-base': { light: '#f3ead7', dark: '#06080c' },
      '--dsw-alias-bg-layer-1': { light: '#ece0c8', dark: '#0b1119' },
      '--dsw-alias-bg-layer-2': { light: '#e3d5b8', dark: '#101a25' },
      '--dsw-alias-bg-overlay': { light: '#efe5cf', dark: '#0a121b' },
      '--dsw-alias-border-l1': { light: 'rgba(90, 66, 30, 0.22)', dark: 'rgba(201, 162, 94, 0.20)' },
      '--dsw-alias-border-l2': { light: 'rgba(90, 66, 30, 0.40)', dark: 'rgba(214, 178, 110, 0.42)' },
      '--dsw-alias-brand-primary': { light: '#8a6a2f', dark: '#d8b264' },
      '--dsw-alias-brand-text': { light: '#4a3818', dark: '#f0d79a' },
      '--dsw-alias-label-primary': { light: '#2b2114', dark: '#e9e3d6' },
      '--dsw-alias-label-secondary': { light: '#6b5b45', dark: '#8f9caa' },
      '--dsw-alias-state-error-primary': { light: '#b21f2d', dark: '#d9374a' },
      '--dsw-alias-state-idle-primary': { light: '#8a7a63', dark: '#5b6a7a' },
      '--dsw-alias-state-success-primary': { light: '#2f7d68', dark: '#46c6a4' },
      '--dsw-alias-state-warn-primary': { light: '#9a6b12', dark: '#e3a94a' },
      '--dsw-specific-sidebar-fill': { light: '#e9ddc3', dark: '#070b11' },
      '--dsw-alias-button-primary-hover': { light: '#7a5c26', dark: '#f0d79a' },
      '--dsw-alias-button-primary-dimmed': { light: '#c9b78d', dark: '#6f5626' },
      '--dsw-alias-border-selected': { light: '#8a6a2f', dark: '#d8b264' },
      '--dsw-alias-state-business-primary': { light: '#8a6a2f', dark: '#d8b264' },
    };

    const DICT_ZH = {
      'brand.name': 'CASSELL 执行部',
      'gate.org': '卡塞尔学院 · 执行部',
      'gate.title': '权限确认',
      'gate.sub': '执行员接入协议 / EXECUTIVE ACCESS PROTOCOL',
      'gate.beacon': '执行员信标捕获',
      'gate.bio': '生物特征比对',
      'gate.ling': '言灵权限校验',
      'gate.runes': '龙文密钥解析',
      'gate.clear': '权限等级认定',
      'gate.ok': '通过',
      'gate.wait': '待检',
      'gate.verifying': '校验中',
      'gate.welcome': '欢迎您，{name} 专员',
      'gate.rank': '权限等级 S · 执行员登录完成',
      'gate.skip': '跳过确认 [ESC / 点击任意处]',
      'nav': '执行员档案',
      'sec.title': '执行员档案',
      'sec.desc': '登录时显示的专员代号决定权限确认结束后的欢迎语。修改后立即生效，并用于下次打开应用时的致意。',
      'sec.name': '专员代号',
      'sec.save': '保存档案',
      'sec.saved': '已归档',
      'sec.saveFailed': '无法持久化，仅本次生效',
      'sec.skinOn': '关闭龙族配色',
      'sec.skinOff': '启用龙族配色',
      'sec.hudOn': '隐藏 HUD 装饰',
      'sec.hudOff': '显示 HUD 装饰',
      'sec.autoplayOn': '关闭开场动画',
      'sec.autoplayOff': '开启开场动画',
      'sec.replay': '重播权限确认',
      'sec.hint': '龙族配色是叠在系统主题之上的皮肤层，跟随「设置 → 外观」的浅色/深色；HUD 只有描边与扫描线，不遮挡操作。',
    };
    const DICT_EN = {
      'brand.name': 'CASSELL EXEC.',
      'gate.org': 'CASSELL COLLEGE · EXECUTIVE DEPT.',
      'gate.title': 'CLEARANCE CHECK',
      'gate.sub': 'EXECUTIVE ACCESS PROTOCOL',
      'gate.beacon': 'Operator beacon',
      'gate.bio': 'Biometric match',
      'gate.ling': 'Ling permission check',
      'gate.runes': 'Dragon-rune key decode',
      'gate.clear': 'Clearance assignment',
      'gate.ok': 'PASS',
      'gate.wait': 'WAIT',
      'gate.verifying': 'CHECK',
      'gate.welcome': 'Welcome, Operator {name}',
      'gate.rank': 'CLEARANCE S · EXECUTIVE SIGNED IN',
      'gate.skip': 'Skip [ESC / click anywhere]',
      'nav': 'Operator profile',
      'sec.title': 'Operator profile',
      'sec.desc': 'The codename used in the greeting after the clearance sequence. Changes apply immediately and are used the next time the app opens.',
      'sec.name': 'Operator codename',
      'sec.save': 'Save profile',
      'sec.saved': 'Saved',
      'sec.saveFailed': 'Not persisted; this session only',
      'sec.skinOn': 'Disable Dragon Raja colors',
      'sec.skinOff': 'Enable Dragon Raja colors',
      'sec.hudOn': 'Hide HUD decoration',
      'sec.hudOff': 'Show HUD decoration',
      'sec.autoplayOn': 'Disable opening sequence',
      'sec.autoplayOff': 'Enable opening sequence',
      'sec.replay': 'Replay clearance check',
      'sec.hint': 'The Dragon Raja palette is a skin layer over the system theme, so it follows Settings → Appearance light/dark. The HUD is outline and scanline only and never blocks input.',
    };

    const CSS = `
.drj-sigil { display: block; color: var(--dsw-alias-brand-primary, #c9a25e); }
.drj-frame { position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.drj-frame-grid { position: absolute; inset: -12%; background-image: linear-gradient(rgba(216,178,100,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(216,178,100,.05) 1px, transparent 1px); background-size: 88px 88px; -webkit-mask-image: radial-gradient(120% 80% at 50% 18%, #000 18%, transparent 78%); mask-image: radial-gradient(120% 80% at 50% 18%, #000 18%, transparent 78%); opacity: .45; }
.drj-frame-scan { position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(216,178,100,.035) 0 1px, transparent 1px 4px); opacity: .5; }
.drj-frame-beam { position: absolute; left: 0; right: 0; height: 140px; background: linear-gradient(to bottom, rgba(216,178,100,0), rgba(216,178,100,.055), rgba(216,178,100,0)); animation: drjSweep 11s linear infinite; }
@keyframes drjSweep { 0% { transform: translateY(-160px); } 100% { transform: translateY(100vh); } }
.drj-corner { position: absolute; width: 54px; height: 54px; border: 0 solid rgba(216,178,100,.5); }
.drj-tl { top: 14px; left: 14px; border-top-width: 1px; border-left-width: 1px; }
.drj-tr { top: 14px; right: 14px; border-top-width: 1px; border-right-width: 1px; }
.drj-bl { bottom: 14px; left: 14px; border-bottom-width: 1px; border-left-width: 1px; }
.drj-br { bottom: 14px; right: 14px; border-bottom-width: 1px; border-right-width: 1px; }
.drj-gate { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; pointer-events: auto; background: radial-gradient(130% 90% at 50% 30%, #0b1119 0%, #05070b 52%, #020305 100%); color: #ece5d5; opacity: 1; transition: opacity .55s ease; }
.drj-gate::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(216,178,100,.028) 0 1px, transparent 1px 3px); pointer-events: none; }
.drj-gate.is-out { opacity: 0; }
.drj-panel { position: relative; width: min(560px, 90vw); padding: 30px 28px 24px; background: linear-gradient(180deg, rgba(13,19,27,.94), rgba(6,9,13,.97)); border: 1px solid rgba(216,178,100,.26); box-shadow: 0 30px 90px rgba(0,0,0,.7), 0 0 60px rgba(216,178,100,.07), inset 0 0 0 1px rgba(216,178,100,.05); clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px)); outline: none; }
.drj-kicker { text-align: center; font: 10px/1.4 ui-monospace, Consolas, monospace; letter-spacing: .38em; color: rgba(216,178,100,.72); text-transform: uppercase; }
.drj-sigil-wrap { display: flex; justify-content: center; margin: 18px 0 4px; color: #d8b264; filter: drop-shadow(0 0 14px rgba(216,178,100,.35)); animation: drjGlow 2.6s ease-in-out infinite; }
@keyframes drjGlow { 0%, 100% { opacity: .82; } 50% { opacity: 1; } }
.drj-title { margin: 6px 0 0; text-align: center; font-size: 26px; font-weight: 500; letter-spacing: .46em; text-indent: .46em; color: #f3e8c9; text-shadow: 0 0 22px rgba(216,178,100,.35); }
.drj-title small { display: block; margin-top: 10px; font: 10px ui-monospace, monospace; letter-spacing: .3em; text-indent: .3em; color: rgba(143,156,170,.85); }
.drj-checks { list-style: none; margin: 22px 0 0; padding: 0; }
.drj-check { display: flex; justify-content: space-between; gap: 12px; padding: 9px 2px; border-bottom: 1px dashed rgba(216,178,100,.13); font: 12px/1.2 ui-monospace, Consolas, monospace; letter-spacing: .06em; opacity: 0; transform: translateX(-8px); transition: opacity .4s ease, transform .4s ease; }
.drj-check.is-on { opacity: 1; transform: none; }
.drj-check-k { color: rgba(236,229,213,.72); }
.drj-check-v { color: rgba(216,178,100,.55); }
.drj-check.is-on .drj-check-v { color: #52d3ae; text-shadow: 0 0 10px rgba(82,211,174,.35); }
.drj-progress { margin-top: 20px; height: 2px; background: rgba(216,178,100,.14); overflow: hidden; }
.drj-progress i { display: block; height: 100%; background: linear-gradient(90deg, #8a6a2f, #eed59b 60%, #8a6a2f); box-shadow: 0 0 14px rgba(216,178,100,.6); transition: width .18s linear; }
.drj-welcome-slot { min-height: 78px; margin-top: 18px; }
.drj-welcome { text-align: center; animation: drjIn .5s ease both; }
@keyframes drjIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.drj-welcome-line { font-size: 21px; letter-spacing: .12em; color: #f6ecd0; text-shadow: 0 0 24px rgba(216,178,100,.45); }
.drj-welcome-sub { margin-top: 9px; font: 10px ui-monospace, monospace; letter-spacing: .3em; color: rgba(216,178,100,.6); }
.drj-skip { position: absolute; right: 16px; bottom: 12px; background: none; border: 0; padding: 6px 4px; color: rgba(216,178,100,.66); font: 10px ui-monospace, monospace; letter-spacing: .16em; cursor: pointer; }
.drj-skip:hover { color: rgba(216,178,100,.95); }
.drj-brand { font-size: 13px; letter-spacing: .16em; }
.drj-sec { display: flex; flex-direction: column; gap: 14px; max-width: 620px; padding: 4px 2px 24px; }
.drj-sec h3 { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: .18em; color: var(--dsw-alias-label-primary); }
.drj-sec p { margin: 0; font-size: 12px; line-height: 1.75; color: var(--dsw-alias-label-secondary); }
.drj-label { font-size: 12px; letter-spacing: .12em; color: var(--dsw-alias-label-secondary); }
.drj-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.drj-input { flex: 1 1 220px; min-width: 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 4px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font: 13px ui-monospace, Consolas, monospace; letter-spacing: .1em; }
.drj-input:focus { outline: none; border-color: var(--dsw-alias-border-l2); box-shadow: 0 0 0 1px rgba(216,178,100,.2); }
.drj-btn { padding: 8px 14px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; background: transparent; color: var(--dsw-alias-brand-primary); font-size: 12px; letter-spacing: .14em; cursor: pointer; }
.drj-btn:hover { background: rgba(216,178,100,.1); }
.drj-btn.primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: var(--dsw-alias-bg-base); }
.drj-hint { font-size: 11px; line-height: 1.7; color: var(--dsw-alias-label-secondary); opacity: .85; }
.drj-flex { flex: 1 1 auto; }
@media (prefers-reduced-motion: reduce) { .drj-frame-beam, .drj-sigil-wrap { animation: none; } .drj-gate { transition: none; } }
`;

    // ── storage helpers (every access guarded; no throwing at call time) ──────
    function store(kind) {
      try { return kind === 'session' ? window.sessionStorage : window.localStorage; }
      catch { return null; }
    }
    function readFlag(key, fallback) {
      const storage = store('local');
      if (storage === null) return fallback;
      try {
        const value = storage.getItem(key);
        if (value === null) return fallback;
        return value.trim() === '1';
      } catch { return fallback; }
    }
    function writeFlag(key, on) {
      const storage = store('local');
      if (storage === null) return false;
      try { storage.setItem(key, on ? '1' : '0'); return true; } catch { return false; }
    }
    function readOperator() {
      const storage = store('local');
      let value = null;
      try { value = storage === null ? null : storage.getItem(KEY_OPERATOR); } catch { value = null; }
      return value !== null && value.trim() !== '' ? value.trim() : DEFAULT_OPERATOR;
    }
    function writeOperator(name) {
      const storage = store('local');
      if (storage === null) return false;
      try { storage.setItem(KEY_OPERATOR, name); return true; } catch { return false; }
    }
    function sessionSeen() {
      const storage = store('session');
      if (storage === null) return false;
      try { return storage.getItem(SESSION_SEEN) === '1'; } catch { return false; }
    }
    function markSessionSeen() {
      const storage = store('session');
      if (storage === null) return;
      try { storage.setItem(SESSION_SEEN, '1'); } catch { /* session storage unavailable */ }
    }
    function readSkin() { return readFlag(KEY_SKIN, true); }
    function readHud() { return readFlag(KEY_HUD, true); }
    function readAutoplay() { return readFlag(KEY_AUTOPLAY, true); }
    function fill(text, vars) {
      return String(text).replace(/\{(\w+)\}/g, (match, key) => (vars[key] === undefined ? match : vars[key]));
    }

    // ── artwork ──────────────────────────────────────────────────────────────
    function DragonSigil({ size }) {
      const edge = size || 26;
      return h('svg', {
        className: 'drj-sigil', viewBox: '0 0 64 64', width: edge, height: edge,
        'aria-hidden': 'true', focusable: 'false',
      },
      h('circle', { cx: 32, cy: 32, r: 30, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, opacity: 0.85 }),
      h('circle', { cx: 32, cy: 32, r: 25, fill: 'none', stroke: 'currentColor', strokeWidth: 0.7, strokeDasharray: '2 4', opacity: 0.5 }),
      h('path', { d: 'M32 13 L38.5 22.5 L32 20.2 L25.5 22.5 Z', fill: 'currentColor' }),
      h('path', { d: 'M18 30 Q25 24.5 32 26 Q39 24.5 46 30 Q39 28.2 32 29.4 Q25 28.2 18 30 Z', fill: 'currentColor' }),
      h('circle', { cx: 32, cy: 39.5, r: 5.4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
      h('circle', { cx: 32, cy: 39.5, r: 2, fill: '#e2455a' }),
      h('path', { d: 'M26.5 47.5 Q32 51.5 37.5 47.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }));
    }

    // ── frame-wide HUD (no text: it must never collide with app chrome) ──────
    function Frame() {
      const [on, setOn] = useState(readHud);
      useEffect(() => {
        const sync = () => setOn(readHud());
        window.addEventListener(EVENT_PROFILE, sync);
        return () => window.removeEventListener(EVENT_PROFILE, sync);
      }, []);
      if (!on) return null;
      return h('div', { className: 'drj-frame', 'aria-hidden': 'true' },
        h('div', { className: 'drj-frame-grid' }),
        h('div', { className: 'drj-frame-scan' }),
        h('div', { className: 'drj-frame-beam' }),
        h('div', { className: 'drj-corner drj-tl' }),
        h('div', { className: 'drj-corner drj-tr' }),
        h('div', { className: 'drj-corner drj-bl' }),
        h('div', { className: 'drj-corner drj-br' }));
    }

    // ── clearance gate ───────────────────────────────────────────────────────
    function Gate({ t }) {
      const [visible, setVisible] = useState(() => readAutoplay() && !sessionSeen());
      const [startedAt, setStartedAt] = useState(() => Date.now());
      const [now, setNow] = useState(0);
      const [operator, setOperator] = useState(readOperator);
      const panelRef = useRef(null);

      useEffect(() => {
        const sync = () => setOperator(readOperator());
        window.addEventListener(EVENT_PROFILE, sync);
        return () => window.removeEventListener(EVENT_PROFILE, sync);
      }, []);

      useEffect(() => {
        const replay = () => {
          setStartedAt(Date.now());
          setNow(0);
          setVisible(true);
        };
        window.addEventListener(EVENT_REPLAY, replay);
        return () => window.removeEventListener(EVENT_REPLAY, replay);
      }, []);

      const skip = useCallback(() => setStartedAt(Date.now() - FADE_END), []);

      useEffect(() => {
        if (!visible) return undefined;
        markSessionSeen();
        let frame = 0;
        const tick = () => {
          const elapsed = Date.now() - startedAt;
          setNow(elapsed);
          if (elapsed < FADE_END) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        const onKey = (event) => { if (event.key === 'Escape') skip(); };
        window.addEventListener('keydown', onKey);
        if (panelRef.current) panelRef.current.focus();
        return () => {
          cancelAnimationFrame(frame);
          window.removeEventListener('keydown', onKey);
        };
      }, [visible, startedAt, skip]);

      useEffect(() => {
        if (visible && now >= FADE_END) setVisible(false);
      }, [now, visible]);

      if (!visible) return null;

      const elapsed = now;
      const out = elapsed >= WELCOME_END;
      const welcome = elapsed >= AUTH_END;
      const progress = Math.min(100, (elapsed / AUTH_END) * 100);
      const typedCount = Math.min(operator.length, Math.max(0, Math.floor((elapsed - AUTH_END) / 60)));
      const typedName = operator.slice(0, typedCount) + (typedCount < operator.length ? '\u258C' : '');
      const canSkip = elapsed >= SKIPPABLE_AFTER;

      return h('div', {
        className: 'drj-gate' + (out ? ' is-out' : ''),
        role: 'dialog', 'aria-modal': 'true', 'aria-label': t('gate.title'),
        onClick: () => { if (canSkip) skip(); },
      },
      h('div', { className: 'drj-panel', ref: panelRef, tabIndex: -1 },
        h('div', { className: 'drj-kicker' }, t('gate.org')),
        h('div', { className: 'drj-sigil-wrap' }, h(DragonSigil, { size: 74 })),
        h('h1', { className: 'drj-title' }, t('gate.title'), h('small', null, t('gate.sub'))),
        h('ul', { className: 'drj-checks' }, CHECK_KEYS.map((key, index) =>
          h('li', { key, className: 'drj-check' + (elapsed >= CHECK_AT[index] ? ' is-on' : '') },
            h('span', { className: 'drj-check-k' }, t(key)),
            h('span', { className: 'drj-check-v' }, elapsed >= CHECK_AT[index] ? t('gate.ok') : t('gate.verifying'))))),
        h('div', { className: 'drj-progress' }, h('i', { style: { width: progress + '%' } })),
        h('div', { className: 'drj-welcome-slot' },
          welcome
            ? h('div', { className: 'drj-welcome' },
              h('div', { className: 'drj-welcome-line' }, fill(t('gate.welcome'), { name: typedName })),
              h('div', { className: 'drj-welcome-sub' }, t('gate.rank')))
            : null),
        h('button', {
          type: 'button', className: 'drj-skip',
          onClick: (event) => { event.stopPropagation(); skip(); },
        }, t('gate.skip'))));
    }

    // ── settings section ─────────────────────────────────────────────────────
    function Section({ t, close }) {
      const [name, setName] = useState(readOperator);
      const [hud, setHud] = useState(readHud);
      const [skin, setSkin] = useState(readSkin);
      const [autoplay, setAutoplay] = useState(readAutoplay);
      const [status, setStatus] = useState('idle');

      const commit = () => {
        const next = name.trim() === '' ? DEFAULT_OPERATOR : name.trim();
        setName(next);
        const stored = writeOperator(next);
        if (!stored && readOperator() !== next) { setStatus('failed'); return; }
        setStatus('saved');
        window.dispatchEvent(new CustomEvent(EVENT_PROFILE));
      };
      const toggle = (read, write, next) => {
        write(next);
        setStatus('idle');
        window.dispatchEvent(new CustomEvent(EVENT_PROFILE));
      };

      const toggleSkin = () => {
        const next = !skin;
        writeFlag(KEY_SKIN, next);
        setSkin(next);
        window.dispatchEvent(new CustomEvent(EVENT_SKIN));
      };
      const toggleAutoplay = () => {
        const next = !autoplay;
        writeFlag(KEY_AUTOPLAY, next);
        setAutoplay(next);
      };
      const replay = () => {
        if (typeof close === 'function') close();
        window.dispatchEvent(new CustomEvent(EVENT_REPLAY));
      };

      return h('div', { className: 'drj-sec' },
        h('h3', null, t('sec.title')),
        h('p', null, t('sec.desc')),
        h('label', { className: 'drj-label', htmlFor: 'drj-operator-input' }, t('sec.name')),
        h('div', { className: 'drj-row' },
          h('input', {
            id: 'drj-operator-input',
            className: 'drj-input', value: name, maxLength: 24, spellCheck: false,
            onChange: (event) => { setName(event.target.value); setStatus('idle'); },
            onKeyDown: (event) => { if (event.key === 'Enter') commit(); },
          }),
          h('button', { type: 'button', className: 'drj-btn primary', onClick: commit },
            status === 'saved' ? t('sec.saved') : status === 'failed' ? t('sec.saveFailed') : t('sec.save'))),
        h('div', { className: 'drj-row' },
          h('button', { type: 'button', className: 'drj-btn', onClick: toggleSkin }, skin ? t('sec.skinOn') : t('sec.skinOff')),
          h('button', { type: 'button', className: 'drj-btn', onClick: toggleAutoplay }, autoplay ? t('sec.autoplayOn') : t('sec.autoplayOff')),
          h('button', { type: 'button', className: 'drj-btn', onClick: () => toggle(hud, setHud, !hud) }, hud ? t('sec.hudOn') : t('sec.hudOff'))),
        h('div', { className: 'drj-row' }, h('button', { type: 'button', className: 'drj-btn', onClick: replay }, t('sec.replay'))),
        h('div', { className: 'drj-hint' }, t('sec.hint')));
    }

    // ── plugin ───────────────────────────────────────────────────────────────
    return {
      inject: ['slots', 'locale', 'theme'],
      apply(ctx) {
        ctx.effect(() => {
          const disposeZh = ctx.locale.register(NS, 'zh', DICT_ZH);
          const disposeEn = ctx.locale.register(NS, 'en', DICT_EN);
          return () => { disposeZh(); disposeEn(); };
        }, 'dragon-raja: dictionaries');
        const t = ctx.locale.bind(NS);

        // Skin layer: overrides stack on the active theme, so the user's
        // light/dark preference keeps working and can be switched in Appearance.
        let disposeSkin = null;
        const applySkin = () => {
          if (disposeSkin !== null) return;
          try { disposeSkin = ctx.theme.overrideTokens(SKIN, TOKEN_MODES); } catch (error) {
            console.warn('[dragon-raja] skin layer failed:', error);
          }
        };
        const removeSkin = () => {
          if (disposeSkin === null) return;
          const dispose = disposeSkin;
          disposeSkin = null;
          try { dispose(); } catch { /* already disposed */ }
        };
        ctx.effect(() => {
          applySkin();
          const sync = () => { if (readSkin()) applySkin(); else removeSkin(); };
          window.addEventListener(EVENT_SKIN, sync);
          return () => {
            window.removeEventListener(EVENT_SKIN, sync);
            removeSkin();
          };
        }, 'dragon-raja: skin');

        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-dragon-raja', '');
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => style.remove();
        }, 'dragon-raja: styles');

        ctx.slots.inject('shell.overlay', function* () {
          yield ctx.slots.register({ name: 'shell.overlay', id: 'dragon-raja.frame', order: 900 }, () => h(Frame, {}));
          yield ctx.slots.register({ name: 'shell.overlay', id: 'dragon-raja.gate', order: 9999 }, () => h(Gate, { t }));
        });

        ctx.slots.inject('settings.section', function* () {
          yield ctx.slots.register({
            name: 'settings.section', id: 'dragon-raja', order: 36,
            label: () => t('nav'), inject: () => ({ t }),
          }, Section);
        });

        // Single-occupant slots: a lower priority shadows the shipped brand.
        try {
          ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register(
            { name: 'sidebar.brand.mark', priority: -1 },
            (props) => h(DragonSigil, { size: (props && props.size) || 26 })));
        } catch (error) {
          console.warn('[dragon-raja] brand mark slot unavailable:', error);
        }

        try {
          ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register(
            { name: 'sidebar.brand.name', priority: -1 },
            () => h('span', { className: 'drj-brand' }, t('brand.name'))));
        } catch (error) {
          console.warn('[dragon-raja] brand name slot unavailable:', error);
        }
      },
    };
  },
});
