/**
 * Browser-compatible implementation of Playwright's _snapshotForAI function chain
 * Extracts a complete TypeScript implementation that can work in a browser environment
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type AriaRole = 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'blockquote' | 'button' | 'caption' | 'cell' | 'checkbox' | 'code' | 'columnheader' | 'combobox' |
  'complementary' | 'contentinfo' | 'definition' | 'deletion' | 'dialog' | 'directory' | 'document' | 'emphasis' | 'feed' | 'figure' | 'form' | 'generic' | 'grid' |
  'gridcell' | 'group' | 'heading' | 'img' | 'insertion' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'mark' | 'marquee' | 'math' | 'meter' | 'menu' |
  'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'navigation' | 'none' | 'note' | 'option' | 'paragraph' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' |
  'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' |
  'spinbutton' | 'status' | 'strong' | 'subscript' | 'superscript' | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'time' | 'timer' |
  'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem';

export type AriaProps = {
  checked?: boolean | 'mixed';
  disabled?: boolean;
  expanded?: boolean;
  active?: boolean;
  level?: number;
  pressed?: boolean | 'mixed';
  selected?: boolean;
};

export type AriaRegex = { pattern: string };

export type AriaTextValue = {
  raw: string;
  normalized: string;
};

export type AriaTemplateTextNode = {
  kind: 'text';
  text: AriaTextValue;
};

export type AriaTemplateRoleNode = AriaProps & {
  kind: 'role';
  role: AriaRole | 'fragment';
  name?: AriaRegex | string;
  children?: AriaTemplateNode[];
  props?: Record<string, AriaTextValue>;
  containerMode?: 'contain' | 'equal' | 'deep-equal';
};

export type AriaTemplateNode = AriaTemplateRoleNode | AriaTemplateTextNode;

export type AriaNode = AriaProps & {
  role: AriaRole | 'fragment' | 'iframe';
  name: string;
  ref?: string;
  children: (AriaNode | string)[];
  element: Element;
  box: Box;
  receivesPointerEvents: boolean;
  props: Record<string, string>;
};

export type AriaSnapshot = {
  root: AriaNode;
  elements: Map<string, Element>;
  refs: Map<Element, string>;
};

export type AriaTreeOptions = {
  mode: 'ai' | 'expect' | 'codegen' | 'autoexpect';
  refPrefix?: string;
};

type Box = {
  visible: boolean;
  inline: boolean;
  rect?: DOMRect;
  cursor?: string;
};

type InternalOptions = {
  visibility: 'aria' | 'ariaOrVisible' | 'ariaAndVisible';
  refs: 'all' | 'interactable' | 'none';
  refPrefix?: string;
  includeGenericRole?: boolean;
  renderCursorPointer?: boolean;
  renderActive?: boolean;
  renderStringsAsRegex?: boolean;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// From stringUtils.ts
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeWhiteSpace(text: string): string {
  return text.replace(/[\u200b\u00ad]/g, '').trim().replace(/\s+/g, ' ');
}

export function longestCommonSubstring(s1: string, s2: string): string {
  const n = s1.length;
  const m = s2.length;
  let maxLen = 0;
  let endingIndex = 0;

  const dp = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;

        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endingIndex = i;
        }
      }
    }
  }

  return s1.substring(endingIndex - maxLen, endingIndex);
}

// From yaml.ts
export function yamlEscapeKeyIfNeeded(str: string): string {
  if (!yamlStringNeedsQuotes(str))
    return str;
  return `'` + str.replace(/'/g, `''`) + `'`;
}

export function yamlEscapeValueIfNeeded(str: string): string {
  if (!yamlStringNeedsQuotes(str))
    return str;
  return '"' + str.replace(/[\\"\x00-\x1f\x7f-\x9f]/g, c => {
    switch (c) {
      case '\\':
        return '\\\\';
      case '"':
        return '\\"';
      case '\b':
        return '\\b';
      case '\f':
        return '\\f';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      default:
        const code = c.charCodeAt(0);
        return '\\x' + code.toString(16).padStart(2, '0');
    }
  }) + '"';
}

function yamlStringNeedsQuotes(str: string): boolean {
  if (str.length === 0)
    return true;

  if (/^\s|\s$/.test(str))
    return true;

  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(str))
    return true;

  if (/^-/.test(str))
    return true;

  if (/[\n:](\s|$)/.test(str))
    return true;

  if (/\s#/.test(str))
    return true;

  if (/[\n\r]/.test(str))
    return true;

  if (/^[&*\],?!>|@"'#%]/.test(str))
    return true;

  if (/[{}`]/.test(str))
    return true;

  if (/^\[/.test(str))
    return true;

  if (!isNaN(Number(str)) || ['y', 'n', 'yes', 'no', 'true', 'false', 'on', 'off', 'null'].includes(str.toLowerCase()))
    return true;

  return false;
}

// From domUtils.ts
export function computeBox(element: Element): Box {
  const style = getElementComputedStyle(element);
  if (!style)
    return { visible: true, inline: false };
  const cursor = style.cursor;
  if (style.display === 'contents') {
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 /* Node.ELEMENT_NODE */ && isElementVisible(child as Element))
        return { visible: true, inline: false, cursor };
      if (child.nodeType === 3 /* Node.TEXT_NODE */ && isVisibleTextNode(child as Text))
        return { visible: true, inline: true, cursor };
    }
    return { visible: false, inline: false, cursor };
  }
  if (!isElementStyleVisibilityVisible(element, style))
    return { cursor, visible: false, inline: false };
  const rect = element.getBoundingClientRect();
  return { rect, cursor, visible: rect.width > 0 && rect.height > 0, inline: style.display === 'inline' };
}

