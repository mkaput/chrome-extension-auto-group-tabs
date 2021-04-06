import { Colorizer } from "./colorizer/types";

export interface ApplyGroupOptions {
  windowId: number;
  tabIds: number[];

  groupId?: number;

  title?: string;
  color?: chrome.tabGroups.ColorEnum;
}

export interface DI {
  tabsOf(windowId: number): Promise<ReadonlyArray<chrome.tabs.Tab>>;

  tabGroupsOf(windowId: number): Promise<ReadonlyArray<chrome.tabGroups.TabGroup>>;

  applyGroup(options: ApplyGroupOptions): Promise<void>;

  readonly colorizer: Colorizer;
}

/**
 * Groups ungrouped tabs of given window into groups with common hostname.
 *
 * See `README.md` of this repository for maintained invariants.
 */
export async function groupTabs(
  { windowId }: Pick<chrome.tabs.Tab, "windowId">,
  { applyGroup, tabGroupsOf, tabsOf, colorizer }: DI
): Promise<void> {
  const [tabs, groups] = await Promise.all([tabsOf(windowId), tabGroupsOf(windowId)]);

  const tabsById = new Map();
  for (const tab of tabs) {
    tabsById.set(tab.id, tab);
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

  function groupDominantHost({ id }: chrome.tabGroups.TabGroup): string | null {
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

  for (const group of groups) {
    colorizer.ignore(group.color);
  }

  const results = [];

  for (const [host, tabIds] of toAppend) {
    const groupId = hostGroups.get(host);

    results.push(
      applyGroup({
        tabIds,
        groupId,
        windowId,
      })
    );
  }

  for (const [host, tabIds] of toCreateNew) {
    results.push(
      applyGroup({
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
 */
function tabHost({ pendingUrl, url }: chrome.tabs.Tab): string | null {
  const urlToParse = pendingUrl || url;
  if (!urlToParse) {
    return null;
  }

  const urlObj = new URL(urlToParse);

  if (!/^https?:?$/.test(urlObj.protocol)) {
    return null;
  }

  let { hostname } = urlObj;

  // Strip dangling dot.
  hostname = hostname.replace(/\.$/, "");

  // Strip `www.` prefix.
  //
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
