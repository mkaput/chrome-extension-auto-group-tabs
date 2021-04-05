/**
 * @param {number} windowId
 * @return {Promise<chrome.tabs.Tab[]>}
 */
export function findTabs(windowId) {
  return chrome.tabs.query({ windowId, pinned: false });
}

/**
 * @param {number} windowId
 * @return {Promise<chrome.tabGroups.TabGroup[]>}
 */
export function findExistingTabGroups(windowId) {
  return new Promise((resolve) => {
    chrome.tabGroups.query({ windowId }, resolve);
  });
}

/**
 * @param {number[]} tabIds
 * @param {number | undefined} groupId
 * @param {number} windowId
 * @param {string | undefined} title
 * @param {chrome.tabGroups.ColorEnum | undefined} color
 * @return {Promise<number>}
 */
export async function assignTabsToGroup({ tabIds, groupId, windowId, title, color }) {
  const create = groupId ? { groupId } : { createProperties: { windowId } };

  /** @type {number} */
  const newGroupId = await new Promise((resolve) => {
    chrome.tabs.group({ tabIds, ...create }, resolve);
  });

  if (title || color) {
    await new Promise((resolve) => {
      chrome.tabGroups.update(newGroupId, { title, color }, resolve);
    });
  }

  return newGroupId;
}