export function isElementVisible(element: Element): boolean {
  return computeBox(element).visible;
}

function isVisibleTextNode(node: Text): boolean {
  const range = node.ownerDocument.createRange();
  range.selectNode(node);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isElementStyleVisibilityVisible(element: Element, style?: CSSStyleDeclaration): boolean {
  style = style ?? getElementComputedStyle(element);
  if (!style)
    return true;

  if (typeof Element.prototype.checkVisibility === 'function') {
    if (!element.checkVisibility())
      return false;
  } else {
    // Fallback for browsers that don't support checkVisibility
    if (style.visibility === 'hidden' || style.visibility === 'collapse')
      return false;
    if (style.display === 'none')
      return false;
    if (style.opacity === '0')
      return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && style.overflow === 'hidden')
    return false;

  return true;
}

function getElementComputedStyle(element: Element, pseudo?: string): CSSStyleDeclaration | undefined {
  const style = element.ownerDocument && element.ownerDocument.defaultView ? element.ownerDocument.defaultView.getComputedStyle(element, pseudo) : undefined;
  return style;
}

function parentElementOrShadowHost(element: Element): Element | undefined {
  if (element.parentElement)
    return element.parentElement;
  if (!element.parentNode)
    return;
  if (element.parentNode.nodeType === 11 /* Node.DOCUMENT_FRAGMENT_NODE */ && (element.parentNode as ShadowRoot).host)
    return (element.parentNode as ShadowRoot).host;
}

// ============================================================================
// ROLE UTILITIES (simplified version for browser compatibility)
// ============================================================================

const kAriaCheckedRoles = ['checkbox', 'menuitemcheckbox', 'option', 'radio', 'switch', 'menuitemradio', 'treeitem'];
const kAriaDisabledRoles = ['button', 'checkbox', 'columnheader', 'combobox', 'gridcell', 'link', 'listbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'rowheader', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab', 'textbox', 'treeitem'];
const kAriaExpandedRoles = ['button', 'checkbox', 'columnheader', 'combobox', 'gridcell', 'link', 'listbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'row', 'rowheader', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab', 'treeitem'];
const kAriaLevelRoles = ['heading', 'listitem', 'row', 'treeitem'];
const kAriaPressedRoles = ['button'];
const kAriaSelectedRoles = ['gridcell', 'option', 'row', 'tab', 'treeitem'];

function getAriaRole(element: Element): AriaRole | null {
  const explicitRole = element.getAttribute('role');
  if (explicitRole)
    return explicitRole as AriaRole;

  const tagName = element.tagName.toLowerCase();

  // Basic role mappings
  switch (tagName) {
    case 'a': return element.hasAttribute('href') ? 'link' : null;
    case 'article': return 'article';
    case 'aside': return 'complementary';
    case 'body': return 'document';
    case 'button': return 'button';
    case 'datalist': return 'listbox';
    case 'dd': return 'definition';
    case 'details': return 'group';
    case 'dialog': return 'dialog';
    case 'dl': return 'list';
    case 'dt': return 'term';
    case 'fieldset': return 'group';
    case 'figure': return 'figure';
    case 'footer': return element.closest('article, aside, main, nav, section') ? null : 'contentinfo';
    case 'form': return 'form';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    case 'header': return element.closest('article, aside, main, nav, section') ? null : 'banner';
    case 'hr': return 'separator';
    case 'img': return element.getAttribute('alt') ? 'img' : null;
    case 'input': {
      const type = element.getAttribute('type') || 'text';
      switch (type) {
        case 'button': case 'submit': case 'reset': case 'image': return 'button';
        case 'checkbox': return 'checkbox';
        case 'radio': return 'radio';
        case 'range': return 'slider';
        case 'number': return 'spinbutton';
        case 'search': return 'searchbox';
        case 'email': case 'tel': case 'text': case 'url': return element.getAttribute('list') ? 'combobox' : 'textbox';
        case 'hidden': return null;
        default: return 'textbox';
      }
    }
    case 'li': return 'listitem';
    case 'main': return 'main';
    case 'menu': return 'list';
    case 'meter': return 'progressbar';
    case 'nav': return 'navigation';
    case 'ol': case 'ul': return 'list';
    case 'optgroup': return 'group';
    case 'option': return 'option';
    case 'output': return 'status';
    case 'progress': return 'progressbar';
    case 'section': return 'region';
    case 'select': return element.hasAttribute('multiple') || parseInt(element.getAttribute('size') || '1') > 1 ? 'listbox' : 'combobox';
    case 'summary': return 'button';
    case 'table': return 'table';
    case 'tbody': return 'rowgroup';
    case 'td': return 'gridcell';
    case 'textarea': return 'textbox';
    case 'tfoot': return 'rowgroup';
    case 'th': return 'columnheader';
    case 'thead': return 'rowgroup';
    case 'tr': return 'row';
    default: return null;
  }
}

function isElementHiddenForAria(element: Element): boolean {
  if (element.getAttribute('aria-hidden') === 'true')
    return true;

  const style = getElementComputedStyle(element);
  if (!style)
    return false;

  if (style.display === 'none')
    return true;

  // Check if element is inside a hidden parent
  let parent = parentElementOrShadowHost(element);
  while (parent) {
    const parentStyle = getElementComputedStyle(parent);
    if (parentStyle?.display === 'none')
      return true;
    parent = parentElementOrShadowHost(parent);
  }

  return false;
}

function getAriaChecked(element: Element): boolean | 'mixed' {
  const checked = element.getAttribute('aria-checked');
  if (checked === 'true') return true;
  if (checked === 'false') return false;
  if (checked === 'mixed') return 'mixed';

  if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
    return element.indeterminate ? 'mixed' : element.checked;
  }

  return false;
}

