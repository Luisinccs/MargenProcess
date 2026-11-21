// soda-runtime.js - Motor de Ejecución Universal SODA v3.0
// Arquitectura ligera, sin objetos de transición heredados, con modelo de Journeys estilo Figma (Previews + Segues).

// =============================================================================
// 1. ESTILOS BASE COMPARTIDOS Y UTILIDADES DE ÁRBOL (DFS 1-PASS CON PODA)
// =============================================================================
let _sodaBaseStylesInjected = false;
let _sodaJourneyStylesInjected = false;

function ensureSodaBaseStyles() {
    if (_sodaBaseStylesInjected || typeof document === 'undefined') return;
    _sodaBaseStylesInjected = true;
    if (document.getElementById('soda-base-styles')) return;
    const style = document.createElement('style');
    style.id = 'soda-base-styles';
    style.textContent = `
        ui-frame, ui-stack, ui-page, ui-text, ui-rich-text, ui-span,
        ui-rect, ui-ellipse, ui-line, ui-path, ui-icon, ui-slot, ui-chart,
        ui-page-break, report-header, page-header, report-detail, page-footer, report-footer,
        wf-avatar, wf-box, wf-button, wf-image, wf-input, wf-switch-field, wf-search-box {
            box-sizing: border-box;
        }
        wf-avatar, wf-box, wf-button, wf-image, wf-input, wf-switch-field, wf-search-box {
            display: inline-flex;
            flex-shrink: 0;
        }
        wf-avatar { border-radius: 999px; }
        wf-input, wf-switch-field, wf-search-box {
            display: flex;
        }
        wf-avatar *, wf-box *, wf-button *, wf-image *, wf-input *, wf-switch-field *, wf-search-box * {
            pointer-events: none;
            box-sizing: border-box;
        }
        :root, [data-theme="dark"] {
            --wf-bg: var(--soda-color-wf-bg, #1f242c);
            --wf-surface: var(--soda-color-wf-surface, #2b313a);
            --wf-stroke: var(--soda-color-wf-stroke, #6e7681);
            --wf-text: var(--soda-color-wf-text, #c9d1d9);
            --wf-muted: var(--soda-color-wf-muted, #3b434f);
            --wf-sans: var(--soda-font-family-wf-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
            --wf-sm: var(--soda-spacing-wf-sm, 8px);
            --wf-md: var(--soda-spacing-wf-md, 14px);
            --wf-xs: var(--soda-radius-wf-xs, 4px);
            --wf-full: var(--soda-radius-wf-full, 999px);
        }
        [data-theme="light"] {
            --wf-bg: var(--soda-color-wf-bg, #f3f4f6);
            --wf-surface: var(--soda-color-wf-surface, #e5e7eb);
            --wf-stroke: var(--soda-color-wf-stroke, #9ca3af);
            --wf-text: var(--soda-color-wf-text, #4b5563);
            --wf-muted: var(--soda-color-wf-muted, #d1d5db);
        }
        ui-frame, ui-stack { display: flex; }
        ui-page { display: flex; flex-direction: column; position: relative; }
        ui-text { display: inline-flex; align-items: center; }
        ui-rich-text { display: block; white-space: normal; word-break: break-word; overflow-wrap: break-word; }
        ui-span { display: inline; }
        ui-rect { display: block; }
        ui-ellipse { display: block; border-radius: 50%; }
        ui-line { display: block; flex-shrink: 0; }
        ui-path { display: inline-flex; align-items: center; justify-content: center; }
        ui-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        ui-slot { display: flex; align-items: center; justify-content: center; }
        ui-repeat { display: contents; }
        ui-chart { display: block; position: relative; overflow: hidden; }
        ui-page-break { display: flex; align-items: center; width: 100%; height: 12px; break-after: page; page-break-after: always; }
        report-header, page-header, report-detail, page-footer, report-footer {
            display: flex; flex-direction: column; width: 100%;
        }
        [hover-bg]:hover { background-color: var(--soda-hover-bg) !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
}

/**
 * Recorrido DFS pre-orden en pasada única con pila explícita (sin riesgo de stack overflow
 * ni alocaciones de NodeList). Si visitor(el) retorna false, poda el subárbol de ese nodo.
 */
function walkElements(root, visitor) {
    if (!root) return;
    const first = root.firstElementChild;
    if (!first) return;
    const stack = [first];
    while (stack.length > 0) {
        const el = stack.pop();
        const next = el.nextElementSibling;
        if (next) stack.push(next);
        if (visitor(el) !== false && el.firstElementChild) {
            stack.push(el.firstElementChild);
        }
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
}

function attrAny(el, keys, fallback = '') {
    for (let i = 0; i < keys.length; i++) {
        const v = el.getAttribute(keys[i]);
        if (v !== null && v !== '') return v;
    }
    return fallback;
}

const SELF_CLOSING_CUSTOM_RE = /<((?:[a-z0-9]+-)+[a-zA-Z0-9_-]+)([^>]*)\/>/g;
const SLOT_CONTENT_VAR_RE = /<ui-slot\b([^>]*\bcontent="\$\{([^}]+)\}"[^>]*)>/gi;
const TEMPLATE_VAR_RE = /\$\{([^}]+)\}/g;

function normalizeCustomTags(markup) {
    if (!markup) return '';
    return markup
        .replace(SELF_CLOSING_CUSTOM_RE, '<$1$2></$1>')
        .replace(SLOT_CONTENT_VAR_RE, (m, attrs, propName) =>
            attrs.includes('data-slot-prop') ? m : `<ui-slot data-slot-prop="${propName}"${attrs}>`
        );
}

// =============================================================================
// 2. SISTEMA DE TOKENS Y TEMAS BIMODALES (SodaTheme — 1-PASS DFS)
// =============================================================================
const STYLE_TOKEN_CATEGORY_MAP = {
    'font-family': 'fontFamily',
    'font-size': 'fontSize',
    'font-weight': 'fontWeight',
    'spacing': 'spacing',
    'radius': 'radius',
    'dimension': 'dimension',
    'border': 'border'
};

class SodaTheme {
    static currentMode = 'dark'; // 'light' | 'dark'
    static _dirty = false;
    static _stylesApplied = false;
    static _lastCssText = '';
    static tokens = {
        color: {},
        fontFamily: {},
        fontSize: {},
        fontWeight: {},
        spacing: {},
        radius: {},
        dimension: {},
        font: {},
        border: {}
    };

    static parseStyleDefs(xmlDocOrRoot, deferApply = false) {
        if (!xmlDocOrRoot) return;
        const root = (xmlDocOrRoot.tagName && /^(style-defs|styles)$/i.test(xmlDocOrRoot.tagName))
            ? xmlDocOrRoot
            : xmlDocOrRoot.querySelector('style-defs, styles');
        if (!root) return;

        // Recorrido único sobre todo <style-defs> (reemplaza 9 querySelectorAll por 1 pasada con poda)
        walkElements(root, (el) => {
            const tag = el.tagName.toLowerCase();
            if (tag === 'color') {
                const name = el.getAttribute('name');
                if (name) {
                    const light = el.getAttribute('light') || '';
                    this.tokens.color[name] = { light, dark: el.getAttribute('dark') || light };
                    this._dirty = true;
                }
                return false;
            }
            if (tag === 'font') {
                const name = el.getAttribute('name');
                if (name) {
                    const fontDef = {
                        fontSize: el.getAttribute('font-size') || el.getAttribute('size') || '',
                        fontFamily: el.getAttribute('font-family') || el.getAttribute('family') || '',
                        fontWeight: el.getAttribute('font-weight') || el.getAttribute('weight') || '',
                        lineHeight: el.getAttribute('line-height') || ''
                    };
                    this.tokens.font[name] = fontDef;
                    this.tokens.font[name.toLowerCase()] = fontDef;
                    this._dirty = true;
                }
                return false;
            }
            const bucket = STYLE_TOKEN_CATEGORY_MAP[tag];
            if (bucket) {
                const name = el.getAttribute('name');
                if (name) {
                    this.tokens[bucket][name] = el.getAttribute('value') || '';
                    this._dirty = true;
                }
                return false;
            }
            // Descender en contenedores de agrupación (ej. <group>, <section>)
            return true;
        });

        if (!deferApply) {
            this.applyCssVariables();
        }
    }

    static applyCssVariables() {
        if (typeof document === 'undefined') return;
        const lines = [':root {'];

        for (const [name, val] of Object.entries(this.tokens.color)) {
            lines.push(`  --soda-color-${name}: ${this.currentMode === 'dark' ? (val.dark || val.light) : val.light};`);
        }
        for (const [name, val] of Object.entries(this.tokens.fontFamily)) lines.push(`  --soda-font-family-${name}: ${val};`);
        for (const [name, val] of Object.entries(this.tokens.fontSize)) lines.push(`  --soda-font-size-${name}: ${val};`);
        for (const [name, val] of Object.entries(this.tokens.fontWeight)) lines.push(`  --soda-font-weight-${name}: ${val};`);
        for (const [name, val] of Object.entries(this.tokens.spacing)) lines.push(`  --soda-spacing-${name}: ${val};`);
        for (const [name, val] of Object.entries(this.tokens.radius)) lines.push(`  --soda-radius-${name}: ${val};`);
        for (const [name, val] of Object.entries(this.tokens.dimension)) lines.push(`  --soda-dim-${name}: ${val};`);
        for (const [name, val] of Object.entries(this.tokens.border)) lines.push(`  --soda-border-${name}: ${val};`);

        lines.push('}', '[data-theme="light"] {');
        for (const [name, val] of Object.entries(this.tokens.color)) {
            lines.push(`  --soda-color-${name}: ${val.light};`);
        }
        lines.push('}', '[data-theme="dark"] {');
        for (const [name, val] of Object.entries(this.tokens.color)) {
            lines.push(`  --soda-color-${name}: ${val.dark || val.light};`);
        }
        lines.push('}');

        const cssText = lines.join('\n');
        let styleEl = document.getElementById('soda-theme-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'soda-theme-styles';
            (document.head || document.documentElement).appendChild(styleEl);
        }
        if (this._lastCssText !== cssText) {
            styleEl.textContent = cssText;
            this._lastCssText = cssText;
        }
        this._dirty = false;
        this._stylesApplied = true;
    }

    static setMode(mode) {
        if (mode !== 'light' && mode !== 'dark') return;
        this.currentMode = mode;
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', mode);
        }
        if (!this._stylesApplied || this._dirty) {
            this.applyCssVariables();
        }
    }
}

// =============================================================================
// 3. MOTOR DE ESTILOS INCREMENTAL Y AUTO-LAYOUT (SodaStyleEngine)
// =============================================================================
const CSS_NAMED_COLORS = new Set([
    'currentcolor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'gray', 'grey', 'pink', 'cyan', 'magenta', 'lime', 'maroon', 'navy',
    'olive', 'teal', 'aqua', 'fuchsia', 'silver', 'gold', 'brown'
]);

const BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;
const UNIT_RE = /(px|rem|em|vh|vw|dvh|dvw|%)$/;

function resolveSodaColor(val) {
    if (!val || val === 'none' || val === 'transparent') return 'transparent';
    const str = String(val).trim();
    if (!str) return 'transparent';
    const c0 = str.charCodeAt(0);
    if (c0 === 35 || str.startsWith('rgb') || str.startsWith('hsl') || str.startsWith('var(')) {
        return str;
    }
    if (CSS_NAMED_COLORS.has(str.toLowerCase())) return str;
    return `var(--soda-color-${str})`;
}

function resolveDimension(val) {
    if (!val) return 'auto';
    const str = String(val).trim();
    if (str === 'hug') return 'fit-content';
    if (str === 'fill') return '100%';
    if (BARE_NUMBER_RE.test(str)) return `${str}px`;
    if (UNIT_RE.test(str) || str.startsWith('calc(') || str.startsWith('var(')) return str;
    return `var(--soda-dim-${str}, ${str})`;
}

function resolveSpacingToken(str) {
    if (!str || str === 'none' || str === '0') return '0px';
    if (str === 'auto') return 'auto';
    if (BARE_NUMBER_RE.test(str)) return `${str}px`;
    if (UNIT_RE.test(str) || str.startsWith('calc(') || str.startsWith('var(')) return str;
    return `var(--soda-spacing-${str}, ${str})`;
}

function resolveSpacing(val) {
    if (!val || val === 'none' || val === '0') return '0px';
    const str = String(val).trim();
    if (str.includes(' ')) {
        return str.split(/\s+/).map(resolveSpacingToken).join(' ');
    }
    return resolveSpacingToken(str);
}

function resolveRadius(val) {
    if (!val || val === 'none' || val === '0') return '0px';
    const str = String(val).trim();
    if (BARE_NUMBER_RE.test(str)) return `${str}px`;
    if (UNIT_RE.test(str) || str.startsWith('var(')) return str;
    return `var(--soda-radius-${str}, ${str})`;
}

function resolveFontSize(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (BARE_NUMBER_RE.test(str)) return `${str}px`;
    if (UNIT_RE.test(str) || str.startsWith('var(')) return str;
    return `var(--soda-font-size-${str}, ${str})`;
}

function resolveFontWeight(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (/^\d+$/.test(str)) return str;
    return `var(--soda-font-weight-${str}, ${str})`;
}

function resolveFontFamily(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (str.includes(',') || str.includes(' ')) return str;
    return `var(--soda-font-family-${str}, ${str})`;
}

function normalizeFlexAlign(val) {
    if (val === 'start') return 'flex-start';
    if (val === 'end') return 'flex-end';
    return val;
}

function applyBorderSideWidth(s, sideProp, styleProp, val) {
    const str = (val || '').trim();
    if (!str || str === 'none' || str === '0') {
        s[sideProp] = '0px';
        return;
    }
    if (!s[styleProp] && !s.borderStyle) s[styleProp] = 'solid';
    s[sideProp] = resolveDimension(str);
}

function applyBorderSideColor(s, colorProp, styleProp, widthProp, val) {
    if (!s[styleProp] && !s.borderStyle) s[styleProp] = 'solid';
    if (!s[widthProp] && !s.borderWidth) s[widthProp] = '1px';
    s[colorProp] = resolveSodaColor(val);
}

const SODA_STYLE_HANDLERS = {
    'direction': (val, s) => {
        if (val === 'horizontal' || val === 'row') {
            if (!s.display || s.display === 'grid') s.display = 'flex';
            s.flexDirection = 'row';
        } else if (val === 'vertical' || val === 'column') {
            if (!s.display || s.display === 'grid') s.display = 'flex';
            s.flexDirection = 'column';
        } else if (val === 'layer' || val === 'grid') {
            s.display = 'grid';
            if (val === 'layer') {
                s.gridTemplateAreas = '"layer"';
                s.gridTemplateColumns = '1fr';
                s.gridTemplateRows = '1fr';
            }
        }
    },
    'width': (val, s, el) => {
        if (val === 'hug') {
            s.width = 'fit-content';
        } else if (val === 'fill') {
            s.width = '100%';
            const pDir = (el.parentElement && el.parentElement.getAttribute('direction')) || 'vertical';
            if (pDir === 'horizontal' || pDir === 'row') s.flex = '1 1 0%';
            else s.alignSelf = 'stretch';
        } else {
            s.width = resolveDimension(val);
        }
    },
    'height': (val, s, el) => {
        if (val === 'hug') {
            s.height = 'fit-content';
        } else if (val === 'fill') {
            s.height = '100%';
            const pDir = (el.parentElement && el.parentElement.getAttribute('direction')) || 'vertical';
            if (pDir === 'vertical' || pDir === 'column') s.flex = '1 1 0%';
            else s.alignSelf = 'stretch';
        } else {
            s.height = resolveDimension(val);
        }
    },
    'min-width': (val, s) => { s.minWidth = resolveDimension(val); },
    'max-width': (val, s) => { s.maxWidth = resolveDimension(val); },
    'min-height': (val, s) => { s.minHeight = resolveDimension(val); },
    'max-height': (val, s) => { s.maxHeight = resolveDimension(val); },
    'flex': (val, s) => {
        const v = String(val || '').trim();
        s.flex = (v === '1' || v === 'true' || v === 'fill') ? '1 1 0%' : v;
    },
    'weight': (val, s) => {
        const v = String(val || '').trim();
        s.flex = (v === '1' || v === 'true' || v === 'fill') ? '1 1 0%' : `${v} 1 0%`;
    },
    'align': (val, s) => { s.alignItems = normalizeFlexAlign(val); },
    'justify': (val, s) => { s.justifyContent = normalizeFlexAlign(val); },
    'align-self': (val, s) => { s.alignSelf = normalizeFlexAlign(val); },
    'gap': (val, s) => { s.gap = resolveSpacing(val); },
    'padding': (val, s) => { s.padding = resolveSpacing(val); },
    'padding-x': (val, s) => { const p = resolveSpacing(val); s.paddingLeft = p; s.paddingRight = p; },
    'padding-y': (val, s) => { const p = resolveSpacing(val); s.paddingTop = p; s.paddingBottom = p; },
    'padding-top': (val, s) => { s.paddingTop = resolveSpacing(val); },
    'padding-bottom': (val, s) => { s.paddingBottom = resolveSpacing(val); },
    'padding-left': (val, s) => { s.paddingLeft = resolveSpacing(val); },
    'padding-right': (val, s) => { s.paddingRight = resolveSpacing(val); },
    'margin': (val, s) => { s.margin = resolveSpacing(val); },
    'margin-x': (val, s) => { const m = resolveSpacing(val); s.marginLeft = m; s.marginRight = m; },
    'margin-y': (val, s) => { const m = resolveSpacing(val); s.marginTop = m; s.marginBottom = m; },
    'margin-top': (val, s) => { s.marginTop = resolveSpacing(val); },
    'margin-bottom': (val, s) => { s.marginBottom = resolveSpacing(val); },
    'margin-left': (val, s) => { s.marginLeft = resolveSpacing(val); },
    'margin-right': (val, s) => { s.marginRight = resolveSpacing(val); },
    'position': (val, s) => { s.position = val; },
    'anchor': (val, s) => {
        if (val === 'top-left') { s.top = '0'; s.left = '0'; }
        else if (val === 'top-right') { s.top = '0'; s.right = '0'; }
        else if (val === 'bottom-left') { s.bottom = '0'; s.left = '0'; }
        else if (val === 'bottom-right') { s.bottom = '0'; s.right = '0'; }
    },
    'top': (val, s) => { s.top = resolveSpacing(val); },
    'bottom': (val, s) => { s.bottom = resolveSpacing(val); },
    'left': (val, s) => { s.left = resolveSpacing(val); },
    'right': (val, s) => { s.right = resolveSpacing(val); },
    'z-index': (val, s) => { s.zIndex = val; },
    'bg': (val, s) => { s.backgroundColor = resolveSodaColor(val); },
    'color': (val, s) => { s.color = resolveSodaColor(val); },
    'border': (val, s) => {
        const str = (val || '').trim();
        if (!str || str === 'none' || str === '0') {
            s.borderStyle = 'none';
        } else if (str === 'solid' || str === 'dashed' || str === 'dotted' || str === 'double') {
            s.borderStyle = str;
        } else if (SodaTheme.tokens.border[str]) {
            s.border = SodaTheme.tokens.border[str];
        } else {
            const parts = str.split(/\s+/);
            if (parts.length >= 3) {
                s.border = `${parts[0]} ${parts[1]} ${resolveSodaColor(parts.slice(2).join(' '))}`;
            } else if (parts.length === 2) {
                s.border = `${parts[0]} solid ${resolveSodaColor(parts[1])}`;
            } else {
                s.border = `1px solid ${resolveSodaColor(str)}`;
            }
        }
    },
    'border-style': (val, s) => { s.borderStyle = (val || '').trim() || 'none'; },
    'border-color': (val, s) => applyBorderSideColor(s, 'borderColor', 'borderStyle', 'borderWidth', val),
    'border-width': (val, s) => applyBorderSideWidth(s, 'borderWidth', 'borderStyle', val),
    'border-top': (val, s) => { s.borderTop = `1px solid ${resolveSodaColor(val)}`; },
    'border-bottom': (val, s) => { s.borderBottom = `1px solid ${resolveSodaColor(val)}`; },
    'border-left': (val, s) => { s.borderLeft = `1px solid ${resolveSodaColor(val)}`; },
    'border-right': (val, s) => { s.borderRight = `1px solid ${resolveSodaColor(val)}`; },
    'border-top-style': (val, s) => { s.borderTopStyle = (val || '').trim() || 'none'; },
    'border-bottom-style': (val, s) => { s.borderBottomStyle = (val || '').trim() || 'none'; },
    'border-left-style': (val, s) => { s.borderLeftStyle = (val || '').trim() || 'none'; },
    'border-right-style': (val, s) => { s.borderRightStyle = (val || '').trim() || 'none'; },
    'border-top-width': (val, s) => applyBorderSideWidth(s, 'borderTopWidth', 'borderTopStyle', val),
    'border-bottom-width': (val, s) => applyBorderSideWidth(s, 'borderBottomWidth', 'borderBottomStyle', val),
    'border-left-width': (val, s) => applyBorderSideWidth(s, 'borderLeftWidth', 'borderLeftStyle', val),
    'border-right-width': (val, s) => applyBorderSideWidth(s, 'borderRightWidth', 'borderRightStyle', val),
    'border-top-color': (val, s) => applyBorderSideColor(s, 'borderTopColor', 'borderTopStyle', 'borderTopWidth', val),
    'border-bottom-color': (val, s) => applyBorderSideColor(s, 'borderBottomColor', 'borderBottomStyle', 'borderBottomWidth', val),
    'border-left-color': (val, s) => applyBorderSideColor(s, 'borderLeftColor', 'borderLeftStyle', 'borderLeftWidth', val),
    'border-right-color': (val, s) => applyBorderSideColor(s, 'borderRightColor', 'borderRightStyle', 'borderRightWidth', val),
    'radius': (val, s) => { s.borderRadius = resolveRadius(val); },
    'radius-top-left': (val, s) => { s.borderTopLeftRadius = resolveRadius(val); },
    'radius-top-right': (val, s) => { s.borderTopRightRadius = resolveRadius(val); },
    'radius-bottom-left': (val, s) => { s.borderBottomLeftRadius = resolveRadius(val); },
    'radius-bottom-right': (val, s) => { s.borderBottomRightRadius = resolveRadius(val); },
    'shadow': (val, s) => { s.boxShadow = `var(--soda-shadow-${val}, ${val})`; },
    'box-shadow': (val, s) => { s.boxShadow = val; },
    'font': (val, s, el) => {
        if (!val) return;
        const key = String(val).trim();
        const fToken = SodaTheme.tokens.font[key] || SodaTheme.tokens.font[key.toLowerCase()];
        if (fToken) {
            if (fToken.fontSize && !el.hasAttribute('font-size')) s.fontSize = resolveFontSize(fToken.fontSize);
            if (fToken.fontFamily && !el.hasAttribute('font-family')) s.fontFamily = resolveFontFamily(fToken.fontFamily);
            if (fToken.fontWeight && !el.hasAttribute('font-weight')) s.fontWeight = resolveFontWeight(fToken.fontWeight);
            if (fToken.lineHeight && !el.hasAttribute('line-height')) s.lineHeight = fToken.lineHeight;
        } else if (!el.hasAttribute('font-size')) {
            s.fontSize = resolveFontSize(key);
        }
    },
    'font-size': (val, s) => { s.fontSize = resolveFontSize(val); },
    'font-weight': (val, s) => { s.fontWeight = resolveFontWeight(val); },
    'font-family': (val, s) => { s.fontFamily = resolveFontFamily(val); },
    'line-height': (val, s) => { s.lineHeight = val; },
    'opacity': (val, s) => { s.opacity = val; },
    'wrap': (val, s) => { s.flexWrap = val === 'true' ? 'wrap' : 'nowrap'; },
    'clip': (val, s) => { s.overflow = val === 'true' ? 'hidden' : ''; },
    'scroll': (val, s) => {
        if (val === 'vertical') s.overflowY = 'auto';
        else if (val === 'horizontal') s.overflowX = 'auto';
        else if (val === 'both' || val === 'true') s.overflow = 'auto';
    },
    'keep-together': (val, s) => {
        if (val === 'true') {
            s.breakInside = 'avoid';
            s.pageBreakInside = 'avoid';
        }
    },
    'cursor': (val, s) => { s.cursor = val; },
    'hover-bg': (val, s) => {
        if (val) s.setProperty('--soda-hover-bg', resolveSodaColor(val));
        else s.removeProperty('--soda-hover-bg');
    }
};

const RADIUS_ATTRS = new Set([
    'radius', 'radius-top-left', 'radius-top-right', 'radius-bottom-left', 'radius-bottom-right'
]);

const FULL_RESYNC_ATTRS = new Set([
    'visible', 'font', 'clip', 'scroll',
    'radius', 'radius-top-left', 'radius-top-right', 'radius-bottom-left', 'radius-bottom-right'
]);

function isEffectiveRadiusValue(val) {
    if (!val) return false;
    const v = val.trim().toLowerCase();
    return v !== '' && v !== 'none' && v !== '0' && v !== '0px';
}

function applySodaStyles(element) {
    if (!element || !element.style) return;
    const s = element.style;

    // Control de visibilidad
    const visAttr = element.getAttribute('visible');
    if (visAttr === 'false') {
        s.display = 'none';
        return;
    }
    if (visAttr !== null && s.display === 'none') {
        s.display = '';
    }

    // Recorrido directo sin alocar array de getAttributeNames()
    const attrs = element.attributes;
    let hasEffectiveRadius = false;
    let hasScroll = false;
    let clipExplicitFalse = false;

    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        const name = attr.name;
        const val = attr.value;
        if (name === 'scroll') hasScroll = true;
        else if (name === 'clip' && val === 'false') clipExplicitFalse = true;
        else if (!hasEffectiveRadius && RADIUS_ATTRS.has(name) && isEffectiveRadiusValue(val)) {
            hasEffectiveRadius = true;
        }
        const handler = SODA_STYLE_HANDLERS[name];
        if (handler) {
            handler(val, s, element);
        }
    }

    if (hasEffectiveRadius && !clipExplicitFalse && !hasScroll && !s.overflow) {
        s.overflow = 'hidden';
    }

    if (typeof element._syncPrimitive === 'function') {
        element._syncPrimitive();
    }
}

function applySodaAttr(element, name, val) {
    if (!element || !element.style) return;
    if (val === null || FULL_RESYNC_ATTRS.has(name)) {
        applySodaStyles(element);
        return;
    }
    const handler = SODA_STYLE_HANDLERS[name];
    if (handler) {
        handler(val, element.style, element);
    }
}

// =============================================================================
// 4. CLASE BASE Y PRIMITIVAS CANÓNICAS SODA (WEB COMPONENTS)
// =============================================================================
const FRAME_OBSERVED_ATTRS = [
    'direction', 'align', 'justify', 'align-self', 'flex', 'weight',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'gap', 'padding', 'padding-x', 'padding-y', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'margin', 'margin-x', 'margin-y', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    'bg', 'color', 'radius', 'radius-top-left', 'radius-top-right', 'radius-bottom-left', 'radius-bottom-right',
    'border', 'border-style', 'border-width', 'border-color',
    'border-top', 'border-bottom', 'border-left', 'border-right',
    'border-top-style', 'border-bottom-style', 'border-left-style', 'border-right-style',
    'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
    'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
    'shadow', 'box-shadow', 'opacity', 'position', 'anchor', 'left', 'right', 'top', 'bottom', 'z-index',
    'wrap', 'clip', 'scroll', 'keep-together', 'cursor', 'hover-bg', 'visible'
];

class SodaPrimitiveElement extends HTMLElement {
    connectedCallback() {
        ensureSodaBaseStyles();
        this._onMount();
    }

    _onMount() {
        applySodaStyles(this);
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal || !this.isConnected || this._sodaBatching) return;
        this._onAttrChange(name, newVal);
    }

    _onAttrChange(name, newVal) {
        applySodaAttr(this, name, newVal);
    }
}

class UIFrame extends SodaPrimitiveElement {
    static get observedAttributes() { return FRAME_OBSERVED_ATTRS; }
}
if (!customElements.get('ui-frame')) customElements.define('ui-frame', UIFrame);
if (!customElements.get('ui-stack')) customElements.define('ui-stack', class extends UIFrame {});

class UIPage extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['size', 'orientation', ...FRAME_OBSERVED_ATTRS];
    }

    _onMount() {
        this._applyPageDefaults();
        applySodaStyles(this);
    }

    _onAttrChange(name, newVal) {
        if (name === 'size' || name === 'orientation') {
            this._applyPageDefaults();
            applySodaStyles(this);
        } else {
            applySodaAttr(this, name, newVal);
        }
    }

    _applyPageDefaults() {
        const size = (this.getAttribute('size') || 'letter').toLowerCase();
        const orientation = (this.getAttribute('orientation') || 'portrait').toLowerCase();
        const isLandscape = orientation === 'landscape' || orientation === 'horizontal';
        let w = 816, h = 1056;
        if (size === 'a4') { w = 794; h = 1123; }
        else if (size === 'legal') { w = 816; h = 1344; }
        if (isLandscape) { const t = w; w = h; h = t; }

        const s = this.style;
        if (!this.hasAttribute('width')) s.width = `${w}px`;
        if (!this.hasAttribute('min-height')) s.minHeight = `${h}px`;
        if (!this.hasAttribute('height')) s.height = `${h}px`;
        if (!this.hasAttribute('bg')) s.backgroundColor = '#ffffff';
        if (!this.hasAttribute('shadow') && !s.boxShadow) s.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.45)';
        if (!this.hasAttribute('direction')) s.flexDirection = 'column';
    }
}
if (!customElements.get('ui-page')) customElements.define('ui-page', UIPage);

const TEXT_LAYOUT_ATTRS = new Set(['align', 'multiline', 'max-lines', 'wrap', 'visible', 'size', 'weight']);

class UIText extends SodaPrimitiveElement {
    static get observedAttributes() {
        return [
            'text', 'align', 'color', 'font', 'font-size', 'font-weight', 'font-family',
            'size', 'weight', 'multiline', 'line-height', 'max-lines', 'wrap', 'width', 'height', 'opacity', 'visible'
        ];
    }

    _onMount() {
        applySodaStyles(this);
        this.textContent = this.getAttribute('text') || '';
    }

    _onAttrChange(name, newVal) {
        if (name === 'text') {
            this.textContent = newVal || '';
            return;
        }
        if (TEXT_LAYOUT_ATTRS.has(name)) {
            applySodaStyles(this);
        } else {
            applySodaAttr(this, name, newVal);
        }
    }

    _syncPrimitive() {
        const s = this.style;
        if (this.getAttribute('visible') === 'false') return;

        // Soporte limpio para alias cortos (size / weight)
        if (!this.hasAttribute('font-size') && this.hasAttribute('size')) {
            s.fontSize = resolveFontSize(this.getAttribute('size'));
        }
        if (!this.hasAttribute('font-weight') && this.hasAttribute('weight')) {
            s.fontWeight = resolveFontWeight(this.getAttribute('weight'));
        }

        const maxLines = parseInt(this.getAttribute('max-lines'), 10) || 0;
        const isMultiline = maxLines > 0 || this.getAttribute('multiline') === 'true' || this.getAttribute('wrap') === 'true';

        if (maxLines > 0) {
            s.display = '-webkit-box';
            s.webkitBoxOrient = 'vertical';
            s.webkitLineClamp = String(maxLines);
            s.overflow = 'hidden';
            s.whiteSpace = 'pre-wrap';
            s.wordBreak = 'break-word';
            s.overflowWrap = 'anywhere';
        } else if (isMultiline) {
            s.display = 'block';
            s.webkitLineClamp = '';
            s.webkitBoxOrient = '';
            s.whiteSpace = 'pre-wrap';
            s.wordBreak = 'break-word';
            s.overflowWrap = 'anywhere';
        } else {
            s.display = 'inline-flex';
            s.webkitLineClamp = '';
            s.webkitBoxOrient = '';
            s.whiteSpace = '';
            s.wordBreak = '';
        }

        // Alineación textual en un solo punto (sin duplicación en applySodaStyles)
        const rawAlign = (this.getAttribute('align') || '').toLowerCase();
        if (rawAlign) {
            if (rawAlign.startsWith('top')) s.alignItems = 'flex-start';
            else if (rawAlign.startsWith('bottom')) s.alignItems = 'flex-end';
            else s.alignItems = 'center';

            if (rawAlign.endsWith('center') || rawAlign === 'center' || rawAlign === 'middle') {
                s.justifyContent = 'center';
                s.textAlign = 'center';
            } else if (rawAlign.endsWith('right') || rawAlign === 'right' || rawAlign === 'end') {
                s.justifyContent = 'flex-end';
                s.textAlign = 'right';
            } else {
                s.justifyContent = 'flex-start';
                s.textAlign = 'left';
            }
        } else {
            s.alignItems = 'center';
            s.justifyContent = 'flex-start';
            s.textAlign = 'left';
        }
    }
}
if (!customElements.get('ui-text')) customElements.define('ui-text', UIText);

class UIRichText extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['align', 'color', 'font', 'font-size', 'font-weight', 'font-family', 'line-height', 'width', 'padding', 'bg', 'visible'];
    }

    _onMount() {
        let node = this.firstChild;
        while (node) {
            const next = node.nextSibling;
            if (node.nodeType === 3 && !/\S/.test(node.nodeValue || '')) {
                this.removeChild(node);
            }
            node = next;
        }
        applySodaStyles(this);
    }

    _syncPrimitive() {
        const align = (this.getAttribute('align') || '').toLowerCase();
        if (align === 'center' || align === 'right' || align === 'left' || align === 'justify') {
            this.style.textAlign = align;
        }
    }
}
if (!customElements.get('ui-rich-text')) customElements.define('ui-rich-text', UIRichText);

class UISpan extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['text', 'bold', 'italic', 'underline', 'strike', 'color', 'bg', 'font-size', 'font-family', 'font-weight'];
    }

    _onMount() {
        applySodaStyles(this);
        this.textContent = this.getAttribute('text') || '';
    }

    _onAttrChange(name, newVal) {
        if (name === 'text') {
            this.textContent = newVal || '';
            return;
        }
        applySodaStyles(this);
    }

    _syncPrimitive() {
        const s = this.style;
        s.fontWeight = this.getAttribute('bold') === 'true' ? '700' : (resolveFontWeight(this.getAttribute('font-weight')) || '');
        s.fontStyle = this.getAttribute('italic') === 'true' ? 'italic' : '';
        const ul = (this.getAttribute('underline') || '').toLowerCase();
        const isStrike = this.getAttribute('strike') === 'true';
        const lines = [];
        if (ul && ul !== 'none' && ul !== 'false') lines.push('underline');
        if (isStrike) lines.push('line-through');
        s.textDecorationLine = lines.join(' ');
        s.textDecorationStyle = ul === 'double' ? 'double' : '';
        s.textDecorationThickness = ul === 'thick' ? '2px' : '';
    }
}
if (!customElements.get('ui-span')) customElements.define('ui-span', UISpan);

class UIPageBreak extends SodaPrimitiveElement {}
if (!customElements.get('ui-page-break')) customElements.define('ui-page-break', UIPageBreak);

class UIReportBand extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['direction', 'align', 'justify', 'gap', 'padding', 'padding-x', 'padding-y', 'width', 'height', 'bg', 'border', 'visible'];
    }

    _onMount() {
        this.setAttribute('data-soda-band', this.tagName.toLowerCase());
        applySodaStyles(this);
    }
}
['report-header', 'page-header', 'report-detail', 'page-footer', 'report-footer'].forEach(tag => {
    if (!customElements.get(tag)) customElements.define(tag, class extends UIReportBand {});
});

class UIRect extends SodaPrimitiveElement {
    static get observedAttributes() { return ['width', 'height', 'bg', 'radius', 'border', 'opacity', 'visible']; }
}
if (!customElements.get('ui-rect')) customElements.define('ui-rect', UIRect);

class UIEllipse extends SodaPrimitiveElement {
    static get observedAttributes() { return ['width', 'height', 'bg', 'border', 'opacity', 'visible']; }
}
if (!customElements.get('ui-ellipse')) customElements.define('ui-ellipse', UIEllipse);

class UILine extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['direction', 'thickness', 'color', 'width', 'height', 'angle', 'opacity', 'visible'];
    }

    _onAttrChange() {
        applySodaStyles(this);
    }

    _syncPrimitive() {
        if (this.getAttribute('visible') === 'false') return;
        const s = this.style;
        const dir = (this.getAttribute('direction') || 'horizontal').toLowerCase();
        const rawThickness = (this.getAttribute('thickness') || '1px').trim();
        const thickness = BARE_NUMBER_RE.test(rawThickness) ? `${rawThickness}px` : resolveDimension(rawThickness);
        const pDir = (this.parentElement && this.parentElement.getAttribute('direction') || 'vertical').toLowerCase();
        s.backgroundColor = resolveSodaColor(this.getAttribute('color') || 'border-default');

        if (dir === 'vertical') {
            s.minHeight = '';
            s.maxHeight = '';
            s.width = s.minWidth = s.maxWidth = thickness;
            const hAttr = (this.getAttribute('height') || 'fill').toLowerCase();
            if (hAttr === 'fill') {
                if (pDir === 'vertical' || pDir === 'column') {
                    s.height = '100%';
                    s.flex = '1 1 0%';
                } else {
                    s.height = 'auto';
                    s.flex = '0 0 auto';
                    s.alignSelf = 'stretch';
                }
            } else {
                s.flex = '0 0 auto';
            }
        } else {
            s.minWidth = '';
            s.maxWidth = '';
            s.height = s.minHeight = s.maxHeight = thickness;
            const wAttr = (this.getAttribute('width') || 'fill').toLowerCase();
            if (wAttr === 'fill') {
                if (pDir === 'horizontal' || pDir === 'row') {
                    s.width = '100%';
                    s.flex = '1 1 0%';
                } else {
                    s.width = 'auto';
                    s.flex = '0 0 auto';
                    s.alignSelf = 'stretch';
                }
            } else {
                s.flex = '0 0 auto';
            }
        }

        const rawAngle = (this.getAttribute('angle') || '').trim();
        if (rawAngle && rawAngle !== '0' && rawAngle !== '0deg') {
            s.transform = `rotate(${rawAngle.endsWith('deg') ? rawAngle : rawAngle + 'deg'})`;
            s.transformOrigin = 'center center';
        } else {
            s.transform = '';
        }
    }
}
if (!customElements.get('ui-line')) customElements.define('ui-line', UILine);

class UIPath extends SodaPrimitiveElement {
    static get observedAttributes() { return ['width', 'height', 'color', 'opacity', 'visible']; }
}
if (!customElements.get('ui-path')) customElements.define('ui-path', UIPath);

class UIIcon extends SodaPrimitiveElement {
    static iconDefs = {};

    static registerIcons(iconsList) {
        if (!Array.isArray(iconsList)) return;
        for (let i = 0; i < iconsList.length; i++) {
            const ic = iconsList[i];
            if (!ic || !ic.name) continue;
            UIIcon.iconDefs[ic.name] = {
                name: ic.name,
                glyph: ic.glyph || '',
                category: ic.category || 'general',
                description: ic.description || '',
                svg: ic.svg || '',
                viewBox: ic.viewBox || '0 0 24 24'
            };
        }
    }

    static parseIconDefs(docOrRoot) {
        if (!docOrRoot) return;
        const root = (docOrRoot.tagName && docOrRoot.tagName.toLowerCase() === 'icon-defs')
            ? docOrRoot
            : docOrRoot.querySelector('icon-defs');
        if (!root) return;

        const list = [];
        const ser = typeof XMLSerializer !== 'undefined' ? new XMLSerializer() : null;
        walkElements(root, (el) => {
            if (el.tagName.toLowerCase() !== 'icon') return true;
            const name = el.getAttribute('name');
            if (!name) return false;
            const svgEl = el.querySelector('svg');
            let svgInner = '';
            let viewBox = el.getAttribute('viewBox') || '0 0 24 24';
            if (svgEl) {
                viewBox = svgEl.getAttribute('viewBox') || viewBox;
                svgInner = svgEl.innerHTML ? svgEl.innerHTML.trim() : '';
            } else if (el.firstElementChild) {
                // Soporta <icon name="plus"><path d="..." /></icon> directamente
                let child = el.firstElementChild;
                while (child) {
                    svgInner += ser ? ser.serializeToString(child) : (child.outerHTML || '');
                    child = child.nextElementSibling;
                }
            }
            list.push({
                name,
                glyph: el.getAttribute('glyph') || '',
                category: el.getAttribute('category') || 'general',
                description: el.getAttribute('description') || '',
                svg: svgInner,
                viewBox
            });
            return false;
        });
        UIIcon.registerIcons(list);
    }

    static get observedAttributes() {
        return ['name', 'color', 'size', 'opacity', 'visible'];
    }

    _onMount() {
        this._renderedIconName = null;
        this.renderIcon(true);
    }

    _onAttrChange(name) {
        if (name === 'name') {
            this.renderIcon(true);
        } else {
            this.renderIcon(false);
        }
    }

    renderIcon(forceMarkup = true) {
        applySodaStyles(this);
        if (this.getAttribute('visible') === 'false') return;

        const name = this.getAttribute('name') || '';
        const color = this.getAttribute('color') || 'text-primary';
        const size = (this.getAttribute('size') || '16px').trim();
        let pxSz = size;
        if (BARE_NUMBER_RE.test(size)) {
            pxSz = `${size}px`;
        } else if (!UNIT_RE.test(size)) {
            pxSz = SodaTheme.tokens.fontSize[size] || SodaTheme.tokens.dimension[size] || `var(--soda-font-size-${size}, var(--soda-dim-${size}, 16px))`;
        }

        const s = this.style;
        s.width = pxSz;
        s.height = pxSz;
        s.color = resolveSodaColor(color);

        if (!forceMarkup && this._renderedIconName === name && this.firstElementChild) {
            if (this.firstElementChild.tagName === 'SPAN') {
                this.firstElementChild.style.fontSize = pxSz;
            }
            return;
        }
        this._renderedIconName = name;

        const def = name ? UIIcon.iconDefs[name] : null;
        if (def && def.svg) {
            const vb = def.viewBox || '0 0 24 24';
            this.innerHTML = `<svg viewBox="${vb}" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;">${def.svg}</svg>`;
        } else if (def && def.glyph) {
            this.innerHTML = `<span style="font-size:${pxSz};line-height:1;display:inline-flex;align-items:center;justify-content:center;pointer-events:none;">${def.glyph}</span>`;
        } else {
            this.innerHTML = '';
        }
    }
}
if (!customElements.get('ui-icon')) customElements.define('ui-icon', UIIcon);

