/**
 * PostCSS Plugin: Unwrap Tailwind v4 @layer rules
 *
 * Purpose:
 * - Preserve generated Tailwind utility/theme CSS from this library
 * - Avoid downstream Tailwind v3 builds erroring on `@layer utilities` without
 *   matching `@tailwind utilities` directives
 *
 * Strategy:
 * - Replace every `@layer <name> { ... }` with its child rules in-place
 * - Keep CSS content order intact
 */
module.exports = () => {
  return {
    postcssPlugin: "postcss-strip-layers",
    Once(root) {
      root.walkAtRules("layer", (rule) => {
        if (!rule.nodes || rule.nodes.length === 0) {
          rule.remove();
          return;
        }

        const children = rule.nodes.map((node) => node.clone());
        rule.replaceWith(...children);
      });
    },
  };
};

module.exports.postcss = true;