function getAriaDisabled(element: Element): boolean {
  const disabled = element.getAttribute('aria-disabled');
  if (disabled === 'true') return true;
  if (disabled === 'false') return false;

  if (element instanceof HTMLElement && element.hasAttribute('disabled'))
    return true;

  return false;
}

function getAriaExpanded(element: Element): boolean {
  const expanded = element.getAttribute('aria-expanded');
  if (expanded === 'true') return true;
  if (expanded === 'false') return false;

  if (element instanceof HTMLDetailsElement)
    return element.open;

  return false;
}

function getAriaLevel(element: Element): number | undefined {
  const level = element.getAttribute('aria-level');
  if (level) {
    const parsed = parseInt(level, 10);
    if (!isNaN(parsed)) return parsed;
  }

  if (element.tagName.match(/^h[1-6]$/i)) {
    return parseInt(element.tagName.charAt(1), 10);
  }

  return undefined;
}

function getAriaPressed(element: Element): boolean | 'mixed' {
  const pressed = element.getAttribute('aria-pressed');
  if (pressed === 'true') return true;
  if (pressed === 'false') return false;
  if (pressed === 'mixed') return 'mixed';

  return false;
}

function getAriaSelected(element: Element): boolean {
  const selected = element.getAttribute('aria-selected');
  if (selected === 'true') return true;
  if (selected === 'false') return false;

  if (element instanceof HTMLOptionElement)
    return element.selected;

  return false;
}