class UISlot extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['content', 'color', 'size', 'visible'];
    }

    _onMount() {
        this.renderSlot();
    }

    _onAttrChange() {
        this.renderSlot();
    }

    renderSlot() {
        applySodaStyles(this);
        const contentVal = (this.getAttribute('content') || '').trim();
        if (!contentVal) return;

        if (UIIcon.iconDefs[contentVal]) {
            const slotColor = this.getAttribute('color');
            const slotSize = this.getAttribute('size');
            const colorAttr = slotColor ? ` color="${escapeAttr(slotColor)}"` : '';
            const sizeAttr = slotSize ? ` size="${escapeAttr(slotSize)}"` : '';
            this.innerHTML = `<ui-icon name="${escapeAttr(contentVal)}"${colorAttr}${sizeAttr}></ui-icon>`;
            return;
        }

        const tag = contentVal.toLowerCase();
        if (SodaRegistry.has(tag)) {
            const childEl = document.createElement(tag);
            const targetDef = SodaRegistry.get(tag);
            const propKeyByLower = targetDef ? targetDef._propKeyByLower : null;

            let host = this.parentElement;
            while (host && !(host instanceof SodaComponent)) {
                host = host.parentElement;
            }
            if (host) {
                const slotProp = (this.getAttribute('data-slot-prop') || '').toLowerCase();
                const prefix = slotProp ? `${slotProp}.` : '';
                const hostAttrs = host.attributes;
                for (let i = 0; i < hostAttrs.length; i++) {
                    const attr = hostAttrs[i];
                    const lower = attr.name.toLowerCase();
                    if (propKeyByLower && propKeyByLower[lower]) {
                        childEl.setAttribute(propKeyByLower[lower], attr.value);
                    }
                    if (prefix && lower.startsWith(prefix)) {
                        const subName = attr.name.slice(prefix.length);
                        if (subName) childEl.setAttribute(subName, attr.value);
                    }
                }
            }
            this.replaceChildren(childEl);
        }
    }
}
if (!customElements.get('ui-slot')) customElements.define('ui-slot', UISlot);

