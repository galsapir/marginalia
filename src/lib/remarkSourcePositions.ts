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

          // Content boundaries exclude syntax markers (e.g., ** for bold).
          // Derived from children positions in the AST.
          if (node.children.length > 0) {
            let contentStart: number | undefined;
            let contentEnd: number | undefined;
            for (const child of node.children) {
              if (child.position?.start.offset !== undefined) {
                contentStart = child.position.start.offset;
                break;
              }
            }
            for (let i = node.children.length - 1; i >= 0; i--) {
              if (node.children[i].position?.end.offset !== undefined) {
                contentEnd = node.children[i].position!.end.offset;
                break;
              }
            }
            if (contentStart !== undefined && contentEnd !== undefined) {
              node.properties['data-content-start'] = contentStart;
              node.properties['data-content-end'] = contentEnd;
            }
          }
        }
      }
    });
  };
};

export default rehypeSourcePositions;