function getElementAccessibleName(element: Element, _includeHidden: boolean): string {
  // Simplified implementation - in a real browser environment,
  // this would need to follow the full WAI-ARIA accessible name computation
  if (element.getAttribute('aria-label'))
    return element.getAttribute('aria-label')!;

  if (element.getAttribute('aria-labelledby')) {
    const ids = element.getAttribute('aria-labelledby')!.split(/\s+/);
    const labels = ids.map(id => {
      const labelElement = element.ownerDocument.getElementById(id);
      return labelElement?.textContent || '';
    }).filter(Boolean);
    if (labels.length > 0)
      return labels.join(' ');
  }

  if (element instanceof HTMLInputElement && element.type === 'image' && element.alt)
    return element.alt;

  if (element instanceof HTMLImageElement && element.alt)
    return element.alt;

  if (element instanceof HTMLAreaElement && element.alt)
    return element.alt;

  // For form controls, use labels
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement) {
    const labels = element.ownerDocument.querySelectorAll(`label[for="${element.id}"]`);
    if (labels.length > 0) {
      return Array.from(labels).map(label => label.textContent || '').join(' ').trim();
    }
  }

  // Use element text content as fallback
  return element.textContent || '';
}

function receivesPointerEvents(element: Element): boolean {
  const style = getElementComputedStyle(element);
  if (!style) return true;

  return style.pointerEvents !== 'none';
}

function getCSSContent(element: Element, pseudo: string): string {
  const style = getElementComputedStyle(element, pseudo);
  if (!style) return '';

  const content = style.content;
  if (content && content !== 'none' && content !== 'normal') {
    // Remove quotes from content
    return content.replace(/^["']|["']$/g, '');
  }

  return '';
}

// ============================================================================
// ARIA SNAPSHOT IMPLEMENTATION
// ============================================================================

let lastRef = 0;

function toInternalOptions(options: AriaTreeOptions): InternalOptions {
  if (options.mode === 'ai') {
    return {
      visibility: 'ariaOrVisible',
      refs: 'interactable',
      refPrefix: options.refPrefix,
      includeGenericRole: true,
      renderActive: true,
      renderCursorPointer: true,
    };
  }
  if (options.mode === 'autoexpect') {
    return { visibility: 'ariaAndVisible', refs: 'none' };
  }
  if (options.mode === 'codegen') {
    return { visibility: 'aria', refs: 'none', renderStringsAsRegex: true };
  }
  return { visibility: 'aria', refs: 'none' };
}

function computeAriaRef(ariaNode: AriaNode, options: InternalOptions) {
  if (options.refs === 'none')
    return;
  if (options.refs === 'interactable' && (!ariaNode.box.visible || !ariaNode.receivesPointerEvents))
    return;

  let ariaRef: { role: string; name: string; ref: string };
  const existingRef = (ariaNode.element as any)._ariaRef;
  if (!existingRef || existingRef.role !== ariaNode.role || existingRef.name !== ariaNode.name) {
    ariaRef = { role: ariaNode.role, name: ariaNode.name, ref: (options.refPrefix ?? '') + 'e' + (++lastRef) };
    (ariaNode.element as any)._ariaRef = ariaRef;
  } else {
    ariaRef = existingRef;
  }
  ariaNode.ref = ariaRef.ref;
}

function toAriaNode(element: Element, options: InternalOptions): AriaNode | null {
  const active = element.ownerDocument.activeElement === element;
  if (element.nodeName === 'IFRAME') {
    const ariaNode: AriaNode = {
      role: 'iframe',
      name: '',
      children: [],
      props: {},
      element,
      box: computeBox(element),
      receivesPointerEvents: true,
      active
    };
    computeAriaRef(ariaNode, options);
    return ariaNode;
  }

  const defaultRole = options.includeGenericRole ? 'generic' : null;
  const role = getAriaRole(element) ?? defaultRole;
  if (!role || role === 'presentation' || role === 'none')
    return null;

  const name = normalizeWhiteSpace(getElementAccessibleName(element, false) || '');
  const receivesPointerEventsFlag = receivesPointerEvents(element);

  const box = computeBox(element);
  if (role === 'generic' && box.inline && element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE)
    return null;

  const result: AriaNode = {
    role,
    name,
    children: [],
    props: {},
    element,
    box,
    receivesPointerEvents: receivesPointerEventsFlag,
    active
  };
  computeAriaRef(result, options);

  if (kAriaCheckedRoles.includes(role))
    result.checked = getAriaChecked(element);

  if (kAriaDisabledRoles.includes(role))
    result.disabled = getAriaDisabled(element);

  if (kAriaExpandedRoles.includes(role))
    result.expanded = getAriaExpanded(element);

  if (kAriaLevelRoles.includes(role))
    result.level = getAriaLevel(element);

  if (kAriaPressedRoles.includes(role))
    result.pressed = getAriaPressed(element);

  if (kAriaSelectedRoles.includes(role))
    result.selected = getAriaSelected(element);

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.type !== 'checkbox' && element.type !== 'radio' && element.type !== 'file')
      result.children = [element.value];
  }

  return result;
}

