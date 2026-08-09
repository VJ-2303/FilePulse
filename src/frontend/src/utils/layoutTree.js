export function generateTreeLayout(
  apiTree,
  nodeWidth = 430,
  nodeHeight = 176,
  dx = 540,
  dy = 210,
) {
  const nodes = [];
  const edges = [];

  function measureHeight(node) {
    if (!node.children || node.children.length === 0) return dy;
    let h = 0;
    for (const child of node.children) {
      h += measureHeight(child);
    }
    return Math.max(h, dy);
  }

  function traverse(node, x, y) {
    nodes.push({
      id: node.employee_id,
      data: { ...node, label: node.name },
      position: { x, y: y - nodeHeight / 2 },
      type: "orgNode",
    });

    if (node.children && node.children.length > 0) {
      const totalH = measureHeight(node);
      let currentY = y - totalH / 2;

      for (const child of node.children) {
        const childH = measureHeight(child);
        const childY = currentY + childH / 2;
        traverse(child, x + dx, childY);

        edges.push({
          id: `${node.employee_id}-${child.employee_id}`,
          source: node.employee_id,
          target: child.employee_id,
          type: "smoothstep",
          animated: false,
          style: { stroke: "#64748b", strokeWidth: 3 },
        });

        currentY += childH;
      }
    }
  }
  // hello

  let totalRootHeight = 0;
  for (const root of apiTree) {
    totalRootHeight += measureHeight(root);
  }

  let currentRootY = -totalRootHeight / 2;
  for (const root of apiTree) {
    const rootH = measureHeight(root);
    traverse(root, 40, currentRootY + rootH / 2);
    currentRootY += rootH;
  }

  return { nodes, edges };
}
