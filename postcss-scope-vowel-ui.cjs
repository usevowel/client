const selectorParser = require("postcss-selector-parser");

const SCOPE_CLASS = "vowel-ui";
const SCOPE_SELECTOR = `.${SCOPE_CLASS}`;
const ROOT_SELECTORS = new Set([":root", ":host"]);
const SPECIAL_SELECTORS = new Map([
  ["*", [SCOPE_SELECTOR, `${SCOPE_SELECTOR} *`]],
  [":before", [`${SCOPE_SELECTOR}::before`, `${SCOPE_SELECTOR} *::before`]],
  ["::before", [`${SCOPE_SELECTOR}::before`, `${SCOPE_SELECTOR} *::before`]],
  [":after", [`${SCOPE_SELECTOR}::after`, `${SCOPE_SELECTOR} *::after`]],
  ["::after", [`${SCOPE_SELECTOR}::after`, `${SCOPE_SELECTOR} *::after`]],
  [":backdrop", [`${SCOPE_SELECTOR}::backdrop`, `${SCOPE_SELECTOR} *::backdrop`]],
  ["::backdrop", [`${SCOPE_SELECTOR}::backdrop`, `${SCOPE_SELECTOR} *::backdrop`]],
]);

function isInsideKeyframes(rule) {
  let current = rule.parent;

  while (current) {
    if (current.type === "atrule" && /keyframes$/i.test(current.name)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isPseudoElement(node) {
  return (
    node.type === "pseudo" &&
    (
      node.value.startsWith("::") ||
      node.value === ":before" ||
      node.value === ":after" ||
      node.value === ":backdrop"
    )
  );
}

function buildSameElementSelector(selector) {
  return selectorParser((root) => {
    root.each((currentSelector) => {
      const scopeNode = selectorParser.className({ value: SCOPE_CLASS });
      let insertionNode = null;
      let hasCompoundNode = false;

      for (const node of currentSelector.nodes) {
        if (node.type === "combinator") {
          insertionNode = node;
          break;
        }

        hasCompoundNode = true;

        if (isPseudoElement(node)) {
          insertionNode = node;
          break;
        }
      }

      if (!hasCompoundNode) {
        currentSelector.prepend(scopeNode);
        return;
      }

      if (insertionNode) {
        currentSelector.insertBefore(insertionNode, scopeNode);
        return;
      }

      currentSelector.append(scopeNode);
    });
  }).processSync(selector);
}

function scopeSelector(selector) {
  const trimmedSelector = selector.trim();

  if (!trimmedSelector) {
    return [];
  }

  if (trimmedSelector.includes(SCOPE_SELECTOR)) {
    return [selector];
  }

  if (ROOT_SELECTORS.has(trimmedSelector)) {
    return [SCOPE_SELECTOR];
  }

  const specialSelectorMatch = SPECIAL_SELECTORS.get(trimmedSelector);

  if (specialSelectorMatch) {
    return specialSelectorMatch;
  }

  return [
    buildSameElementSelector(selector),
    `${SCOPE_SELECTOR} ${selector}`,
  ];
}

module.exports = () => {
  return {
    postcssPlugin: "postcss-scope-vowel-ui",
    Rule(rule) {
      if (!rule.selector || isInsideKeyframes(rule)) {
        return;
      }

      const selectors = new Set();

      for (const selector of rule.selectors) {
        for (const scopedSelector of scopeSelector(selector)) {
          selectors.add(scopedSelector);
        }
      }

      rule.selectors = Array.from(selectors);
    },
  };
};

module.exports.postcss = true;