function normalizeGenericRoles(node: AriaNode) {
  const normalizeChildren = (node: AriaNode) => {
    const result: (AriaNode | string)[] = [];
    for (const child of node.children || []) {
      if (typeof child === 'string') {
        result.push(child);
        continue;
      }
      const normalized = normalizeChildren(child);
      result.push(...normalized);
    }

    const removeSelf = node.role === 'generic' && !node.name && result.length <= 1 && result.every(c => typeof c !== 'string' && !!c.ref);
    if (removeSelf)
      return result;
    node.children = result;
    return [node];
  };

  normalizeChildren(node);
}

function normalizeStringChildren(rootA11yNode: AriaNode) {
  const flushChildren = (buffer: string[], normalizedChildren: (AriaNode | string)[]) => {
    if (!buffer.length)
      return;
    const text = normalizeWhiteSpace(buffer.join(''));
    if (text)
      normalizedChildren.push(text);
    buffer.length = 0;
  };

  const visit = (ariaNode: AriaNode) => {
    const normalizedChildren: (AriaNode | string)[] = [];
    const buffer: string[] = [];
    for (const child of ariaNode.children || []) {
      if (typeof child === 'string') {
        buffer.push(child);
      } else {
        flushChildren(buffer, normalizedChildren);
        visit(child);
        normalizedChildren.push(child);
      }
    }
    flushChildren(buffer, normalizedChildren);
    ariaNode.children = normalizedChildren.length ? normalizedChildren : [];
    if (ariaNode.children.length === 1 && ariaNode.children[0] === ariaNode.name)
      ariaNode.children = [];
  };
  visit(rootA11yNode);
}

