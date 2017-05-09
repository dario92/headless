/**
 * @name getNodeId
 * @desc Get node's id in the DOM
 * @param {object} [DOM]
 * @param {selector} [selector=null]
 * @return {Promise<string>}
 */
export default async function getNodeId(DOM, selector = null) {
  const { root: { nodeId: documentNodeId } } = await DOM.getDocument({ depth: -1 });
  const { nodeId } = await DOM.querySelector({ selector, nodeId: documentNodeId });
  return nodeId;
};