class UIRepeat extends SodaPrimitiveElement {
    static get observedAttributes() {
        return ['items', 'as', 'alt-bg', 'display-member', 'selected-id'];
    }

    _onMount() {
        if (!this._normalizedTemplate) {
            this._normalizedTemplate = normalizeCustomTags(this.innerHTML);
        }
        this.render();
    }

    _onAttrChange() {
        this.render();
    }

    render() {
        const tpl = this._normalizedTemplate;
        if (!tpl) return;

        const itemsRaw = (this.getAttribute('items') || '').trim();
        const asVar = this.getAttribute('as') || 'item';
        const isEditorCanvas = (typeof window !== 'undefined' && !!window.SodaStudioBridge && !window.SodaStudioBridge._isJourneySimulatorActive);

        let itemsArray = null;
        if (itemsRaw.startsWith('${mocks.') && itemsRaw.endsWith('}')) {
            const mockData = SodaRegistry.getMock(itemsRaw.slice(8, -1).trim());
            if (Array.isArray(mockData)) itemsArray = mockData;
        }

        if (!itemsArray) {
            if (!itemsRaw || itemsRaw.startsWith('${')) {
                if (this.innerHTML !== tpl) this.innerHTML = tpl;
                return;
            }
            try {
                itemsArray = JSON.parse(itemsRaw);
            } catch (e) {
                if (isEditorCanvas && this.innerHTML !== tpl) this.innerHTML = tpl;
                return;
            }
        }
        if (!Array.isArray(itemsArray)) return;
        if (itemsArray.length === 0 && isEditorCanvas) {
            if (this.innerHTML !== tpl) this.innerHTML = tpl;
            return;
        }

        const selHost = this.closest ? this.closest('[selected-id]') : null;
        const selId = this.getAttribute('selected-id') || (selHost ? selHost.getAttribute('selected-id') : '');
        const altBg = (this.getAttribute('alt-bg') || '').trim();
        const cleanAltBg = altBg ? escapeAttr(altBg) : '';
        const displayMember = (this.getAttribute('display-member') || '').trim();
        const displayMemberLower = displayMember.toLowerCase();
        const asPrefix = `${asVar}.`;

        const parts = new Array(itemsArray.length);
        for (let idx = 0; idx < itemsArray.length; idx++) {
            const item = itemsArray[idx];
            const isObj = typeof item === 'object' && item !== null;

            // Mapa de claves insensible a mayúsculas solo si el ítem es objeto
            let lowerMap = null;
            let displayStr = '';
            if (isObj) {
                lowerMap = Object.create(null);
                for (const k in item) {
                    lowerMap[k.toLowerCase()] = item[k];
                }
                let displayRaw = displayMember
                    ? (item[displayMember] !== undefined ? item[displayMember] : lowerMap[displayMemberLower])
                    : undefined;
                if (displayRaw === undefined) {
                    displayRaw = item.nombre ?? item.label ?? item.titulo ?? item.text ?? '';
                }
                displayStr = (displayRaw !== undefined && displayRaw !== null) ? escapeAttr(displayRaw) : '';
            } else {
                displayStr = (item !== undefined && item !== null) ? escapeAttr(item) : '';
            }

            // Interpolación en una sola pasada regex por ítem
            let rowHtml = tpl.replace(TEMPLATE_VAR_RE, (full, rawKey) => {
                const key = rawKey.trim();
                if (key === 'index') return String(idx);
                if (key === 'even') return idx % 2 === 1 ? 'true' : 'false';
                if (key === 'odd') return idx % 2 === 0 ? 'true' : 'false';
                if (key === asVar) return displayStr;
                if (key.startsWith(asPrefix)) {
                    const prop = key.slice(asPrefix.length);
                    if (prop === '_display') return displayStr;
                    if (isObj) {
                        const val = item[prop] !== undefined ? item[prop] : lowerMap[prop.toLowerCase()];
                        return (val !== undefined && val !== null) ? escapeAttr(val) : '';
                    }
                    return '';
                }
                return full;
            });

            if (isObj && selId) {
                const isSelected = item.id === selId || item.active === true || item.active === 'true';
                if (!isSelected) {
                    rowHtml = rowHtml.replace(/<ui-icon\s+name="check"/g, '<ui-icon name="check" visible="false"');
                }
            }

            if (cleanAltBg && idx % 2 === 1) {
                rowHtml = rowHtml.replace(/^(\s*<[a-zA-Z0-9_-]+)([^>]*)(>)/, (m, tag, attrs, close) => {
                    const nextAttrs = /\bbg\s*=/.test(attrs)
                        ? attrs.replace(/\bbg\s*=\s*"[^"]*"/, `bg="${cleanAltBg}"`)
                        : `${attrs} bg="${cleanAltBg}"`;
                    return `${tag}${nextAttrs}${close}`;
                });
            }

            parts[idx] = rowHtml;
        }

        this.innerHTML = parts.join('');
    }
}
if (!customElements.get('ui-repeat')) customElements.define('ui-repeat', UIRepeat);

class UIChart extends SodaPrimitiveElement {
    static _editorPlaceholderItems = [
        { x: '', y: 25, label: '' },
        { x: '', y: 65, label: '' },
        { x: '', y: 40, label: '' },
        { x: '', y: 85, label: '' }
    ];

    static get observedAttributes() {
        return [
            'type', 'items', 'x-field', 'y-field', 'label-field',
            'stroke-color', 'fill-color', 'point-border', 'negative-color',
            'grid-color', 'axis-color', 'zero-line', 'zero-line-color', 'zero-label',
            'grid-lines', 'stroke-width', 'point-radius', 'interactive', 'event-name',
            'width', 'height', 'bg', 'border', 'radius', 'visible'
        ];
    }

    constructor() {
        super();
        this._gradId = `soda-chart-grad-${Math.random().toString(36).slice(2, 10)}`;
        this._pinnedIndex = null;
        this._measuredW = 0;
        this._measuredH = 0;
        this._lastSignature = '';
        this._rafPending = false;
    }

    _onMount() {
        if (!this.hasAttribute('width')) this.style.width = '100%';
        if (!this.hasAttribute('height')) this.style.height = '100%';
        applySodaStyles(this);

        if (!this._resizeObserver && typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver((entries) => {
                const rect = entries && entries[0] ? entries[0].contentRect : null;
                if (rect) {
                    this._measuredW = Math.round(rect.width);
                    this._measuredH = Math.round(rect.height);
                }
                if (this.isConnected) this._scheduleRender();
            });
            this._resizeObserver.observe(this);
        }
        this._scheduleRender();
    }

    disconnectedCallback() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    _onAttrChange(name, newVal) {
        applySodaAttr(this, name, newVal);
        this._lastSignature = '';
        this._scheduleRender();
    }