function convertToBestGuessRegex(text: string): string {
  const dynamicContent = [
    { regex: /\b[\d,.]+[bkmBKM]+\b/, replacement: '[\\d,.]+[bkmBKM]+' },
    { regex: /\b\d+[hmsp]+\b/, replacement: '\\d+[hmsp]+' },
    { regex: /\b[\d,.]+[hmsp]+\b/, replacement: '[\\d,.]+[hmsp]+' },
    { regex: /\b\d+,\d+\b/, replacement: '\\d+,\\d+' },
    { regex: /\b\d+\.\d{2,}\b/, replacement: '\\d+\\.\\d+' },
    { regex: /\b\d+\.\d+\b/, replacement: '\\d+\\.\\d+' },
    { regex: /\b\d{2,}\b/, replacement: '\\d+' },
  ];

  let pattern = '';
  let lastIndex = 0;

  const combinedRegex = new RegExp(dynamicContent.map(r => '(' + r.regex.source + ')').join('|'), 'g');
  text.replace(combinedRegex, (match, ...args) => {
    const offset = args[args.length - 2];
    const groups = args.slice(0, -2);
    pattern += escapeRegExp(text.slice(lastIndex, offset));
    for (let i = 0; i < groups.length; i++) {
      if (groups[i]) {
        const { replacement } = dynamicContent[i];
        pattern += replacement;
        break;
      }
    }
    lastIndex = offset + match.length;
    return match;
  });
  if (!pattern)
    return text;

  pattern += escapeRegExp(text.slice(lastIndex));
  return String(new RegExp(pattern));
}

function textContributesInfo(node: AriaNode, text: string): boolean {
  if (!text.length)
    return false;

  if (!node.name)
    return true;

  if (node.name.length > text.length)
    return false;

  const substr = (text.length <= 200 && node.name.length <= 200) ? longestCommonSubstring(text, node.name) : '';
  let filtered = text;
  while (substr && filtered.includes(substr))
    filtered = filtered.replace(substr, '');
  return filtered.trim().length / text.length > 0.1;
}

function hasPointerCursor(ariaNode: AriaNode): boolean {
  return ariaNode.box.cursor === 'pointer';
}

function buildByRefMap(root: AriaNode | undefined, map: Map<string, AriaNode> = new Map()): Map<string, AriaNode> {
  if (root?.ref)
    map.set(root.ref, root);
  for (const child of root?.children || []) {
    if (typeof child !== 'string')
      buildByRefMap(child, map);
  }
  return map;
}

function arePropsEqual(a: AriaNode, b: AriaNode): boolean {
  const aKeys = Object.keys(a.props);
  const bKeys = Object.keys(b.props);
  return aKeys.length === bKeys.length && aKeys.every(k => a.props[k] === b.props[k]);
}

