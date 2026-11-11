/** Add code typography without changing authored text or interpreting HTML. */
export function formatLearningCode(root: HTMLElement): void {
  const blocks = root.matches('p, .hint-text, .mission-feedback') ? [root] : Array.from(root.querySelectorAll<HTMLElement>('p, .hint-text, .mission-feedback'));
  const pattern = /\/(?:[\w.-]+\/)*[\w.-]+|\b(?:beacon\.conf|start\.sh|systemctl (?:status|restart) beacon|journalctl -u beacon|chmod (?:\+x|755)|ls -l|pwd|ls|cd|cat|chmod|systemctl|journalctl|edit)\b/g;
  for (const block of blocks) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('code, pre')) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const value = node.data, fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const match of value.matchAll(pattern)) {
        const start = match.index;
        // Leave sentence punctuation outside the code span.
        const token = match[0].replace(/\.$/, '');
        fragment.append(document.createTextNode(value.slice(cursor, start)));
        const code = document.createElement('code'); code.textContent = token; fragment.append(code);
        cursor = start + token.length;
      }
      if (cursor) { fragment.append(document.createTextNode(value.slice(cursor))); node.replaceWith(fragment); }
    }
  }
}