    _scheduleRender() {
        if (this._rafPending) return;
        this._rafPending = true;
        const run = () => {
            this._rafPending = false;
            if (this.isConnected) this.renderChart();
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
    }

    _resolveItems() {
        const raw = (this.getAttribute('items') || '').trim();
        if (raw.startsWith('${mocks.') && raw.endsWith('}')) {
            const mockData = SodaRegistry.getMock(raw.slice(8, -1).trim());
            if (Array.isArray(mockData) && mockData.length > 0) {
                return { items: mockData, isPlaceholder: false };
            }
        }
        if (raw && !raw.startsWith('${')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return { items: parsed, isPlaceholder: false };
                }
            } catch (e) {}
        }
        const isEditorCanvas = (typeof window !== 'undefined' && !!window.SodaStudioBridge && !window.SodaStudioBridge._isJourneySimulatorActive);
        if (isEditorCanvas) {
            return { items: UIChart._editorPlaceholderItems, isPlaceholder: true };
        }
        return { items: [], isPlaceholder: false };
    }

    _inferField(sampleObj, attrVal, fallbackKey, preferNumeric) {
        if (attrVal) return attrVal;
        if (!sampleObj || typeof sampleObj !== 'object') return fallbackKey;
        for (const k in sampleObj) {
            const v = sampleObj[k];
            const isNum = typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));
            if (preferNumeric && isNum) return k;
            if (!preferNumeric && !isNum) return k;
        }
        return Object.keys(sampleObj)[0] || fallbackKey;
    }

    renderChart() {
        if (!this.isConnected || this.getAttribute('visible') === 'false') return;

        const width = Math.max(this._measuredW || this.clientWidth || 0, 240);
        const height = Math.max(this._measuredH || this.clientHeight || 0, 140);
        const rawItems = this.getAttribute('items') || '';
        const sig = `${width}x${height}|${rawItems}|${this.getAttribute('type') || ''}|${this.getAttribute('stroke-color') || ''}|${this.getAttribute('fill-color') || ''}|${this.getAttribute('zero-line-color') || ''}`;
        if (sig === this._lastSignature && this._svgEl) return;
        this._lastSignature = sig;

        const { items: puntos, isPlaceholder } = this._resolveItems();
        const firstItem = puntos[0] || null;

        const chartType = (this.getAttribute('type') || 'area-line').toLowerCase();
        const xField = isPlaceholder ? 'x' : this._inferField(firstItem, this.getAttribute('x-field'), 'x', false);
        const yField = isPlaceholder ? 'y' : this._inferField(firstItem, this.getAttribute('y-field'), 'y', true);
        const labelField = isPlaceholder ? 'label' : (this.getAttribute('label-field') || yField);

        const strokeToken = this.getAttribute('stroke-color') || 'accent-primary';
        const strokeColor = resolveSodaColor(strokeToken);
        const fillColor = resolveSodaColor(this.getAttribute('fill-color') || strokeToken);
        const pointBorder = resolveSodaColor(this.getAttribute('point-border') || 'bg-surface');
        const negativeColor = resolveSodaColor(this.getAttribute('negative-color') || strokeToken);
        const gridColor = resolveSodaColor(this.getAttribute('grid-color') || 'border-subtle');
        const axisColor = resolveSodaColor(this.getAttribute('axis-color') || 'text-muted');
        const zeroLineColor = resolveSodaColor(this.getAttribute('zero-line-color') || 'border-strong');

        const showZeroLine = (this.getAttribute('zero-line') || 'true') !== 'false';
        const zeroLabel = this.getAttribute('zero-label') ?? '0';
        const gridLinesCount = Math.max(0, parseInt(this.getAttribute('grid-lines') || '2', 10) || 0);
        const strokeWidth = parseFloat(this.getAttribute('stroke-width') || '2.5') || 2.5;
        const pointRadius = parseFloat(this.getAttribute('point-radius') || '4.5') || 4.5;
        const activeRadius = pointRadius + 2;
        const interactive = !isPlaceholder && (this.getAttribute('interactive') || 'true') !== 'false';
        const eventName = (this.getAttribute('event-name') || 'point-selected').trim();

        let svg = this._svgEl;
        let tooltip = this._tooltipEl;
        if (!svg || !svg.isConnected) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'soda-ui-chart-svg');
            svg.style.cssText = 'width:100%;height:100%;display:block;overflow:visible;';
            this.appendChild(svg);
            this._svgEl = svg;
        }
        if (!tooltip || !tooltip.isConnected) {
            tooltip = document.createElement('div');
            tooltip.className = 'soda-ui-chart-tooltip';
            tooltip.style.cssText = 'position:absolute;background:var(--soda-color-bg-surface-elevated,var(--soda-color-bg-surface));color:var(--soda-color-text-primary);border:1px solid var(--soda-color-border-default);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;pointer-events:none;transform:translate(-50%,-125%);white-space:nowrap;opacity:0;transition:opacity 0.14s ease;z-index:20;';
            this.appendChild(tooltip);
            this._tooltipEl = tooltip;
        }

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const pad = { top: 22, right: 32, bottom: 30, left: 32 };
        const plotW = Math.max(width - pad.left - pad.right, 40);
        const plotH = Math.max(height - pad.top - pad.bottom, 40);

        let gridMarkup = '';
        for (let g = 0; g < gridLinesCount; g++) {
            const gy = pad.top + (plotH * g) / gridLinesCount;
            gridMarkup += `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" stroke="${gridColor}" stroke-opacity="0.7" stroke-width="1" />`;
        }

        if (!puntos.length) {
            const yZeroEmpty = pad.top + plotH;
            const zeroEmpty = showZeroLine
                ? `<line x1="${pad.left}" y1="${yZeroEmpty}" x2="${width - pad.right}" y2="${yZeroEmpty}" stroke="${zeroLineColor}" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="4,4" /><text x="${width - pad.right}" y="${yZeroEmpty - 5}" fill="${axisColor}" font-size="10" font-weight="600" text-anchor="end">${escapeHtml(zeroLabel)}</text>`
                : '';
            svg.innerHTML = `${gridMarkup}${zeroEmpty}`;
            tooltip.style.opacity = '0';
            return;
        }

        const readField = (obj, f) => obj && (obj[f] ?? obj[f.toLowerCase()]);
        let minVal = 0, maxVal = 0;
        const values = new Array(puntos.length);
        for (let i = 0; i < puntos.length; i++) {
            const v = Number(readField(puntos[i], yField)) || 0;
            values[i] = v;
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }
        const range = (maxVal - minVal) || 1;
        const yZero = pad.top + plotH * (maxVal / range);
        const denom = Math.max(puntos.length - 1, 1);

        const coords = new Array(puntos.length);
        let pathD = '';
        const axisFontSize = width < 420 ? 10 : 11.5;
        let pointsMarkup = '';

        for (let i = 0; i < puntos.length; i++) {
            const rawVal = values[i];
            const x = pad.left + (i / denom) * plotW;
            const y = pad.top + plotH * ((maxVal - rawVal) / range);
            const xLabel = String(readField(puntos[i], xField) ?? '');
            const displayLabel = String(readField(puntos[i], labelField) ?? rawVal);
            coords[i] = { index: i, x, y, xLabel, yVal: rawVal, displayLabel, raw: puntos[i] };
            pathD += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
            pointsMarkup += `<g class="soda-chart-point-group" data-index="${i}" style="cursor:${interactive ? 'pointer' : 'default'};">` +
                `<circle class="soda-chart-hit" cx="${x}" cy="${y}" r="14" fill="transparent" />` +
                `<circle class="soda-chart-dot" cx="${x}" cy="${y}" r="${pointRadius}" fill="${rawVal < 0 ? negativeColor : strokeColor}" stroke="${pointBorder}" stroke-width="2.2" />` +
                (xLabel ? `<text x="${x}" y="${height - 8}" fill="${axisColor}" font-size="${axisFontSize}" font-weight="500" text-anchor="middle">${escapeHtml(xLabel)}</text>` : '') +
                `</g>`;
        }

        const areaD = `${pathD} L ${coords[coords.length - 1].x} ${yZero} L ${coords[0].x} ${yZero} Z`;
        const zeroMarkup = showZeroLine
            ? `<line x1="${pad.left}" y1="${yZero}" x2="${width - pad.right}" y2="${yZero}" stroke="${zeroLineColor}" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="4,4" /><text x="${width - pad.right}" y="${yZero - 5}" fill="${axisColor}" font-size="10" font-weight="600" text-anchor="end">${escapeHtml(zeroLabel)}</text>`
            : '';
        const areaMarkup = chartType !== 'line' ? `<path d="${areaD}" fill="url(#${this._gradId})" />` : '';

        svg.innerHTML = `<defs><linearGradient id="${this._gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${fillColor}" stop-opacity="0.34" /><stop offset="100%" stop-color="${fillColor}" stop-opacity="0.0" /></linearGradient></defs>${gridMarkup}${zeroMarkup}${areaMarkup}<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />${pointsMarkup}`;

        if (!interactive) {
            tooltip.style.opacity = '0';
            return;
        }

        // Delegación única en el SVG en lugar de 2 listeners por punto
        let activeDot = null;
        const activateIndex = (idx, groupEl) => {
            const pt = coords[idx];
            if (!pt) return;
            if (activeDot) activeDot.setAttribute('r', String(pointRadius));
            activeDot = groupEl ? groupEl.querySelector('.soda-chart-dot') : null;
            if (activeDot) activeDot.setAttribute('r', String(activeRadius));

            const clampedX = Math.max(46, Math.min(width - 46, pt.x));
            const clampedY = Math.max(36, pt.y);
            const valColor = pt.yVal < 0 ? negativeColor : strokeColor;
            tooltip.style.left = `${clampedX}px`;
            tooltip.style.top = `${clampedY}px`;
            tooltip.style.borderColor = valColor;
            tooltip.innerHTML = `<span>${escapeHtml(pt.xLabel)}: </span><span style="color:${valColor}">${escapeHtml(pt.displayLabel)}</span>`;
            tooltip.style.opacity = '1';

            const detail = { index: pt.index, x: pt.xLabel, y: pt.yVal, label: pt.displayLabel, item: pt.raw };
            if (xField) detail[xField] = pt.xLabel;
            if (yField) detail[yField] = pt.yVal;
            if (labelField) detail[labelField] = pt.displayLabel;
            this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true, detail }));
        };

        svg.onmouseover = (e) => {
            const g = e.target && e.target.closest ? e.target.closest('.soda-chart-point-group') : null;
            if (!g) return;
            this._pinnedIndex = null;
            activateIndex(parseInt(g.getAttribute('data-index'), 10), g);
        };
        svg.onclick = (e) => {
            const g = e.target && e.target.closest ? e.target.closest('.soda-chart-point-group') : null;
            if (!g) return;
            const idx = parseInt(g.getAttribute('data-index'), 10);
            this._pinnedIndex = idx;
            activateIndex(idx, g);
        };
        svg.onmouseleave = () => {
            if (this._pinnedIndex === null) {
                if (activeDot) { activeDot.setAttribute('r', String(pointRadius)); activeDot = null; }
                tooltip.style.opacity = '0';
            }
        };
    }
}
if (!customElements.get('ui-chart')) customElements.define('ui-chart', UIChart);

// =============================================================================
// 3b. WIREFRAMES BÁSICOS INTEGRADOS EN RUNTIME (wf-*)
// =============================================================================
function resolveWfColor(val, fallbackCssVar) {
    if (!val) return fallbackCssVar;
    if (val === 'wf-bg' || val === 'wf-surface' || val === 'wf-stroke' || val === 'wf-text' || val === 'wf-muted') {
        return `var(--${val})`;
    }
    return resolveSodaColor(val);
}

function resolveWfRadius(val, fallbackCssVar) {
    if (!val) return fallbackCssVar;
    if (val === 'wf-xs' || val === 'wf-full') return `var(--${val})`;
    return resolveRadius(val);
}

function resolveWfSize(val, fallback) {
    if (!val) return fallback;
    if (val === 'fill') return '100%';
    if (val === 'hug') return 'auto';
    return resolveDimension(val);
}

class SodaWireframeElement extends SodaPrimitiveElement {
    _onMount() {
        this._renderWireframe();
        applySodaStyles(this);
    }

    _onAttrChange(name, newVal) {
        this._renderWireframe();
        applySodaAttr(this, name, newVal);
    }

    _renderWireframe() {}
}

class WFAvatar extends SodaWireframeElement {
    static get observedAttributes() { return ['size', 'bg', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const size = resolveWfSize(this.getAttribute('size'), '48px');
        const bg = resolveWfColor(this.getAttribute('bg'), 'var(--wf-surface)');
        this.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${size};height:${size};gap:3px;background:${bg};border:1.5px solid var(--wf-stroke);border-radius:var(--wf-full);overflow:hidden;">`
            + `<div style="width:32%;height:32%;background:var(--wf-bg);border:1.5px solid var(--wf-stroke);border-radius:50%;"></div>`
            + `<div style="width:52%;height:26%;background:var(--wf-bg);border:1.5px solid var(--wf-stroke);border-radius:var(--wf-full);"></div>`
            + `</div>`;
    }
}
if (!customElements.get('wf-avatar')) customElements.define('wf-avatar', WFAvatar);

class WFBox extends SodaWireframeElement {
    static get observedAttributes() { return ['width', 'height', 'label', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const w = resolveWfSize(this.getAttribute('width'), '160px');
        const h = resolveWfSize(this.getAttribute('height'), '100px');
        const label = this.getAttribute('label') || '';
        const esc = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const labelHtml = esc ? `<span style="position:relative;padding:0 var(--wf-sm);background:var(--wf-bg);color:var(--wf-text);font-family:var(--wf-sans);font-size:12px;">${esc}</span>` : '';
        this.innerHTML = `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:${w};height:${h};overflow:hidden;background:var(--wf-bg);border:1.5px solid var(--wf-stroke);border-radius:var(--wf-xs);">`
            + `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;">`
            + `<line x1="0" y1="0" x2="100" y2="100" stroke="var(--wf-stroke)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`
            + `<line x1="100" y1="0" x2="0" y2="100" stroke="var(--wf-stroke)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`
            + `</svg>${labelHtml}</div>`;
    }
}
if (!customElements.get('wf-box')) customElements.define('wf-box', WFBox);

class WFButton extends SodaWireframeElement {
    static get observedAttributes() { return ['text', 'width', 'height', 'radius', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const text = (this.getAttribute('text') ?? 'Acción').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const w = resolveWfSize(this.getAttribute('width'), 'auto');
        const h = resolveWfSize(this.getAttribute('height'), '34px');
        const r = resolveWfRadius(this.getAttribute('radius'), 'var(--wf-xs)');
        this.innerHTML = `<div style="display:inline-flex;align-items:center;justify-content:center;width:${w};height:${h};padding:0 var(--wf-md);background:var(--wf-surface);border:1.5px solid var(--wf-stroke);border-radius:${r};color:var(--wf-text);font-family:var(--wf-sans);font-size:13px;font-weight:500;white-space:nowrap;">${text}</div>`;
    }
}
if (!customElements.get('wf-button')) customElements.define('wf-button', WFButton);

class WFImage extends SodaWireframeElement {
    static get observedAttributes() { return ['width', 'height', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const w = resolveWfSize(this.getAttribute('width'), '220px');
        const h = resolveWfSize(this.getAttribute('height'), '130px');
        this.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:${w};height:${h};background:var(--wf-surface);border:1.5px solid var(--wf-stroke);border-radius:var(--wf-xs);">`
            + `<svg width="48" height="36" viewBox="0 0 48 36" fill="none">`
            + `<circle cx="16.5" cy="7.5" r="4.5" stroke="var(--wf-stroke)" stroke-width="1.5"/>`
            + `<polyline points="4,31 16,13 26,25 32,18 44,31" stroke="var(--wf-stroke)" stroke-width="1.5" stroke-linejoin="round"/>`
            + `<line x1="4" y1="31" x2="44" y2="31" stroke="var(--wf-stroke)" stroke-width="1.5"/>`
            + `</svg></div>`;
    }
}
if (!customElements.get('wf-image')) customElements.define('wf-image', WFImage);

class WFInput extends SodaWireframeElement {
    static get observedAttributes() { return ['label', 'placeholder', 'width', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const label = (this.getAttribute('label') ?? 'Etiqueta').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const placeholder = (this.getAttribute('placeholder') ?? 'Escribir...').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const w = resolveWfSize(this.getAttribute('width'), '100%');
        this.style.width = w;
        this.innerHTML = `<div style="display:flex;flex-direction:column;width:100%;gap:var(--wf-sm);font-family:var(--wf-sans);">`
            + (label ? `<span style="color:var(--wf-text);font-size:12px;">${label}</span>` : '')
            + `<div style="display:flex;align-items:center;width:100%;height:34px;padding:0 var(--wf-sm);background:var(--wf-bg);border:1.5px solid var(--wf-stroke);border-radius:var(--wf-xs);color:var(--wf-stroke);font-size:12px;">${placeholder}</div>`
            + `</div>`;
    }
}
if (!customElements.get('wf-input')) customElements.define('wf-input', WFInput);

class WFSwitchField extends SodaWireframeElement {
    static get observedAttributes() { return ['width', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const w = resolveWfSize(this.getAttribute('width'), '100%');
        this.style.width = w;
        this.innerHTML = `<div style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;width:100%;gap:var(--wf-md);">`
            + `<div style="display:flex;flex-direction:column;flex:1;gap:6px;">`
            + `<div style="width:85%;height:10px;background:var(--wf-stroke);border-radius:var(--wf-full);"></div>`
            + `<div style="width:60%;height:10px;background:var(--wf-muted);border-radius:var(--wf-full);"></div>`
            + `</div>`
            + `<div style="display:flex;align-items:center;justify-content:flex-end;width:44px;height:24px;padding:3px;background:var(--wf-surface);border:1.5px solid var(--wf-stroke);border-radius:var(--wf-full);flex-shrink:0;">`
            + `<div style="width:16px;height:16px;background:var(--wf-text);border-radius:50%;"></div>`
            + `</div></div>`;
    }
}
if (!customElements.get('wf-switch-field')) customElements.define('wf-switch-field', WFSwitchField);

class WFSearchBox extends SodaWireframeElement {
    static get observedAttributes() { return ['placeholder', 'width', 'radius', ...FRAME_OBSERVED_ATTRS]; }
    _renderWireframe() {
        const placeholder = (this.getAttribute('placeholder') ?? 'Buscar...').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const w = resolveWfSize(this.getAttribute('width'), '100%');
        const r = resolveWfRadius(this.getAttribute('radius'), 'var(--wf-xs)');
        this.style.width = w;
        this.innerHTML = `<div style="display:flex;flex-direction:row;align-items:center;width:100%;height:34px;padding:0 var(--wf-sm);gap:var(--wf-sm);background:var(--wf-bg);border:1.5px solid var(--wf-stroke);border-radius:${r};font-family:var(--wf-sans);">`
            + `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">`
            + `<circle cx="10.5" cy="10.5" r="6.5" stroke="var(--wf-stroke)" stroke-width="1.8"/>`
            + `<line x1="15.2" y1="15.2" x2="20.5" y2="20.5" stroke="var(--wf-stroke)" stroke-width="1.8" stroke-linecap="round"/>`
            + `</svg>`
            + `<span style="color:var(--wf-stroke);font-size:12px;">${placeholder}</span>`
            + `</div>`;
    }
}
if (!customElements.get('wf-search-box')) customElements.define('wf-search-box', WFSearchBox);

// =============================================================================
// 5. MOTOR DE ESTADOS COMPILADO (SodaStateEngine — AST + PODA + BATCHING)
// =============================================================================
class SodaStateEngine {
    static _compiledXmlCache = new Map();
    static _responsiveInstances = new Set();
    static _resizeListenerAttached = false;
    static _resizeRafPending = false;
    static _viewportCache = { width: 0, height: 0, bp: 'desktop', orient: 'landscape', valid: false };

    static _refreshViewportCache() {
        if (typeof window === 'undefined') return this._viewportCache;
        const canvasRoot = typeof document !== 'undefined' ? document.getElementById('soda-canvas-root') : null;
        const w = (canvasRoot && canvasRoot.offsetWidth > 0) ? canvasRoot.offsetWidth : (window.innerWidth || 1280);
        const h = (canvasRoot && canvasRoot.offsetHeight > 0) ? canvasRoot.offsetHeight : (window.innerHeight || 800);
        const bp = w < 768 ? 'mobile' : (w <= 1024 ? 'tablet' : 'desktop');
        const orient = w > h ? 'landscape' : 'portrait';
        this._viewportCache = { width: w, height: h, bp, orient, valid: true };
        return this._viewportCache;
    }

    static invalidateViewportCache() {
        this._viewportCache.valid = false;
    }

    static registerResponsiveComponent(el) {
        if (!el) return;
        this._responsiveInstances.add(el);
        if (!this._resizeListenerAttached && typeof window !== 'undefined') {
            this._resizeListenerAttached = true;
            window.addEventListener('resize', () => {
                if (this._resizeRafPending) return;
                this._resizeRafPending = true;
                requestAnimationFrame(() => {
                    this._resizeRafPending = false;
                    this._refreshViewportCache();
                    for (const inst of this._responsiveInstances) {
                        if (!inst.isConnected) {
                            this._responsiveInstances.delete(inst);
                            continue;
                        }
                        const def = SodaRegistry.get(inst.tagName.toLowerCase());
                        if (def && def._compiledStates) {
                            this.evaluateCompiled(inst, def._compiledStates, inst._lastPropsData || {});
                        }
                    }
                });
            }, { passive: true });
        }
    }

    static unregisterResponsiveComponent(el) {
        if (el) this._responsiveInstances.delete(el);
    }