export function generateAriaTree(rootElement: Element, publicOptions: AriaTreeOptions): AriaSnapshot {
  const options = toInternalOptions(publicOptions);
  const visited = new Set<Node>();

  const snapshot: AriaSnapshot = {
    root: { role: 'fragment', name: '', children: [], element: rootElement, props: {}, box: computeBox(rootElement), receivesPointerEvents: true },
    elements: new Map<string, Element>(),
    refs: new Map<Element, string>(),
  };

  const visit = (ariaNode: AriaNode, node: Node, parentElementVisible: boolean) => {
    if (visited.has(node))
      return;
    visited.add(node);

    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      if (!parentElementVisible)
        return;

      const text = node.nodeValue;
      if (ariaNode.role !== 'textbox' && text)
        ariaNode.children.push(node.nodeValue || '');
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE)
      return;

    const element = node as Element;
    const isElementVisibleForAria = !isElementHiddenForAria(element);
    let visible = isElementVisibleForAria;
    if (options.visibility === 'ariaOrVisible')
      visible = isElementVisibleForAria || isElementVisible(element);
    if (options.visibility === 'ariaAndVisible')
      visible = isElementVisibleForAria && isElementVisible(element);

    if (options.visibility === 'aria' && !visible)
      return;

    const ariaChildren: Element[] = [];
    if (element.hasAttribute('aria-owns')) {
      const ids = element.getAttribute('aria-owns')!.split(/\s+/);
      for (const id of ids) {
        const ownedElement = rootElement.ownerDocument.getElementById(id);
        if (ownedElement)
          ariaChildren.push(ownedElement);
      }
    }

    const childAriaNode = visible ? toAriaNode(element, options) : null;
    if (childAriaNode) {
      if (childAriaNode.ref) {
        snapshot.elements.set(childAriaNode.ref, element);
        snapshot.refs.set(element, childAriaNode.ref);
      }
      ariaNode.children.push(childAriaNode);
    }
    processElement(childAriaNode || ariaNode, element, ariaChildren, visible);
  };

  function processElement(ariaNode: AriaNode, element: Element, ariaChildren: Element[], parentElementVisible: boolean) {
    const display = getElementComputedStyle(element)?.display || 'inline';
    const treatAsBlock = (display !== 'inline' || element.nodeName === 'BR') ? ' ' : '';
    if (treatAsBlock)
      ariaNode.children.push(treatAsBlock);

    ariaNode.children.push(getCSSContent(element, '::before') || '');
    const assignedNodes = element.nodeName === 'SLOT' ? (element as HTMLSlotElement).assignedNodes() : [];
    if (assignedNodes.length) {
      for (const child of assignedNodes)
        visit(ariaNode, child, parentElementVisible);
    } else {
      for (let child = element.firstChild; child; child = child.nextSibling) {
        if (!(child as Element | Text).assignedSlot)
          visit(ariaNode, child, parentElementVisible);
      }
      if (element.shadowRoot) {
        for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling)
          visit(ariaNode, child, parentElementVisible);
      }
    }

    for (const child of ariaChildren)
      visit(ariaNode, child, parentElementVisible);

    ariaNode.children.push(getCSSContent(element, '::after') || '');

    if (treatAsBlock)
      ariaNode.children.push(treatAsBlock);

    if (ariaNode.children.length === 1 && ariaNode.name === ariaNode.children[0])
      ariaNode.children = [];

    if (ariaNode.role === 'link' && element.hasAttribute('href')) {
      const href = element.getAttribute('href')!;
      ariaNode.props['url'] = href;
    }

    if (ariaNode.role === 'textbox' && element.hasAttribute('placeholder') && element.getAttribute('placeholder') !== ariaNode.name) {
      const placeholder = element.getAttribute('placeholder')!;
      ariaNode.props['placeholder'] = placeholder;
    }
  }

  visit(snapshot.root, rootElement, true);
  normalizeStringChildren(snapshot.root);
  normalizeGenericRoles(snapshot.root);
  return snapshot;
}

