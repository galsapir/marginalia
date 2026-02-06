// ABOUTME: Remark plugin that adds source position data to the hast (HTML AST).
// ABOUTME: Embeds data-source-start and data-source-end attributes so DOM selections can map back to markdown.

import type { Plugin } from 'unified';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * rehype plugin (runs on the HTML AST after remark-rehype) that copies
 * source position info from the markdown AST into data attributes
 * on the rendered HTML elements.
 */
const rehypeSourcePositions: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.position) {
        const start = node.position.start.offset;
        const end = node.position.end.offset;
        if (start !== undefined && end !== undefined) {
          node.properties = node.properties || {};
          node.properties['data-source-start'] = start;
          node.properties['data-source-end'] = end;
        }
      }
    });
  };
};

export default rehypeSourcePositions;