    /** Compila un nodo XML <states> a un AST liviano de objetos JS (una sola vez). */
    static compile(statesNode) {
        if (!statesNode) return null;
        let hasResponsive = false;
        const compileWhen = (whenNode) => {
            const bp = whenNode.getAttribute('breakpoint');
            const orient = whenNode.getAttribute('orientation');
            const minWAttr = whenNode.getAttribute('min-width');
            const maxWAttr = whenNode.getAttribute('max-width');
            const hasResp = !!(bp || orient || minWAttr || maxWAttr);
            if (hasResp) hasResponsive = true;

            const rule = {
                hasResp,
                bp: bp ? bp.toLowerCase() : null,
                orient: orient ? orient.toLowerCase() : null,
                minW: minWAttr !== null ? parseFloat(minWAttr) : null,
                maxW: maxWAttr !== null ? parseFloat(maxWAttr) : null,
                prop: whenNode.getAttribute('prop') || null,
                propLower: whenNode.getAttribute('prop') ? whenNode.getAttribute('prop').toLowerCase() : null,
                is: whenNode.hasAttribute('is') ? whenNode.getAttribute('is') : null,
                empty: whenNode.hasAttribute('empty') ? (whenNode.getAttribute('empty') === 'true') : null,
                notEmpty: whenNode.hasAttribute('not-empty') ? (whenNode.getAttribute('not-empty') === 'true') : null,
                sets: [],
                nested: []
            };

            let child = whenNode.firstElementChild;
            while (child) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'set') {
                    const target = child.getAttribute('target') || '';
                    const attrs = [];
                    const rawAttrs = child.attributes;
                    let visible = null, text = null, bindText = null;
                    for (let i = 0; i < rawAttrs.length; i++) {
                        const a = rawAttrs[i];
                        if (a.name === 'target') continue;
                        if (a.name === 'visible') visible = a.value === 'true';
                        else if (a.name === 'bind-text') bindText = a.value;
                        else if (a.name === 'text') text = a.value;
                        else attrs.push([a.name, a.value, a.value.includes('${')]);
                    }
                    rule.sets.push({ target, visible, text, bindText, attrs });
                } else if (tag === 'when') {
                    rule.nested.push(compileWhen(child));
                }
                child = child.nextElementSibling;
            }
            return rule;
        };

        const rules = [];
        let child = statesNode.firstElementChild;
        while (child) {
            if (child.tagName.toLowerCase() === 'when') {
                rules.push(compileWhen(child));
            }
            child = child.nextElementSibling;
        }
        return { rules, hasResponsive };
    }

    static compileXml(statesXml) {
        if (!statesXml || typeof DOMParser === 'undefined') return null;
        let cached = this._compiledXmlCache.get(statesXml);
        if (cached !== undefined) return cached;
        try {
            const doc = new DOMParser().parseFromString(statesXml, 'application/xml');
            const node = doc.querySelector('states') || doc.documentElement;
            cached = (node && node.tagName && !node.querySelector('parsererror')) ? this.compile(node) : null;
        } catch (e) {
            cached = null;
        }
        if (this._compiledXmlCache.size > 256) this._compiledXmlCache.clear();
        this._compiledXmlCache.set(statesXml, cached);
        return cached;
    }

    /** Construye el mapa O(1) de targets propios en 1 pasada DFS con poda en límites de SodaComponent. */
    static buildOwnedTargetMap(rootEl) {
        const map = new Map();
        const indexNode = (el) => {
            const name = el.getAttribute('name');
            const id = el.getAttribute('id');
            const sodaId = el.getAttribute('data-soda-id');
            if (name && !map.has(name)) map.set(name, el);
            if (id && !map.has(id)) map.set(id, el);
            if (sodaId && !map.has(sodaId)) map.set(sodaId, el);
        };
        indexNode(rootEl);
        if (rootEl.tagName) {
            const selfTag = rootEl.tagName.toLowerCase();
            if (!map.has(selfTag)) map.set(selfTag, rootEl);
        }
        walkElements(rootEl, (el) => {
            indexNode(el);
            // Poda: no descender al interior de otro SodaComponent
            if (el instanceof SodaComponent) return false;
            return true;
        });
        rootEl._sodaTargetMap = map;
        return map;
    }

    static _isOwnedBy(owner, el) {
        let cur = el.parentElement;
        while (cur) {
            if (cur === owner) return true;
            if (cur instanceof SodaComponent) return false;
            cur = cur.parentElement;
        }
        return false;
    }

    static _saveOrigAttr(targetEl, attr, ownerEl) {
        if (!targetEl._sodaOrigAttrs) targetEl._sodaOrigAttrs = Object.create(null);
        if (!(attr in targetEl._sodaOrigAttrs)) {
            targetEl._sodaOrigAttrs[attr] = targetEl.hasAttribute(attr) ? targetEl.getAttribute(attr) : null;
        }
        if (ownerEl) {
            if (!ownerEl._sodaMutatedEls) ownerEl._sodaMutatedEls = new Set();
            ownerEl._sodaMutatedEls.add(targetEl);
        }
    }

    static restore(componentElement) {
        const mutatedSet = componentElement && componentElement._sodaMutatedEls;
        if (!mutatedSet || mutatedSet.size === 0) return;

        for (const el of mutatedSet) {
            if (!el._sodaOrigAttrs) continue;
            el._sodaBatching = true;
            try {
                for (const attr in el._sodaOrigAttrs) {
                    const origVal = el._sodaOrigAttrs[attr];
                    if (origVal === null) el.removeAttribute(attr);
                    else el.setAttribute(attr, origVal);
                    if (attr === 'visible' && origVal !== 'false') {
                        el.style.display = '';
                    }
                }
                if ('_sodaOrigText' in el) {
                    el.textContent = el._sodaOrigText;
                    delete el._sodaOrigText;
                }
                delete el._sodaOrigAttrs;
            } finally {
                el._sodaBatching = false;
            }
            applySodaStyles(el);
        }
        mutatedSet.clear();
    }

    static evaluateXml(componentElement, statesXml, propsData) {
        if (!statesXml || !componentElement) return;
        const compiled = this.compileXml(statesXml);
        if (compiled) this.evaluateCompiled(componentElement, compiled, propsData);
    }

    static evaluate(componentElement, statesNodeOrCompiled, propsData) {
        if (!statesNodeOrCompiled || !componentElement) return;
        const compiled = Array.isArray(statesNodeOrCompiled.rules)
            ? statesNodeOrCompiled
            : this.compile(statesNodeOrCompiled);
        if (compiled) this.evaluateCompiled(componentElement, compiled, propsData);
    }

    static evaluateCompiled(componentElement, compiled, propsData) {
        if (!compiled || !compiled.rules || compiled.rules.length === 0) return;

        // 1. Restaurar mutaciones previas (batched, 1 applySodaStyles por nodo tocado)
        this.restore(componentElement);

        // 2. Obtener o construir índice O(1) de targets propios con poda
        const targetMap = componentElement._sodaTargetMap || this.buildOwnedTargetMap(componentElement);

        // 3. Contexto responsivo resuelto 1 sola vez para todo el bloque <states>
        let respCtx = null;
        if (compiled.hasResponsive) {
            const simBpHost = componentElement.closest ? componentElement.closest('[preview-breakpoint]') : null;
            const simOrientHost = componentElement.closest ? componentElement.closest('[preview-orientation]') : null;
            const simBp = simBpHost ? (simBpHost.getAttribute('preview-breakpoint') || '').trim().toLowerCase() : '';
            const simOrient = simOrientHost ? (simOrientHost.getAttribute('preview-orientation') || '').trim().toLowerCase() : '';
            const vp = this._viewportCache.valid ? this._viewportCache : this._refreshViewportCache();
            respCtx = {
                bp: simBp || vp.bp,
                orient: simOrient || vp.orient,
                vpWidth: vp.width,
                compWidth: null // lazy: solo se mide si alguna regla usa min-width/max-width
            };
        }

        // 4. Evaluar reglas y acumular elementos tocados para sincronizar estilos 1 sola vez al final
        const dirtyEls = new Set();
        for (let i = 0; i < compiled.rules.length; i++) {
            this._evalRule(componentElement, compiled.rules[i], propsData, targetMap, respCtx, dirtyEls);
        }

        for (const el of dirtyEls) {
            el._sodaBatching = false;
            applySodaStyles(el);
        }
    }

    static _evalRule(rootEl, rule, propsData, targetMap, respCtx, dirtyEls) {
        if (rule.hasResp && respCtx) {
            if (rule.bp && rule.bp !== respCtx.bp) return;
            if (rule.orient && rule.orient !== respCtx.orient) return;
            if (rule.minW !== null || rule.maxW !== null) {
                if (respCtx.compWidth === null) {
                    respCtx.compWidth = rootEl.offsetWidth || respCtx.vpWidth;
                }
                if (rule.minW !== null && respCtx.compWidth < rule.minW) return;
                if (rule.maxW !== null && respCtx.compWidth > rule.maxW) return;
            }
        }

        if (rule.prop) {
            const rawVal = propsData ? (propsData[rule.prop] ?? propsData[rule.propLower]) : undefined;
            const strVal = (rawVal !== undefined && rawVal !== null) ? String(rawVal).trim() : '';
            if (rule.is !== null && strVal !== rule.is) return;
            const isEmpty = rawVal === undefined || rawVal === null || strVal.length === 0 || strVal === '[]' || strVal === '{}';
            if (rule.empty !== null && isEmpty !== rule.empty) return;
            if (rule.notEmpty !== null && isEmpty === rule.notEmpty) return;
        }

        for (let i = 0; i < rule.sets.length; i++) {
            this._applySetCompiled(rootEl, rule.sets[i], propsData, targetMap, dirtyEls);
        }
        for (let i = 0; i < rule.nested.length; i++) {
            this._evalRule(rootEl, rule.nested[i], propsData, targetMap, respCtx, dirtyEls);
        }
    }

    static _applySetCompiled(rootEl, setSpec, propsData, targetMap, dirtyEls) {
        const targetEl = targetMap.get(setSpec.target);
        if (!targetEl) return;

        targetEl._sodaBatching = true;
        dirtyEls.add(targetEl);

        if (setSpec.visible !== null) {
            this._saveOrigAttr(targetEl, 'visible', rootEl);
            targetEl.setAttribute('visible', setSpec.visible ? 'true' : 'false');
            targetEl.style.display = setSpec.visible ? '' : 'none';
        }

        if (setSpec.bindText !== null && propsData) {
            this._saveOrigAttr(targetEl, 'text', rootEl);
            if (!('_sodaOrigText' in targetEl)) targetEl._sodaOrigText = targetEl.textContent;
            const newText = String(propsData[setSpec.bindText] ?? propsData[setSpec.bindText.toLowerCase()] ?? '');
            targetEl.setAttribute('text', newText);
            targetEl.textContent = newText;
        } else if (setSpec.text !== null) {
            this._saveOrigAttr(targetEl, 'text', rootEl);
            if (!('_sodaOrigText' in targetEl)) targetEl._sodaOrigText = targetEl.textContent;
            targetEl.setAttribute('text', setSpec.text);
            targetEl.textContent = setSpec.text;
        }

        for (let i = 0; i < setSpec.attrs.length; i++) {
            const [attr, rawVal, hasInterpolation] = setSpec.attrs[i];
            let val = rawVal;
            if (hasInterpolation && propsData) {
                val = rawVal.replace(TEMPLATE_VAR_RE, (m, k) => {
                    const key = k.trim();
                    const found = propsData[key] ?? propsData[key.toLowerCase()];
                    return found !== undefined ? String(found) : '';
                });
            }
            if (SODA_STYLE_HANDLERS[attr] || targetEl.tagName.includes('-')) {
                this._saveOrigAttr(targetEl, attr, rootEl);
                targetEl.setAttribute(attr, val);
            }
        }
    }
}

// =============================================================================
// 6. REGISTRO Y COMPONENTES PERSONALIZADOS (SodaRegistry & SodaComponent)
// =============================================================================
class SodaRegistry {
    static components = new Map();
    static mocks = new Map();
    static _serializedMocks = new Map();
    static journeys = new Map();

    static _compileDefinition(def) {
        if (!def || def._compiled) return def;
        const propKeyByLower = Object.create(null);
        const propDefaults = Object.create(null);
        const observedSet = new Set();
        let usesMocks = false;

        if (def.props) {
            for (const [pName, pConf] of Object.entries(def.props)) {
                const defVal = (typeof pConf === 'object' && pConf !== null) ? String(pConf.default ?? '') : String(pConf ?? '');
                const lower = pName.toLowerCase();
                propKeyByLower[lower] = pName;
                propDefaults[pName] = defVal;
                observedSet.add(lower);
                if (defVal.includes('${mocks.')) usesMocks = true;
            }
        }

        const normTpl = normalizeCustomTags(def.template || '');
        let hasTemplateVars = false;
        TEMPLATE_VAR_RE.lastIndex = 0;
        let match;
        while ((match = TEMPLATE_VAR_RE.exec(normTpl)) !== null) {
            hasTemplateVars = true;
            if (match[1].trim().startsWith('mocks.')) usesMocks = true;
        }

        let compiledStates = null;
        if (def.statesNode) {
            compiledStates = SodaStateEngine.compile(def.statesNode);
        } else if (def.statesXml) {
            compiledStates = SodaStateEngine.compileXml(def.statesXml);
        }

        def._normalizedTemplate = normTpl;
        def._propKeyByLower = propKeyByLower;
        def._propDefaults = propDefaults;
        def._observedAttrs = Array.from(observedSet);
        def._hasTemplateVars = hasTemplateVars;
        def._usesMocks = usesMocks;
        def._hasNamedSlots = /<ui-slot\b[^>]*\bname=/i.test(normTpl);
        def._hasInteractiveActions = /\b(toggle-prop|set-prop|action|data-event|on-click|event)=/i.test(normTpl) ||
            (Array.isArray(def.events) && def.events.length > 0);
        def._compiledStates = compiledStates;
        def._hasResponsiveStates = !!(compiledStates && compiledStates.hasResponsive);
        def._compiled = true;
        return def;
    }

    static register(name, def) {
        if (!name || !def) return;
        this._compileDefinition(def);
        this.components.set(name.toLowerCase(), def);
    }
    static get(name) { return this.components.get((name || '').toLowerCase()); }
    static has(name) { return this.components.has((name || '').toLowerCase()); }

    static registerMock(name, items) {
        if (!name) return;
        const key = name.toLowerCase();
        this.mocks.set(key, Array.isArray(items) ? items : []);
        this._serializedMocks.delete(key);
    }
    static registerMocks(mocksObj) {
        if (!mocksObj || typeof mocksObj !== 'object') return;
        for (const [k, v] of Object.entries(mocksObj)) this.registerMock(k, v);
    }
    static getMock(name) { return this.mocks.get((name || '').toLowerCase()); }
    static getSerializedMock(name) {
        const key = (name || '').toLowerCase();
        let s = this._serializedMocks.get(key);
        if (s === undefined) {
            s = JSON.stringify(this.mocks.get(key) || []);
            this._serializedMocks.set(key, s);
        }
        return s;
    }

    static registerJourney(name, def) {
        if (name && def) this.journeys.set(name.toLowerCase(), def);
    }
    static getJourney(name) { return this.journeys.get((name || '').toLowerCase()); }
    static hasJourney(name) { return this.journeys.has((name || '').toLowerCase()); }
    static getFirstJourney() {
        const it = this.journeys.values().next();
        return (it && !it.done) ? it.value : null;
    }
}

class SodaComponent extends HTMLElement {
    static defineDynamic(tagName) {
        const normalized = (tagName || '').toLowerCase();
        if (!normalized || !normalized.includes('-') || customElements.get(normalized)) return;

        customElements.define(normalized, class extends SodaComponent {
            static get observedAttributes() {
                const def = SodaRegistry.get(normalized);
                return (def && def._observedAttrs) ? def._observedAttrs : [];
            }

            attributeChangedCallback(name, oldVal, newVal) {
                if (oldVal !== newVal && this.isConnected && !this._isRendering && !this._sodaBatching) {
                    this.render();
                }
            }
        });
    }

    async connectedCallback() {
        ensureSodaBaseStyles();
        this.style.display = this.style.display || 'flex';
        this.style.boxSizing = 'border-box';

        const src = this.getAttribute('src');
        const tagName = this.tagName.toLowerCase();
        if (src && !SodaRegistry.has(tagName)) {
            try {
                await SodaLoader.load(src);
            } catch (e) {
                console.warn('[SODA] Error cargando componente desde src:', src, e);
            }
        }

        this.render();

        const def = SodaRegistry.get(tagName);
        if (def && def._hasResponsiveStates) {
            SodaStateEngine.registerResponsiveComponent(this);
        }

        if (!this._sodaClickHandler && (!def || def._hasInteractiveActions)) {
            this._sodaClickHandler = (ev) => this._handleComponentClick(ev);
            this.addEventListener('click', this._sodaClickHandler);
        }
    }

    disconnectedCallback() {
        SodaStateEngine.unregisterResponsiveComponent(this);
        if (this._sodaClickHandler) {
            this.removeEventListener('click', this._sodaClickHandler);
            this._sodaClickHandler = null;
        }
    }

    _handleComponentClick(ev) {
        let cur = ev.target && ev.target.nodeType === 1 ? ev.target : null;
        while (cur && cur !== this) {
            if (SodaStateEngine._isOwnedBy(this, cur)) {
                const toggleProp = cur.getAttribute('toggle-prop');
                const setProp = cur.getAttribute('set-prop');
                const actionAttr = cur.getAttribute('action') || cur.getAttribute('data-event') || cur.getAttribute('on-click') || cur.getAttribute('event');

                if (toggleProp) {
                    const propName = toggleProp.trim();
                    const curDef = SodaRegistry.get(this.tagName.toLowerCase());
                    const canonical = curDef?._propKeyByLower?.[propName.toLowerCase()] || propName;
                    const defVal = curDef?._propDefaults?.[canonical] ?? 'false';
                    const curVal = this.getAttribute(canonical) ?? this.getAttribute(propName.toLowerCase()) ?? defVal;
                    const nextVal = String(curVal).trim().toLowerCase() === 'true' ? 'false' : 'true';
                    this.setAttribute(canonical, nextVal);
                    ev.stopPropagation();
                    if (actionAttr) {
                        this.dispatchEvent(new CustomEvent(actionAttr.trim(), {
                            bubbles: true, composed: true, detail: { prop: canonical, value: nextVal }
                        }));
                    }
                    return;
                }

                if (setProp) {
                    const curDef = SodaRegistry.get(this.tagName.toLowerCase());
                    const updated = {};
                    this._sodaBatching = true;
                    try {
                        for (const pair of setProp.split(';')) {
                            const eqIdx = pair.indexOf('=');
                            if (eqIdx <= 0) continue;
                            const k = pair.slice(0, eqIdx).trim();
                            const v = pair.slice(eqIdx + 1).trim();
                            if (!k) continue;
                            const canonical = curDef?._propKeyByLower?.[k.toLowerCase()] || k;
                            this.setAttribute(canonical, v);
                            updated[canonical] = v;
                        }
                    } finally {
                        this._sodaBatching = false;
                    }
                    this.render();
                    ev.stopPropagation();
                    if (actionAttr) {
                        this.dispatchEvent(new CustomEvent(actionAttr.trim(), {
                            bubbles: true, composed: true, detail: { props: updated }
                        }));
                    }
                    return;
                }

                if (actionAttr) {
                    const customEv = new CustomEvent(actionAttr.trim(), {
                        bubbles: true,
                        composed: true,
                        cancelable: true,
                        detail: { source: cur, props: this._lastPropsData || {}, originalEvent: ev }
                    });
                    this.dispatchEvent(customEv);
                    if (customEv.defaultPrevented) {
                        ev._sodaSegueHandled = true;
                    }
                    return;
                }
            }
            cur = cur.parentElement;
        }
    }