export function renderAriaTree(ariaSnapshot: AriaSnapshot, publicOptions: AriaTreeOptions, previous?: AriaSnapshot): string {
  const options = toInternalOptions(publicOptions);
  const lines: string[] = [];
  const includeText = options.renderStringsAsRegex ? textContributesInfo : () => true;
  const renderString = options.renderStringsAsRegex ? convertToBestGuessRegex : (str: string) => str;
  const previousByRef = buildByRefMap(previous?.root);

  const visitText = (text: string, indent: string) => {
    const escaped = yamlEscapeValueIfNeeded(renderString(text));
    if (escaped)
      lines.push(indent + '- text: ' + escaped);
  };

  const createKey = (ariaNode: AriaNode, renderCursorPointer: boolean): string => {
    let key = ariaNode.role;
    if (ariaNode.name && ariaNode.name.length <= 900) {
      const name = renderString(ariaNode.name);
      if (name) {
        const stringifiedName = name.startsWith('/') && name.endsWith('/') ? name : JSON.stringify(name);
        key += ' ' + stringifiedName;
      }
    }
    if (ariaNode.checked === 'mixed')
      key += ` [checked=mixed]`;
    if (ariaNode.checked === true)
      key += ` [checked]`;
    if (ariaNode.disabled)
      key += ` [disabled]`;
    if (ariaNode.expanded)
      key += ` [expanded]`;
    if (ariaNode.active && options.renderActive)
      key += ` [active]`;
    if (ariaNode.level)
      key += ` [level=${ariaNode.level}]`;
    if (ariaNode.pressed === 'mixed')
      key += ` [pressed=mixed]`;
    if (ariaNode.pressed === true)
      key += ` [pressed]`;
    if (ariaNode.selected === true)
      key += ` [selected]`;

    if (ariaNode.ref) {
      key += ` [ref=${ariaNode.ref}]`;
      if (renderCursorPointer && hasPointerCursor(ariaNode))
        key += ' [cursor=pointer]';
    }
    return key;
  };

  const getSingleInlinedTextChild = (ariaNode: AriaNode | undefined): string | undefined => {
    return ariaNode?.children.length === 1 && typeof ariaNode.children[0] === 'string' && !Object.keys(ariaNode.props).length ? ariaNode.children[0] : undefined;
  };

  const visit = (ariaNode: AriaNode, indent: string, renderCursorPointer: boolean, previousNode: AriaNode | undefined): { unchanged: boolean } => {
    if (ariaNode.ref)
      previousNode = previousByRef.get(ariaNode.ref);

    const linesBefore = lines.length;
    const key = createKey(ariaNode, renderCursorPointer);
    const escapedKey = indent + '- ' + yamlEscapeKeyIfNeeded(key);
    const inCursorPointer = renderCursorPointer && !!ariaNode.ref && hasPointerCursor(ariaNode);
    const singleInlinedTextChild = getSingleInlinedTextChild(ariaNode);

    let unchanged = !!previousNode && key === createKey(previousNode, renderCursorPointer) && arePropsEqual(ariaNode, previousNode);

    if (!ariaNode.children.length && !Object.keys(ariaNode.props).length) {
      lines.push(escapedKey);
    } else if (singleInlinedTextChild !== undefined) {
      unchanged = unchanged && getSingleInlinedTextChild(previousNode) === singleInlinedTextChild;

      const shouldInclude = includeText(ariaNode, singleInlinedTextChild);
      if (shouldInclude)
        lines.push(escapedKey + ': ' + yamlEscapeValueIfNeeded(renderString(singleInlinedTextChild)));
      else
        lines.push(escapedKey);
    } else {
      lines.push(escapedKey + ':');
      for (const [name, value] of Object.entries(ariaNode.props))
        lines.push(indent + '  - /' + name + ': ' + yamlEscapeValueIfNeeded(value));

      unchanged = unchanged && previousNode?.children.length === ariaNode.children.length;

      const childIndent = indent + '  ';
      for (let childIndex = 0; childIndex < ariaNode.children.length; childIndex++) {
        const child = ariaNode.children[childIndex];
        if (typeof child === 'string') {
          unchanged = unchanged && previousNode?.children[childIndex] === child;
          if (includeText(ariaNode, child))
            visitText(child, childIndent);
        } else {
          const previousChild = previousNode?.children[childIndex];
          const childResult = visit(child, childIndent, renderCursorPointer && !inCursorPointer, typeof previousChild !== 'string' ? previousChild : undefined);
          unchanged = unchanged && childResult.unchanged;
        }
      }
    }

    if (unchanged && ariaNode.ref) {
      lines.splice(linesBefore);
      lines.push(indent + `- ref=${ariaNode.ref} [unchanged]`);
    }

    return { unchanged };
  };

  const nodesToRender = ariaSnapshot.root.role === 'fragment' ? ariaSnapshot.root.children : [ariaSnapshot.root];
  for (const nodeToRender of nodesToRender) {
    if (typeof nodeToRender === 'string')
      visitText(nodeToRender, '');
    else
      visit(nodeToRender, '', !!options.renderCursorPointer, undefined);
  }
  return lines.join('\n');
}

// ============================================================================
// MAIN SNAPSHOT FOR AI FUNCTION
// ============================================================================

export type TimeoutOptions = {
  timeout?: number;
};

export type SnapshotForAIOptions = TimeoutOptions & {
  track?: string;
  mode?: 'full' | 'incremental';
};

/**
 * Main function that generates an AI-readable snapshot of a DOM element
 * This is the browser-compatible equivalent of Playwright's _snapshotForAI
 */
export function snapshotForAI(rootElement: Element, _options: SnapshotForAIOptions = {}): string {
  const ariaSnapshot = generateAriaTree(rootElement, { mode: 'ai' });
  return renderAriaTree(ariaSnapshot, { mode: 'ai' });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { snapshotForAI as default };
