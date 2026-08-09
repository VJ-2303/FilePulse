export function generateTreeLayout(apiTree, nodeWidth = 480, nodeHeight = 160, dx = 560, dy = 320) {
  const nodes = [];
  const edges = [];

  function measureWidth(node) {
    if (!node.children || node.children.length === 0) return dx;
    let w = 0;
    for (const child of node.children) {
      w += measureWidth(child);
    }
    return Math.max(w, dx);
  }

  function traverse(node, x, y) {
    nodes.push({
      id: node.employee_id,
      data: { ...node, label: node.name },
      position: { x: x - nodeWidth / 2, y },
      type: 'orgNode',
    });

    if (node.children && node.children.length > 0) {
      const totalW = measureWidth(node);
      let currentX = x - totalW / 2;

      for (const child of node.children) {
        const childW = measureWidth(child);
        const childX = currentX + childW / 2;
        traverse(child, childX, y + dy);

        edges.push({
          id: `${node.employee_id}-${child.employee_id}`,
          source: node.employee_id,
          target: child.employee_id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#cbd5e1', strokeWidth: 2 }
        });

        currentX += childW;
      }
    }
  }

  let totalRootWidth = 0;
  for (const root of apiTree) {
    totalRootWidth += measureWidth(root);
  }

  let currentRootX = -totalRootWidth / 2;
  for (const root of apiTree) {
    const rootW = measureWidth(root);
    traverse(root, currentRootX + rootW / 2, 40);
    currentRootX += rootW;
  }

  return { nodes, edges };
}