    render() {
        if (this._sodaEipManaged || this._isRendering) return;
        const tagName = this.tagName.toLowerCase();
        const def = SodaRegistry.get(tagName);
        if (!def) {
            const jDef = SodaRegistry.getJourney(tagName);
            if (jDef) SodaJourneyElement.mountIntoHost(this, jDef);
            return;
        }

        this._isRendering = true;
        this._sodaBatching = true;
        try {
            // 1. Propagar atributos de <layout> a la raíz sin disparar re-renders
            if (def.layoutAttrs) {
                for (const k in def.layoutAttrs) {
                    if (!this.hasAttribute(k)) this.setAttribute(k, def.layoutAttrs[k]);
                }
            }
            applySodaStyles(this);

            if (def.target === 'pdf' || def.role === 'pdf') {
                this.setAttribute('data-theme', 'light');
                this.style.backgroundColor = '#ffffff';
                this.style.color = '#0f172a';
                const sa = def.sceneAttrs || {};
                const m = SodaPdfPaginator._resolveMargins({
                    margin: sa.margin, marginX: sa['margin-x'], marginY: sa['margin-y'],
                    marginTop: sa['margin-top'], marginRight: sa['margin-right'],
                    marginBottom: sa['margin-bottom'], marginLeft: sa['margin-left']
                });
                this.style.padding = `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`;
            }

            // 2. Recolectar props precompiladas + atributos de instancia
            const propsData = Object.assign(Object.create(null), def._propDefaults);
            const propKeyByLower = def._propKeyByLower;
            let instanceUsesMocks = def._usesMocks;

            const attrs = this.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const aName = attrs[i].name;
                if (aName === 'data-soda-id' || aName === 'style' || aName === 'class') continue;
                const aVal = attrs[i].value;
                propsData[aName] = aVal;
                const canonical = propKeyByLower[aName.toLowerCase()];
                if (canonical) propsData[canonical] = aVal;
                if (aVal.includes('${mocks.')) instanceUsesMocks = true;
            }

            if (instanceUsesMocks && SodaRegistry.mocks.size > 0) {
                for (const mockName of SodaRegistry.mocks.keys()) {
                    const mockKey = `mocks.${mockName}`;
                    if (propsData[mockKey] === undefined) {
                        propsData[mockKey] = SodaRegistry.getSerializedMock(mockName);
                    }
                }
            }

            for (const k in propsData) {
                const v = propsData[k];
                if (typeof v === 'string' && v.startsWith('${') && v.endsWith('}')) {
                    const refKey = v.slice(2, -1).trim();
                    const resolved = propsData[refKey] ?? propsData[refKey.toLowerCase()];
                    if (resolved !== undefined) propsData[k] = resolved;
                }
            }

            // 3. Interpolación en 1 sola pasada regex (reemplaza N split/join)
            let html = def._normalizedTemplate || '';
            if (def._hasTemplateVars) {
                html = html.replace(TEMPLATE_VAR_RE, (full, rawKey) => {
                    const key = rawKey.trim();
                    const val = propsData[key] ?? propsData[propKeyByLower[key.toLowerCase()]];
                    return val !== undefined ? escapeAttr(val) : full;
                });
            }

            this._sodaTargetMap = null;
            this._sodaMutatedEls = null;
            this.innerHTML = html;

            // 4. Proyección de slots nombrados con poda en subcomponentes
            if (def._hasNamedSlots) {
                const namedSlots = [];
                const slottedChildren = new Map();
                walkElements(this, (el) => {
                    const sName = el.getAttribute('slot');
                    if (sName) slottedChildren.set(sName, el);
                    if (el.tagName === 'UI-SLOT' && el.hasAttribute('name')) {
                        namedSlots.push(el);
                        return false;
                    }
                    if (el instanceof SodaComponent) return false;
                    return true;
                });
                for (let i = 0; i < namedSlots.length; i++) {
                    const slot = namedSlots[i];
                    const targetChild = slottedChildren.get(slot.getAttribute('name'));
                    if (targetChild && slot.parentNode) {
                        slot.parentNode.replaceChild(targetChild, slot);
                    }
                }
            }

            // 5. Evaluar estados compilados
            this._lastPropsData = propsData;
            if (def._compiledStates) {
                SodaStateEngine.evaluateCompiled(this, def._compiledStates, propsData);
            }
        } finally {
            this._sodaBatching = false;
            this._isRendering = false;
        }
    }
}

// =============================================================================
// 7. MOTOR DE JOURNEYS ESTILO FIGMA (PREVIEWS ESTÁTICOS + SEGUES + OVERLAYS)
// =============================================================================
function ensureSodaJourneyStyles() {
    if (_sodaJourneyStylesInjected || typeof document === 'undefined') return;
    _sodaJourneyStylesInjected = true;
    if (document.getElementById('soda-journey-styles')) return;
    const style = document.createElement('style');
    style.id = 'soda-journey-styles';
    style.textContent = `
        /* --- Modo Play (SPA puro, sin chrome externo ni carcasa de dispositivo) --- */
        .soda-journey-stage {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background: var(--soda-color-bg-canvas, #0d1117);
            color: var(--soda-color-text-primary, #f0f6fc);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
        }
        .soda-journey-screens {
            position: relative;
            flex: 1;
            width: 100%;
            min-height: 0;
            overflow: hidden;
        }
        .soda-preview-pane {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            overflow: auto;
            box-sizing: border-box;
        }
        .soda-preview-pane[hidden] {
            display: none !important;
        }
        .soda-preview-pane > * {
            width: 100%;
            min-height: 100%;
            flex: 1 0 auto;
        }

        /* --- Capa de Overlays / Menús móviles dentro del App Shield --- */
        .soda-journey-overlays {
            position: absolute;
            inset: 0;
            z-index: 40;
            pointer-events: none;
            overflow: hidden;
        }
        .soda-overlay-layer {
            position: absolute;
            inset: 0;
            display: flex;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }
        .soda-overlay-layer[data-open="true"] {
            pointer-events: auto;
            opacity: 1;
            visibility: visible;
        }
        .soda-overlay-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.52);
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        .soda-overlay-layer[data-open="true"] > .soda-overlay-backdrop {
            opacity: 1;
        }
        .soda-overlay-surface {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            overflow: auto;
            box-sizing: border-box;
            will-change: transform, opacity;
            transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
        }
        .soda-overlay-surface > * {
            width: 100%;
            flex: 1 0 auto;
        }

        /* Variantes de presentación de Overlay dentro del shield */
        .soda-overlay-layer[data-overlay="drawer-left"] {
            align-items: stretch;
            justify-content: flex-start;
        }
        .soda-overlay-layer[data-overlay="drawer-left"] > .soda-overlay-surface {
            width: min(290px, 82%);
            height: 100%;
            transform: translate3d(-100%, 0, 0);
            box-shadow: 12px 0 32px rgba(0, 0, 0, 0.42);
        }
        .soda-overlay-layer[data-overlay="drawer-left"][data-open="true"] > .soda-overlay-surface {
            transform: translate3d(0, 0, 0);
        }

        .soda-overlay-layer[data-overlay="drawer-right"] {
            align-items: stretch;
            justify-content: flex-end;
        }
        .soda-overlay-layer[data-overlay="drawer-right"] > .soda-overlay-surface {
            width: min(290px, 82%);
            height: 100%;
            transform: translate3d(100%, 0, 0);
            box-shadow: -12px 0 32px rgba(0, 0, 0, 0.42);
        }
        .soda-overlay-layer[data-overlay="drawer-right"][data-open="true"] > .soda-overlay-surface {
            transform: translate3d(0, 0, 0);
        }

        .soda-overlay-layer[data-overlay="bottom-sheet"] {
            flex-direction: column;
            justify-content: flex-end;
            align-items: stretch;
        }
        .soda-overlay-layer[data-overlay="bottom-sheet"] > .soda-overlay-surface {
            width: 100%;
            max-height: 85%;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            overflow: hidden;
            transform: translate3d(0, 100%, 0);
            box-shadow: 0 -10px 32px rgba(0, 0, 0, 0.42);
        }
        .soda-overlay-layer[data-overlay="bottom-sheet"][data-open="true"] > .soda-overlay-surface {
            transform: translate3d(0, 0, 0);
        }

        .soda-overlay-layer[data-overlay="modal"],
        .soda-overlay-layer[data-overlay="popover"] {
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .soda-overlay-layer[data-overlay="modal"] > .soda-overlay-surface,
        .soda-overlay-layer[data-overlay="popover"] > .soda-overlay-surface {
            width: min(460px, 100%);
            max-height: 86%;
            border-radius: 14px;
            overflow: hidden;
            transform: scale(0.96);
            opacity: 0;
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5);
        }
        .soda-overlay-layer[data-overlay="modal"][data-open="true"] > .soda-overlay-surface,
        .soda-overlay-layer[data-overlay="popover"][data-open="true"] > .soda-overlay-surface {
            transform: scale(1);
            opacity: 1;
        }

        .soda-journey-toast {
            position: absolute;
            left: 50%;
            bottom: 24px;
            transform: translateX(-50%);
            z-index: 60;
            padding: 8px 16px;
            border-radius: 999px;
            background: var(--soda-color-accent-primary, #2563eb);
            color: #ffffff;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
            pointer-events: none;
        }

        /* --- Modo Canvas (Lienzo estilo Figma para Soda Studio) --- */
        .soda-journey-canvas {
            position: relative;
            width: 100%;
            height: 100%;
            min-width: 1200px;
            min-height: 900px;
            overflow: auto;
            background-color: #11141b;
            background-image: radial-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px);
            background-size: 20px 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
        }
        .soda-journey-canvas-world {
            position: relative;
            min-width: 100%;
            min-height: 100%;
        }
        .soda-journey-segue-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            overflow: visible;
        }
        .soda-journey-segue-path {
            fill: none;
            stroke: #38bdf8;
            stroke-width: 2;
            stroke-opacity: 0.78;
        }
        .soda-journey-segue-path.is-overlay {
            stroke: #a78bfa;
            stroke-dasharray: 6 4;
        }
        .soda-journey-segue-label {
            font-size: 10px;
            font-weight: 600;
            fill: #e2e8f0;
            paint-order: stroke;
            stroke: #0f172a;
            stroke-width: 4px;
            stroke-linejoin: round;
        }
        .soda-canvas-preview-card {
            position: absolute;
            left: 0;
            top: 0;
            z-index: 2;
            display: flex;
            flex-direction: column;
            gap: 8px;
            cursor: grab;
            will-change: transform;
        }
        .soda-canvas-preview-card.is-dragging {
            cursor: grabbing;
            z-index: 30;
        }
        .soda-canvas-preview-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 0 2px;
            font-size: 12px;
            font-weight: 600;
            color: #cbd5e1;
        }
        .soda-canvas-preview-badges {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .soda-canvas-preview-badge {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 999px;
            background: rgba(56, 189, 248, 0.16);
            color: #7dd3fc;
        }
        .soda-canvas-preview-badge.is-overlay {
            background: rgba(167, 139, 250, 0.18);
            color: #c4b5fd;
        }
        .soda-canvas-preview-frame {
            position: relative;
            overflow: hidden;
            border-radius: 6px;
            background: var(--soda-color-bg-canvas, #0d1117);
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(148, 163, 184, 0.22);
            transition: box-shadow 0.12s ease;
        }
        .soda-canvas-preview-card.is-selected > .soda-canvas-preview-frame {
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.55), 0 0 0 2px #38bdf8;
        }
        .soda-canvas-preview-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            pointer-events: none;
            overflow: hidden;
        }
        .soda-canvas-preview-content > * {
            width: 100%;
            height: 100%;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

class SodaJourneyController {
    constructor(hostEl, journeyDef) {
        this.host = hostEl;
        this.journey = journeyDef;
        this.mode = (hostEl.getAttribute('mode') || 'play').toLowerCase() === 'canvas' ? 'canvas' : 'play';

        this.previewMap = new Map();
        this.seguesBySource = new Map();
        this.allEventNames = new Set();
        this._indexJourney();

        const initialId = hostEl.getAttribute('initial-preview')
            || journeyDef.initialPreview
            || (journeyDef.previews[0]?.id || '');

        this.initialPreviewId = initialId;
        this.basePreviewId = initialId;
        this.currentPreviewId = initialId;
        this.history = [];
        this.overlayStack = [];
        this.mountedScreens = new Map();
        this.mountedOverlays = new Map();
        this.selectedPreviewId = initialId;

        this._customListeners = [];
        this._toastEl = null;
        this._toastTimer = null;
        this._stageEl = null;
        this._screensEl = null;
        this._overlaysEl = null;

        this.render();
    }

    _indexJourney() {
        this.previewMap.clear();
        this.seguesBySource.clear();
        this.allEventNames.clear();

        const previews = this.journey.previews || [];
        for (let i = 0; i < previews.length; i++) {
            const p = previews[i];
            this.previewMap.set(p.id, p);
        }

        const segues = this.journey.segues || [];
        for (let i = 0; i < segues.length; i++) {
            const sg = segues[i];
            if (!sg.on) continue;
            this.allEventNames.add(sg.on);
            const fromKey = sg.from || '*';
            let evMap = this.seguesBySource.get(fromKey);
            if (!evMap) {
                evMap = new Map();
                this.seguesBySource.set(fromKey, evMap);
            }
            evMap.set(sg.on, sg);
        }
    }

    getPreview(previewId) {
        return this.previewMap.get(previewId) || null;
    }

    getState() {
        const activeOverlayId = this.overlayStack.length > 0 ? this.overlayStack[this.overlayStack.length - 1] : null;
        return {
            journeyName: this.journey.name,
            title: this.journey.title || this.journey.name,
            mode: this.mode,
            currentPreviewId: activeOverlayId || this.basePreviewId,
            basePreviewId: this.basePreviewId,
            activeOverlayId,
            selectedPreviewId: this.selectedPreviewId,
            previews: (this.journey.previews || []).map(p => ({
                id: p.id,
                label: p.label || p.id,
                scene: p.scene,
                role: p.role || 'screen',
                overlay: p.overlay || '',
                x: p.x,
                y: p.y,
                width: p.width,
                height: p.height
            })),
            segues: (this.journey.segues || []).slice()
        };
    }

    setMode(nextMode) {
        const normalized = String(nextMode || 'play').toLowerCase() === 'canvas' ? 'canvas' : 'play';
        if (normalized === this.mode) return;
        this.mode = normalized;
        this.render();
    }

    _cleanupListeners() {
        if (this._clickHandler && this._stageEl) {
            this._stageEl.removeEventListener('click', this._clickHandler);
            this._clickHandler = null;
        }
        for (let i = 0; i < this._customListeners.length; i++) {
            const { target, name, fn } = this._customListeners[i];
            target.removeEventListener(name, fn);
        }
        this._customListeners.length = 0;
    }

    destroy() {
        this._cleanupListeners();
        if (this._toastTimer) {
            clearTimeout(this._toastTimer);
            this._toastTimer = null;
        }
    }

    _createPreviewSceneElement(preview) {
        const sceneTag = (preview.scene || '').trim().toLowerCase();
        if (!sceneTag) {
            const empty = document.createElement('div');
            empty.style.padding = '16px';
            empty.textContent = `[SODA Journey] Escena no definida para preview "${preview.id}".`;
            return empty;
        }
        const el = document.createElement(sceneTag);
        if (preview.breakpoint) el.setAttribute('preview-breakpoint', preview.breakpoint);
        if (preview.orientation) el.setAttribute('preview-orientation', preview.orientation);
        const props = preview.props || {};
        for (const k in props) {
            el.setAttribute(k, props[k]);
        }
        return el;
    }

    _ensureScreenPane(previewId) {
        let pane = this.mountedScreens.get(previewId);
        if (pane) return pane;
        const preview = this.getPreview(previewId);
        if (!preview || !this._screensEl) return null;

        pane = document.createElement('div');
        pane.className = 'soda-preview-pane';
        pane.dataset.previewId = preview.id;
        pane.hidden = true;
        if (preview.breakpoint) pane.setAttribute('preview-breakpoint', preview.breakpoint);
        if (preview.orientation) pane.setAttribute('preview-orientation', preview.orientation);

        pane.appendChild(this._createPreviewSceneElement(preview));
        this._screensEl.appendChild(pane);
        this.mountedScreens.set(previewId, pane);
        return pane;
    }

    _ensureOverlayLayer(previewId, overrideStyle) {
        let layer = this.mountedOverlays.get(previewId);
        const preview = this.getPreview(previewId);
        if (!preview || !this._overlaysEl) return null;
        const overlayStyle = overrideStyle || preview.overlay || 'modal';

        if (layer) {
            layer.dataset.overlay = overlayStyle;
            return layer;
        }

        layer = document.createElement('div');
        layer.className = 'soda-overlay-layer';
        layer.dataset.previewId = preview.id;
        layer.dataset.overlay = overlayStyle;
        layer.dataset.open = 'false';

        if (preview.backdrop !== false) {
            const backdrop = document.createElement('div');
            backdrop.className = 'soda-overlay-backdrop';
            if (preview.dismissOnBackdrop !== false) {
                backdrop.addEventListener('click', () => this.dismissOverlay());
            }
            layer.appendChild(backdrop);
        }

        const surface = document.createElement('div');
        surface.className = 'soda-overlay-surface';
        if (preview.breakpoint) surface.setAttribute('preview-breakpoint', preview.breakpoint);
        if (preview.orientation) surface.setAttribute('preview-orientation', preview.orientation);
        surface.appendChild(this._createPreviewSceneElement(preview));
        layer.appendChild(surface);

        this._overlaysEl.appendChild(layer);
        this.mountedOverlays.set(previewId, layer);
        return layer;
    }

    goToPreview(previewId, options = {}) {
        const target = this.getPreview(previewId);
        if (!target) return;

        if (this.mode === 'canvas') {
            this.selectPreview(previewId);
            return;
        }

        const isOverlay = target.role === 'overlay' || !!options.overlay;
        if (isOverlay) {
            const wasMounted = this.mountedOverlays.has(target.id);
            const layer = this._ensureOverlayLayer(target.id, options.overlay || target.overlay);
            if (layer) {
                if (!this.overlayStack.includes(target.id)) {
                    this.overlayStack.push(target.id);
                }
                if (wasMounted) {
                    layer.dataset.open = 'true';
                } else {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (this.overlayStack.includes(target.id)) {
                                layer.dataset.open = 'true';
                            }
                        });
                    });
                }
                this.currentPreviewId = target.id;
            }
        } else {
            this._closeAllOverlays();
            if (!options.replace && this.basePreviewId && this.basePreviewId !== target.id) {
                this.history.push(this.basePreviewId);
            }
            const prevPane = this.mountedScreens.get(this.basePreviewId);
            if (prevPane) prevPane.hidden = true;

            const nextPane = this._ensureScreenPane(target.id);
            if (nextPane) nextPane.hidden = false;

            this.basePreviewId = target.id;
            this.currentPreviewId = target.id;
        }

        if (options.toast) this.showToast(options.toast);
        this._emitChange();
    }

    dismissOverlay() {
        if (this.overlayStack.length === 0) return;
        const closedId = this.overlayStack.pop();
        const layer = this.mountedOverlays.get(closedId);
        if (layer) layer.dataset.open = 'false';
        this.currentPreviewId = this.overlayStack.length > 0
            ? this.overlayStack[this.overlayStack.length - 1]
            : this.basePreviewId;
        this._emitChange();
    }

    _closeAllOverlays() {
        while (this.overlayStack.length > 0) {
            const id = this.overlayStack.pop();
            const layer = this.mountedOverlays.get(id);
            if (layer) layer.dataset.open = 'false';
        }
    }

    goBack() {
        if (this.overlayStack.length > 0) {
            this.dismissOverlay();
            return;
        }
        if (this.history.length > 0) {
            const prevId = this.history.pop();
            this.goToPreview(prevId, { replace: true });
        }
    }

    reset() {
        this._closeAllOverlays();
        this.history.length = 0;
        if (this.initialPreviewId) {
            this.goToPreview(this.initialPreviewId, { replace: true });
        }
    }

    showToast(text) {
        if (!this._stageEl || !text) return;
        if (!this._toastEl) {
            this._toastEl = document.createElement('div');
            this._toastEl.className = 'soda-journey-toast';
            this._stageEl.appendChild(this._toastEl);
        }
        this._toastEl.textContent = text;
        this._toastEl.hidden = false;
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            if (this._toastEl) this._toastEl.hidden = true;
        }, 2400);
    }

    _findSegue(fromPreviewId, eventName) {
        const exact = this.seguesBySource.get(fromPreviewId);
        if (exact && exact.has(eventName)) return exact.get(eventName);
        const wild = this.seguesBySource.get('*');
        if (wild && wild.has(eventName)) return wild.get(eventName);
        return null;
    }

    _executeSegue(segue) {
        if (!segue) return;
        this.host.dispatchEvent(new CustomEvent('soda-segue', {
            bubbles: true,
            composed: true,
            detail: { journey: this.journey.name, segue, currentPreviewId: this.currentPreviewId }
        }));

        const action = (segue.action || '').toLowerCase();
        if (action === 'dismiss' || action === 'close-overlay') {
            this.dismissOverlay();
            if (segue.toast) this.showToast(segue.toast);
            return;
        }
        if (action === 'back') {
            this.goBack();
            if (segue.toast) this.showToast(segue.toast);
            return;
        }
        if (segue.to) {
            this.goToPreview(segue.to, { overlay: segue.overlay || '', toast: segue.toast || '' });
        } else if (segue.toast) {
            this.showToast(segue.toast);
        }
    }

    _resolveSourcePreviewId(targetNode) {
        const overlayHost = targetNode && targetNode.closest ? targetNode.closest('.soda-overlay-layer[data-preview-id]') : null;
        if (overlayHost) return overlayHost.dataset.previewId;
        const screenHost = targetNode && targetNode.closest ? targetNode.closest('.soda-preview-pane[data-preview-id]') : null;
        if (screenHost) return screenHost.dataset.previewId;
        return this.currentPreviewId;
    }

    _attachPlayDelegation(stageEl) {
        // 1. Delegación única de CustomEvents emitidos por action/data-event/... o <ui-chart>
        for (const evName of this.allEventNames) {
            const fn = (ev) => {
                const sourceId = this._resolveSourcePreviewId(ev.target);
                const segue = this._findSegue(sourceId, evName);
                if (!segue) return;
                ev.stopPropagation();
                ev.preventDefault();
                if (ev.detail && ev.detail.originalEvent) {
                    ev.detail.originalEvent._sodaSegueHandled = true;
                }
                this._executeSegue(segue);
            };
            stageEl.addEventListener(evName, fn);
            this._customListeners.push({ target: stageEl, name: evName, fn });
        }

        // 2. Delegación única de clics (fallback para nodos sin SodaComponent o por id/name)
        this._clickHandler = (ev) => {
            if (ev._sodaSegueHandled) return;
            const sourceId = this._resolveSourcePreviewId(ev.target);
            const scoped = this.seguesBySource.get(sourceId);
            const wild = this.seguesBySource.get('*');
            if (!scoped && !wild) return;

            let cur = ev.target && ev.target.nodeType === 1 ? ev.target : null;
            while (cur && cur !== stageEl) {
                const candidates = [
                    cur.getAttribute('data-event'),
                    cur.getAttribute('on-click'),
                    cur.getAttribute('event'),
                    cur.getAttribute('action'),
                    cur.getAttribute('id'),
                    cur.getAttribute('name')
                ];
                for (let i = 0; i < candidates.length; i++) {
                    const key = candidates[i];
                    if (!key) continue;
                    const segue = (scoped && scoped.get(key)) || (wild && wild.get(key));
                    if (segue) {
                        ev._sodaSegueHandled = true;
                        ev.stopPropagation();
                        this._executeSegue(segue);
                        return;
                    }
                }
                cur = cur.parentElement;
            }
        };
        stageEl.addEventListener('click', this._clickHandler);
    }

    _emitChange() {
        this.host.dispatchEvent(new CustomEvent('soda-journey-change', {
            bubbles: true,
            composed: true,
            detail: this.getState()
        }));
    }

    render() {
        ensureSodaJourneyStyles();
        this._cleanupListeners();
        this.mountedScreens.clear();
        this.mountedOverlays.clear();
        this._toastEl = null;

        this.host.style.display = 'block';
        this.host.style.width = '100%';
        const isDirectBodyChild = this.host.parentElement === document.body;
        if (isDirectBodyChild) {
            this.host.style.height = '100dvh';
            this.host.style.minHeight = '100dvh';
            if (!document.body.style.margin) document.body.style.margin = '0';
        } else {
            this.host.style.height = '100%';
        }

        if (this.mode === 'canvas') {
            this._renderCanvasMode();
        } else {
            this._renderPlayMode();
        }
        this._emitChange();
    }

    _renderPlayMode() {
        const stage = document.createElement('div');
        stage.className = 'soda-journey-stage';

        const screens = document.createElement('div');
        screens.className = 'soda-journey-screens';

        const overlays = document.createElement('div');
        overlays.className = 'soda-journey-overlays';

        stage.appendChild(screens);
        stage.appendChild(overlays);
        this.host.replaceChildren(stage);

        this._stageEl = stage;
        this._screensEl = screens;
        this._overlaysEl = overlays;
        this._attachPlayDelegation(stage);

        // Pre-montar el preview inicial (O(1) swap posterior) y overlays opcionales ocultos en el shield
        const initPreview = this.getPreview(this.basePreviewId) || (this.journey.previews || [])[0];
        if (initPreview) {
            this.basePreviewId = initPreview.id;
            this.currentPreviewId = initPreview.id;
            const pane = this._ensureScreenPane(initPreview.id);
            if (pane) pane.hidden = false;
        }
    }

    // --- MODO CANVAS (Lienzo estilo Figma para Soda Studio) ---
    selectPreview(previewId) {
        this.selectedPreviewId = previewId;
        if (this._canvasCards) {
            for (const [id, entry] of this._canvasCards.entries()) {
                entry.card.classList.toggle('is-selected', id === previewId);
            }
        }
        const p = this.getPreview(previewId);
        if (p) {
            this.host.dispatchEvent(new CustomEvent('soda-preview-select', {
                bubbles: true,
                composed: true,
                detail: {
                    journey: this.journey.name,
                    previewId: p.id,
                    label: p.label,
                    scene: p.scene,
                    role: p.role,
                    overlay: p.overlay,
                    x: p.x,
                    y: p.y,
                    width: p.width,
                    height: p.height,
                    props: Object.assign({}, p.props || {})
                }
            }));
        }
    }

    updatePreviewProps(previewId, propsObj) {
        const p = this.getPreview(previewId);
        if (!p) return;
        p.props = Object.assign({}, p.props || {}, propsObj || {});
        if (this.mode === 'canvas' && this._canvasCards && this._canvasCards.has(previewId)) {
            const entry = this._canvasCards.get(previewId);
            entry.content.replaceChildren(this._createPreviewSceneElement(p));
        } else if (this.mountedScreens.has(previewId)) {
            const pane = this.mountedScreens.get(previewId);
            pane.replaceChildren(this._createPreviewSceneElement(p));
        } else if (this.mountedOverlays.has(previewId)) {
            const layer = this.mountedOverlays.get(previewId);
            const surface = layer.querySelector('.soda-overlay-surface');
            if (surface) surface.replaceChildren(this._createPreviewSceneElement(p));
        }
    }

    _resolvePreviewSize(preview) {
        const sceneDef = SodaRegistry.get(preview.scene);
        const sa = sceneDef ? (sceneDef.sceneAttrs || {}) : {};
        const w = Number(preview.width) || Number(sa['design-width']) || Number(this.journey.width) || 393;
        const h = Number(preview.height) || Number(sa['design-height']) || Number(this.journey.height) || 760;
        return { w, h };
    }

    _renderCanvasMode() {
        const canvas = document.createElement('div');
        canvas.className = 'soda-journey-canvas';

        const world = document.createElement('div');
        world.className = 'soda-journey-canvas-world';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'soda-journey-segue-svg');
        svg.innerHTML = `<defs><marker id="soda-segue-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/></marker><marker id="soda-segue-arrow-ov" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#a78bfa"/></marker></defs><g class="soda-segue-edges"></g>`;
        world.appendChild(svg);

        this._canvasCards = new Map();
        const previews = this.journey.previews || [];
        let maxX = 1200, maxY = 900;

        for (let i = 0; i < previews.length; i++) {
            const p = previews[i];
            const { w, h } = this._resolvePreviewSize(p);
            if (!Number.isFinite(p.x)) p.x = 64 + (i % 3) * (w + 110);
            if (!Number.isFinite(p.y)) p.y = 64 + Math.floor(i / 3) * (h + 120);
            if (p.x + w + 120 > maxX) maxX = p.x + w + 120;
            if (p.y + h + 120 > maxY) maxY = p.y + h + 120;

            const card = document.createElement('div');
            card.className = 'soda-canvas-preview-card' + (p.id === this.selectedPreviewId ? ' is-selected' : '');
            card.dataset.previewId = p.id;
            card.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;

            const head = document.createElement('div');
            head.className = 'soda-canvas-preview-head';
            const titleSpan = document.createElement('span');
            titleSpan.textContent = p.label || p.id;
            const badges = document.createElement('div');
            badges.className = 'soda-canvas-preview-badges';

            if (p.id === this.initialPreviewId) {
                const startBadge = document.createElement('span');
                startBadge.className = 'soda-canvas-preview-badge';
                startBadge.textContent = 'START';
                badges.appendChild(startBadge);
            }
            if (p.role === 'overlay') {
                const ovBadge = document.createElement('span');
                ovBadge.className = 'soda-canvas-preview-badge is-overlay';
                ovBadge.textContent = p.overlay || 'overlay';
                badges.appendChild(ovBadge);
            }
            head.appendChild(titleSpan);
            head.appendChild(badges);

            const frame = document.createElement('div');
            frame.className = 'soda-canvas-preview-frame';
            frame.style.width = `${w}px`;
            frame.style.height = `${h}px`;

            const content = document.createElement('div');
            content.className = 'soda-canvas-preview-content';
            content.appendChild(this._createPreviewSceneElement(p));
            frame.appendChild(content);

            card.appendChild(head);
            card.appendChild(frame);
            world.appendChild(card);

            const entry = { preview: p, card, content, w, h };
            this._canvasCards.set(p.id, entry);

            // Selección + Drag & Drop libre en el lienzo (GPU translate3d)
            card.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                this.selectPreview(p.id);
                const startClientX = e.clientX;
                const startClientY = e.clientY;
                const origX = p.x;
                const origY = p.y;
                let moved = false;
                let rafId = 0;

                card.classList.add('is-dragging');
                if (card.setPointerCapture) card.setPointerCapture(e.pointerId);

                const onMove = (me) => {
                    const dx = me.clientX - startClientX;
                    const dy = me.clientY - startClientY;
                    if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
                    moved = true;
                    p.x = Math.max(0, Math.round(origX + dx));
                    p.y = Math.max(0, Math.round(origY + dy));
                    card.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
                    if (!rafId) {
                        rafId = requestAnimationFrame(() => {
                            rafId = 0;
                            this._drawCanvasSegues(svg);
                        });
                    }
                };
                const onUp = () => {
                    card.classList.remove('is-dragging');
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    if (moved) {
                        this._drawCanvasSegues(svg);
                        this.host.dispatchEvent(new CustomEvent('soda-preview-move', {
                            bubbles: true,
                            composed: true,
                            detail: { journey: this.journey.name, previewId: p.id, x: p.x, y: p.y }
                        }));
                    }
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
            });
        }

        world.style.width = `${maxX}px`;
        world.style.height = `${maxY}px`;
        this._drawCanvasSegues(svg);

        canvas.appendChild(world);
        this.host.replaceChildren(canvas);
        this._stageEl = canvas;
    }

    _drawCanvasSegues(svg) {
        const g = svg.querySelector('.soda-segue-edges');
        if (!g || !this._canvasCards) return;
        const segues = this.journey.segues || [];
        let markup = '';
        for (let i = 0; i < segues.length; i++) {
            const sg = segues[i];
            if (!sg.from || !sg.to) continue;
            const src = this._canvasCards.get(sg.from);
            const dst = this._canvasCards.get(sg.to);
            if (!src || !dst) continue;

            const isOv = dst.preview.role === 'overlay' || !!sg.overlay;
            const headOffset = 28;
            const srcCx = src.preview.x + src.w * 0.5;
            const dstCx = dst.preview.x + dst.w * 0.5;
            const goRight = dstCx >= srcCx;

            const x1 = goRight ? (src.preview.x + src.w) : src.preview.x;
            const y1 = src.preview.y + headOffset + src.h * 0.35 + (i % 4) * 18;
            const x2 = goRight ? dst.preview.x : (dst.preview.x + dst.w);
            const y2 = dst.preview.y + headOffset + dst.h * 0.35;
            const bend = Math.max(60, Math.abs(x2 - x1) * 0.42);
            const cx1 = goRight ? x1 + bend : x1 - bend;
            const cx2 = goRight ? x2 - bend : x2 + bend;
            const mx = (x1 + x2) * 0.5;
            const my = (y1 + y2) * 0.5 - 6;

            markup += `<path class="soda-journey-segue-path${isOv ? ' is-overlay' : ''}" d="M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}" marker-end="url(#${isOv ? 'soda-segue-arrow-ov' : 'soda-segue-arrow'})" />`;
            if (sg.on) {
                markup += `<text class="soda-journey-segue-label" x="${mx}" y="${my}" text-anchor="middle">${escapeHtml(sg.on)}</text>`;
            }
        }
        g.innerHTML = markup;
    }
}

class SodaJourneyElement extends HTMLElement {
    static get observedAttributes() {
        return ['mode', 'initial-preview'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal || !this._journeyController) return;
        if (name === 'mode') {
            this._journeyController.setMode(newVal || 'play');
        } else if (name === 'initial-preview' && newVal) {
            this._journeyController.goToPreview(newVal, { replace: true });
        }
    }

    disconnectedCallback() {
        if (this._journeyController) {
            this._journeyController.destroy();
            this._journeyController = null;
        }
    }

    static mountIntoHost(hostEl, journeyDef) {
        if (!hostEl || !journeyDef) return null;
        if (hostEl._journeyController) hostEl._journeyController.destroy();
        hostEl._journeyController = new SodaJourneyController(hostEl, journeyDef);
        return hostEl._journeyController;
    }

    static defineDynamic(tagName) {
        const normalized = (tagName || '').toLowerCase();
        if (!normalized || !normalized.includes('-') || customElements.get(normalized)) return;
        customElements.define(normalized, class extends SodaJourneyElement {});
    }

    async connectedCallback() {
        ensureSodaBaseStyles();
        const src = this.getAttribute('src');
        const explicitName = this.getAttribute('name');
        const tagName = this.tagName.toLowerCase();
        const targetJourneyName = explicitName || (tagName !== 'soda-journey' ? tagName : '');

        if (src && (!targetJourneyName || !SodaRegistry.hasJourney(targetJourneyName))) {
            try {
                await SodaLoader.load(src);
            } catch (e) {
                console.warn('[SODA] Error cargando journey desde src:', src, e);
            }
        }

        const jDef = (targetJourneyName && SodaRegistry.getJourney(targetJourneyName)) || SodaRegistry.getFirstJourney();
        if (jDef) {
            SodaJourneyElement.mountIntoHost(this, jDef);
        }
    }
}

if (typeof customElements !== 'undefined' && !customElements.get('soda-journey')) {
    customElements.define('soda-journey', SodaJourneyElement);
}

// =============================================================================
// 8. CARGADOR DECLARATIVO UNIVERSAL (SodaLoader — 1-PASS DFS CON PODA)
// =============================================================================
class SodaLoader {
    static _loadCache = new Map();

    static async load(url, deferCssApply = false) {
        const base = (typeof window !== 'undefined' && window.location) ? window.location.href : 'http://localhost/';
        const absoluteUrl = new URL(url, base).href;
        let pending = this._loadCache.get(absoluteUrl);
        if (!pending) {
            pending = (async () => {
                const res = await fetch(absoluteUrl);
                if (!res.ok) throw new Error(`[SODA] Error cargando: ${absoluteUrl}`);
                const text = await res.text();
                return this.loadXml(text, absoluteUrl, deferCssApply);
            })();
            this._loadCache.set(absoluteUrl, pending);
            pending.catch(() => this._loadCache.delete(absoluteUrl));
        }
        const result = await pending;
        if (!deferCssApply && (!SodaTheme._stylesApplied || SodaTheme._dirty)) {
            SodaTheme.applyCssVariables();
        }
        return result;
    }

    static _parseComponentNode(comp) {
        const name = comp.getAttribute('name');
        if (!name) return null;

        const props = {};
        const events = [];
        let layoutNode = null;
        let statesNode = null;

        let child = comp.firstElementChild;
        while (child) {
            const tag = child.tagName.toLowerCase();
            if (tag === 'props') {
                let p = child.firstElementChild;
                while (p) {
                    if (p.tagName.toLowerCase() === 'prop') {
                        const pName = p.getAttribute('name');
                        if (pName) {
                            props[pName] = {
                                type: p.getAttribute('type') || 'text',
                                default: p.getAttribute('default') || ''
                            };
                        }
                    }
                    p = p.nextElementSibling;
                }
            } else if (tag === 'events') {
                let ev = child.firstElementChild;
                while (ev) {
                    if (ev.tagName.toLowerCase() === 'event') {
                        const evName = ev.getAttribute('name');
                        if (evName) events.push(evName);
                    }
                    ev = ev.nextElementSibling;
                }
            } else if (tag === 'layout' || (tag === 'template' && !layoutNode)) {
                layoutNode = child;
            } else if (tag === 'states') {
                statesNode = child;
            }
            child = child.nextElementSibling;
        }

        const layoutAttrs = {};
        let template = '';
        if (layoutNode) {
            for (let i = 0; i < layoutNode.attributes.length; i++) {
                const a = layoutNode.attributes[i];
                layoutAttrs[a.name] = a.value;
            }
            template = layoutNode.innerHTML ? layoutNode.innerHTML.trim() : '';
        }

        const sceneAttrs = {};
        for (let i = 0; i < comp.attributes.length; i++) {
            const a = comp.attributes[i];
            sceneAttrs[a.name] = a.value;
        }

        return {
            name,
            role: comp.getAttribute('role') || comp.getAttribute('type') || '',
            props,
            events,
            template,
            layoutAttrs,
            statesNode,
            target: comp.getAttribute('target') || '',
            sceneAttrs
        };
    }

    static _parseJourneyNode(jEl) {
        const jName = attrAny(jEl, ['name', 'id']);
        if (!jName) return null;

        const previews = [];
        const segues = [];

        let child = jEl.firstElementChild;
        while (child) {
            const tag = child.tagName.toLowerCase();
            if (tag === 'preview') {
                const id = attrAny(child, ['id', 'name']);
                if (id) {
                    const props = {};
                    let propEl = child.firstElementChild;
                    while (propEl) {
                        const pt = propEl.tagName.toLowerCase();
                        if (pt === 'prop' || pt === 'set-prop') {
                            const k = attrAny(propEl, ['name', 'target', 'prop']);
                            if (k) props[k] = propEl.getAttribute('value') ?? '';
                        }
                        propEl = propEl.nextElementSibling;
                    }
                    const rawX = child.getAttribute('x');
                    const rawY = child.getAttribute('y');
                    previews.push({
                        id,
                        label: attrAny(child, ['label', 'title'], id),
                        scene: attrAny(child, ['scene', 'view', 'component']),
                        role: attrAny(child, ['role'], 'screen').toLowerCase(),
                        overlay: attrAny(child, ['overlay', 'presentation']),
                        backdrop: child.getAttribute('backdrop') !== 'false',
                        dismissOnBackdrop: child.getAttribute('dismiss-on-backdrop') !== 'false',
                        breakpoint: attrAny(child, ['breakpoint']),
                        orientation: attrAny(child, ['orientation']),
                        x: rawX !== null && rawX !== '' ? parseFloat(rawX) : NaN,
                        y: rawY !== null && rawY !== '' ? parseFloat(rawY) : NaN,
                        width: parseFloat(child.getAttribute('width') || '') || 0,
                        height: parseFloat(child.getAttribute('height') || '') || 0,
                        props
                    });
                }
            } else if (tag === 'segue') {
                const on = attrAny(child, ['on', 'event', 'trigger']);
                if (on) {
                    segues.push({
                        from: attrAny(child, ['from', 'source'], '*'),
                        on,
                        to: attrAny(child, ['to', 'go-to-preview', 'preview']),
                        action: attrAny(child, ['action']),
                        overlay: attrAny(child, ['overlay', 'presentation']),
                        toast: attrAny(child, ['toast'])
                    });
                }
            }
            child = child.nextElementSibling;
        }

        return {
            name: jName,
            title: attrAny(jEl, ['title'], jName),
            initialPreview: attrAny(jEl, ['initial-preview', 'initialPreview']),
            width: parseFloat(jEl.getAttribute('width') || '') || 0,
            height: parseFloat(jEl.getAttribute('height') || '') || 0,
            description: attrAny(jEl, ['description']),
            previews,
            segues
        };
    }

    static async loadXml(xmlText, baseUri, deferCssApply = false) {
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
        const root = doc.documentElement;
        if (!root) return [];

        const useSrcs = [];
        const componentNodes = [];
        const journeyNodes = [];

        // Recorrido único DFS con poda sobre <soda>
        walkElements(root, (el) => {
            const tag = el.tagName.toLowerCase();
            if (tag === 'index') return false;
            if (tag === 'style-defs' || tag === 'styles') {
                SodaTheme.parseStyleDefs(el, true);
                return false;
            }
            if (tag === 'icon-defs') {
                UIIcon.parseIconDefs(el);
                return false;
            }
            if (tag === 'data-mocks') {
                let colEl = el.firstElementChild;
                while (colEl) {
                    const colName = colEl.tagName.toLowerCase();
                    const items = [];
                    let itemEl = colEl.firstElementChild;
                    while (itemEl) {
                        if (itemEl.tagName.toLowerCase() === 'item') {
                            const obj = {};
                            for (let i = 0; i < itemEl.attributes.length; i++) {
                                obj[itemEl.attributes[i].name] = itemEl.attributes[i].value;
                            }
                            items.push(obj);
                        }
                        itemEl = itemEl.nextElementSibling;
                    }
                    SodaRegistry.registerMock(colName, items);
                    colEl = colEl.nextElementSibling;
                }
                return false;
            }
            if (tag === 'use') {
                const src = el.getAttribute('src');
                if (src) useSrcs.push(src);
                return false;
            }
            if (tag === 'component' || tag === 'scene') {
                componentNodes.push(el);
                return false; // Poda: no descender a <layout>
            }
            if (tag === 'journey') {
                journeyNodes.push(el);
                return false;
            }
            // Descender en contenedores (<group>, <components>, <scenes>, <journeys>, <references>)
            return true;
        });

        // Resolver dependencias <use> en paralelo
        if (useSrcs.length > 0 && baseUri) {
            await Promise.all(useSrcs.map(async (src) => {
                try {
                    await this.load(new URL(src, baseUri).href, true);
                } catch (e) {
                    console.warn('[SODA] Dependencia no resuelta:', src);
                }
            }));
        }

        if (!deferCssApply && (!SodaTheme._stylesApplied || SodaTheme._dirty)) {
            SodaTheme.applyCssVariables();
        }

        const registered = [];
        for (let i = 0; i < componentNodes.length; i++) {
            const def = this._parseComponentNode(componentNodes[i]);
            if (def) {
                SodaRegistry.register(def.name, def);
                SodaComponent.defineDynamic(def.name);
                registered.push(def);
            }
        }

        for (let i = 0; i < journeyNodes.length; i++) {
            const jDef = this._parseJourneyNode(journeyNodes[i]);
            if (jDef) {
                SodaRegistry.registerJourney(jDef.name, jDef);
                if (jDef.name.includes('-')) {
                    SodaJourneyElement.defineDynamic(jDef.name);
                }
            }
        }

        return registered;
    }
}

// =============================================================================
// 8b. AUTO-DESCUBRIMIENTO DECLARATIVO (<tag src="...soda">)
// =============================================================================
function autoDiscoverSodaComponents() {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll('[src]');
    for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const src = el.getAttribute('src');
        if (src && src.endsWith('.soda')) {
            const tagName = el.tagName.toLowerCase();
            if (!customElements.get(tagName)) {
                if (tagName.startsWith('journey-')) SodaJourneyElement.defineDynamic(tagName);
                else SodaComponent.defineDynamic(tagName);
            }
        }
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoDiscoverSodaComponents);
    } else {
        autoDiscoverSodaComponents();
    }
}

// =============================================================================
// 9. MOTOR DE PAGINACIÓN SODA-PDF (MEDICIÓN BATCHED EN 1 STAGE)
// =============================================================================
const SodaPdfPaginator = {
    _padPx(padAttr, fallback = 36) {
        if (!padAttr && padAttr !== 0) return fallback;
        const raw = String(padAttr).trim().toLowerCase();
        const map = { 'none': 0, '0': 0, 'xs': 8, 'sm': 16, 'md': 24, 'lg': 36, 'xl': 48, '2xl': 64 };
        if (map[raw] !== undefined) return map[raw];
        const n = parseFloat(raw);
        if (isNaN(n)) return fallback;
        if (raw.endsWith('mm')) return n * 3.7795;
        if (raw.endsWith('cm')) return n * 37.795;
        if (raw.endsWith('in')) return n * 96;
        return n;
    },

    _resolveMargins(opts = {}) {
        const base = this._padPx(opts.margin || opts.padding || 'lg', 36);
        const mx = opts.marginX !== undefined ? this._padPx(opts.marginX, base) : base;
        const my = opts.marginY !== undefined ? this._padPx(opts.marginY, base) : base;
        return {
            top: opts.marginTop !== undefined ? this._padPx(opts.marginTop, my) : my,
            right: opts.marginRight !== undefined ? this._padPx(opts.marginRight, mx) : mx,
            bottom: opts.marginBottom !== undefined ? this._padPx(opts.marginBottom, my) : my,
            left: opts.marginLeft !== undefined ? this._padPx(opts.marginLeft, mx) : mx
        };
    },

    _pageDimensions(size, orientation) {
        let w = 816, h = 1056;
        const s = (size || 'letter').toLowerCase();
        if (s === 'a4') { w = 794; h = 1123; }
        else if (s === 'legal') { w = 816; h = 1344; }
        const ori = (orientation || 'portrait').toLowerCase();
        return (ori === 'landscape' || ori === 'horizontal') ? { w: h, h: w } : { w, h };
    },

    _collectFlowItems(detailEl) {
        const items = [];
        if (!detailEl) return items;
        let child = detailEl.firstElementChild;
        while (child) {
            if (child.tagName.toLowerCase() === 'ui-repeat') {
                let k = child.firstElementChild;
                let pushed = false;
                while (k) {
                    if (!k.hasAttribute('data-soda-template')) {
                        items.push(k);
                        pushed = true;
                    }
                    k = k.nextElementSibling;
                }
                if (!pushed) items.push(child);
            } else {
                items.push(child);
            }
            child = child.nextElementSibling;
        }
        return items;
    },

    /** Mide todos los elementos en un único stage offscreen (1 solo reflow en lugar de N). */
    _measureBatch(elements, contentWidth) {
        const heights = new Map();
        const stage = document.createElement('div');
        stage.style.cssText = `position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;width:${contentWidth}px;display:flex;flex-direction:column;`;
        const clones = [];
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (!el) continue;
            const clone = el.cloneNode(true);
            stage.appendChild(clone);
            clones.push([el, clone]);
        }
        document.body.appendChild(stage);
        for (let i = 0; i < clones.length; i++) {
            const [orig, clone] = clones[i];
            heights.set(orig, clone.getBoundingClientRect().height || clone.offsetHeight || 0);
        }
        document.body.removeChild(stage);
        return heights;
    },

    _replacePageVars(rootEl, pageNum, totalPages) {
        const replaceInStr = (str) => String(str || '')
            .replace(/\$\{_page\}/g, String(pageNum))
            .replace(/\$\{_totalPages\}/g, String(totalPages))
            .replace(/@\{_pagina\}/g, String(pageNum))
            .replace(/@\{_totalPaginas\}/g, String(totalPages));

        walkElements(rootEl, (el) => {
            const tag = el.tagName;
            if (tag === 'UI-TEXT' || tag === 'UI-SPAN') {
                const raw = el.getAttribute('text');
                if (raw && (raw.includes('${_page}') || raw.includes('${_totalPages}') || raw.includes('@{_pagina}') || raw.includes('@{_totalPaginas}'))) {
                    const resolved = replaceInStr(raw);
                    el.setAttribute('text', resolved);
                    el.textContent = resolved;
                }
                return false;
            }
            return true;
        });
    },

    paginate(rootContainer, opts = {}) {
        if (!rootContainer) return { pageCount: 0 };
        const rh = rootContainer.querySelector('report-header');
        const ph = rootContainer.querySelector('page-header');
        const dt = rootContainer.querySelector('report-detail, detail');
        const pf = rootContainer.querySelector('page-footer');
        const rf = rootContainer.querySelector('report-footer');

        if (!rh && !ph && !dt && !pf && !rf) {
            const existingPages = Array.from(rootContainer.querySelectorAll('ui-page'));
            existingPages.forEach((p, idx) => this._replacePageVars(p, idx + 1, existingPages.length));
            return { pageCount: existingPages.length };
        }

        if (rootContainer.__sodaBandSnapshot === undefined) {
            rootContainer.__sodaBandSnapshot = rootContainer.innerHTML;
        }

        const dim = this._pageDimensions(opts.pageSize || 'letter', opts.orientation || 'portrait');
        const margins = this._resolveMargins(opts);
        const contentW = Math.max(100, dim.w - margins.left - margins.right);

        const flowItems = this._collectFlowItems(dt);
        const toMeasure = [];
        if (rh) toMeasure.push(rh);
        if (ph) toMeasure.push(ph);
        if (pf) toMeasure.push(pf);
        if (rf) toMeasure.push(rf);
        for (let i = 0; i < flowItems.length; i++) {
            if (flowItems[i].tagName.toLowerCase() !== 'ui-page-break') {
                toMeasure.push(flowItems[i]);
            }
        }

        const heightMap = this._measureBatch(toMeasure, contentW);
        const rhH = rh ? (heightMap.get(rh) || 0) : 0;
        const phH = ph ? (heightMap.get(ph) || 0) : 0;
        const pfH = pf ? (heightMap.get(pf) || 0) : 0;
        const rfH = rf ? (heightMap.get(rf) || 0) : 0;

        const pagesSpec = [];
        const baseAvail = Math.max(80, dim.h - margins.top - margins.bottom - phH - pfH - 16);
        let currentItems = [];
        let usedH = rhH;

        for (let i = 0; i < flowItems.length; i++) {
            const item = flowItems[i];
            if (item.tagName.toLowerCase() === 'ui-page-break') {
                pagesSpec.push({ isFirst: pagesSpec.length === 0, items: currentItems, hasReportFooter: false });
                currentItems = [];
                usedH = 0;
                continue;
            }
            const h = heightMap.get(item) || 0;
            if (currentItems.length > 0 && (usedH + h > baseAvail)) {
                pagesSpec.push({ isFirst: pagesSpec.length === 0, items: currentItems, hasReportFooter: false });
                currentItems = [item];
                usedH = h;
            } else {
                currentItems.push(item);
                usedH += h;
            }
        }

        if (pagesSpec.length === 0 || currentItems.length > 0) {
            pagesSpec.push({ isFirst: pagesSpec.length === 0, items: currentItems, hasReportFooter: false });
        }

        if (rf) {
            if (usedH + rfH <= baseAvail) {
                pagesSpec[pagesSpec.length - 1].hasReportFooter = true;
            } else {
                pagesSpec.push({ isFirst: false, items: [], hasReportFooter: true });
            }
        }

        const totalPages = pagesSpec.length;
        const wrapper = document.createElement('div');
        wrapper.className = 'soda-pdf-paginated-preview';
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:24px;width:100%;padding:16px 0;';

        for (let idx = 0; idx < pagesSpec.length; idx++) {
            const spec = pagesSpec[idx];
            const pageEl = document.createElement('ui-page');
            pageEl.setAttribute('size', opts.pageSize || 'letter');
            pageEl.setAttribute('orientation', opts.orientation || 'portrait');
            pageEl.setAttribute('data-theme', 'light');
            pageEl.style.cssText = `background-color:#ffffff;color:#0f172a;padding:${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;display:flex;flex-direction:column;justify-content:flex-start;box-sizing:border-box;overflow:hidden;`;

            if (spec.isFirst && rh) {
                const c = rh.cloneNode(true);
                c.removeAttribute('data-soda-band');
                pageEl.appendChild(c);
            }
            if (ph) {
                const c = ph.cloneNode(true);
                c.removeAttribute('data-soda-band');
                pageEl.appendChild(c);
            }

            const bodyDiv = document.createElement('div');
            bodyDiv.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;width:100%;gap:8px;';
            for (let j = 0; j < spec.items.length; j++) {
                bodyDiv.appendChild(spec.items[j].cloneNode(true));
            }
            if (spec.hasReportFooter && rf) {
                const c = rf.cloneNode(true);
                c.removeAttribute('data-soda-band');
                bodyDiv.appendChild(c);
            }
            pageEl.appendChild(bodyDiv);

            if (pf) {
                const c = pf.cloneNode(true);
                c.removeAttribute('data-soda-band');
                c.style.marginTop = 'auto';
                pageEl.appendChild(c);
            }

            this._replacePageVars(pageEl, idx + 1, totalPages);
            wrapper.appendChild(pageEl);
        }

