chrome.action.onClicked.addListener(groupTabs);

/**
 * Groups ungrouped tabs of given window into groups with common hostname.
 *
 * See `README.md` of this repository for maintained invariants.
 *
 * @param windowId - ID of window which tabs are to be grouped
 * @return {Promise<void>}
 */
async function groupTabs({ windowId }) {
  const [tabs, groups] = await Promise.all([findTabs(windowId), findExistingTabGroups(windowId)]);

  const tabsById = new Map();
  for (const tab of tabs) {
    tabsById.set(tab.id, tab);
  }

  const groupsById = new Map();
  for (const group of groups) {
    groupsById.set(group.id, group);
  }

  const groupTabs = new Map();
  for (const tab of tabs) {
    if (tab.groupId >= 0) {
      if (!groupTabs.has(tab.groupId)) {
        groupTabs.set(tab.groupId, []);
      }

      groupTabs.get(tab.groupId).push(tab.id);
    }
  }

  /**
   * @param {chrome.tabGroups.TabGroup} group
   * @return {string | null}
   */
  function groupDominantHost({ id }) {
    let total = 0;
    const tabHosts = new Map();
    for (const tabId of groupTabs.get(id) ?? []) {
      const tab = tabsById.get(tabId);
      const host = tabHost(tab);
      if (host) {
        tabHosts.set(host, (tabHosts.get(host) ?? 0) + 1);
        total += 1;
      }
    }

    const threshold = Math.ceil(total / 2);
    for (const [host, count] of tabHosts.entries()) {
      if (count >= threshold) {
        return host;
      }
    }

    return null;
  }

  const hostGroups = new Map();
  for (const group of groups) {
    const host = groupDominantHost(group);
    if (host) {
      hostGroups.set(host, group.id);
    }
  }

  const hostTabsToProcess = new Map();
  for (const tab of tabs) {
    if (!tab.pinned && tab.groupId < 0) {
      const host = tabHost(tab);
      if (host) {
        if (!hostTabsToProcess.has(host)) {
          hostTabsToProcess.set(host, []);
        }

        hostTabsToProcess.get(host).push(tab.id);
      }
    }
  }

  const toAppend = new Map();
  const toCreateNew = new Map();
  for (const [host, tabIds] of hostTabsToProcess.entries()) {
    if (hostGroups.has(host)) {
      toAppend.set(host, tabIds);
    } else if (tabIds.length >= 2) {
      toCreateNew.set(host, tabIds);
    }
  }

  const colorizer = new Colorizer();
  for (const group of groups) {
    colorizer.ignore(group.color);
  }

  const results = [];

  for (const [host, tabIds] of toAppend) {
    const groupId = hostGroups.get(host);

    results.push(
      assignTabsToGroup({
        tabIds,
        groupId,
        windowId,
      })
    );
  }

  for (const [host, tabIds] of toCreateNew) {
    results.push(
      assignTabsToGroup({
        tabIds,
        windowId,
        title: host,
        color: colorizer.next(),
      })
    );
  }

  await Promise.all(results);
}

/**
 * Get `http://` or `https://` tab hostname.
 *
 * - If tab has pending URL, than this function will prefer it.
 * - For non-HTTP tab urls will return `null`.
 * - Strips `www.` prefix.
 * - Stripts dangling dot.
 *
 * @param {chrome.tabs.Tab} tab
 * @return {string | null}
 */
function tabHost({ pendingUrl, url }) {
  let { protocol, hostname } = new URL(pendingUrl || url);

  if (!/^https?:?$/.test(protocol)) {
    return null;
  }

  hostname = hostname.replace(/\.$/, "");

  // Source: https://github.com/sindresorhus/normalize-url/blob/ddf2584bf41487be25ffb21b810b792a078588f4/index.js#L154-L161
  //
  // Each label should be max 63 at length (min: 1).
  // Source: https://en.wikipedia.org/wiki/Hostname#Restrictions_on_valid_host_names
  // Each TLD should be up to 63 characters long (min: 2).
  // It is technically possible to have a single character TLD, but none currently exist.
  if (/^www\.(?!www\.)(?:[a-z\-\d]{1,63})\.(?:[a-z.\-\d]{2,63})$/.test(hostname)) {
    hostname = hostname.replace(/^www\./, "");
  }

  return hostname;
}

/**
 * @param {number} windowId
 * @return {Promise<chrome.tabs.Tab[]>}
 */
function findTabs(windowId) {
  return new Promise((resolve) => {
    chrome.tabs.query({ windowId, pinned: false }, resolve);
  });
}

/**
 * @param {number} windowId
 * @return {Promise<chrome.tabGroups.TabGroup[]>}
 */
function findExistingTabGroups(windowId) {
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
async function assignTabsToGroup({ tabIds, groupId, windowId, title, color }) {
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

/** @type {chrome.tabGroups.ColorEnum[]} */
const COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];

class Colorizer {
  constructor() {
    this.palette = [...COLORS];
  }

  /**
   * @param {chrome.tabGroups.ColorEnum} color
   * @return {void}
   */
  ignore(color) {
    const idx = this.palette.indexOf(color);
    if (idx >= 0) {
      this.palette.splice(idx, 1);
    }

    if (this.palette.length <= 0) {
      this.palette = [...COLORS];
    }
  }

  /**
   * @return {chrome.tabGroups.ColorEnum}
   */
  next() {
    const color = this.palette[Math.floor(Math.random() * this.palette.length)];
    this.ignore(color);
    return color;
  }
}