        rootContainer.replaceChildren(wrapper);
        rootContainer.setAttribute('data-pdf-paginated', 'true');
        return { pageCount: totalPages };
    },

    unpaginate(rootContainer) {
        if (!rootContainer) return;
        if (rootContainer.__sodaBandSnapshot !== undefined) {
            rootContainer.innerHTML = rootContainer.__sodaBandSnapshot;
            delete rootContainer.__sodaBandSnapshot;
        }
        rootContainer.removeAttribute('data-pdf-paginated');
    }
};

// =============================================================================
// 10. EXPOSICIÓN GLOBAL
// =============================================================================
if (typeof window !== 'undefined') {
    window.SodaTheme = SodaTheme;
    window.SodaRegistry = SodaRegistry;
    window.SodaComponent = SodaComponent;
    window.SodaStateEngine = SodaStateEngine;
    window.SodaJourneyElement = SodaJourneyElement;
    window.SodaJourneyController = SodaJourneyController;
    window.SodaLoader = SodaLoader;
    window.SodaPdfPaginator = SodaPdfPaginator;
    window.UIIcon = UIIcon;
    window.UIChart = UIChart;
    window.applySodaStyles = applySodaStyles;
    window.applySodaAttr = applySodaAttr;
    window.walkSodaElements = walkElements;
    window.autoDiscoverSodaComponents = autoDiscoverSodaComponents;
}
