import { ApplyGroupOptions, DI, groupTabs } from "../core";
import { RandomColorizer } from "../core/colorizer/random";

const colorizer = new RandomColorizer();

const di: DI = {
  tabsOf,
  tabGroupsOf,
  applyGroup,
  colorizer,
};

chrome.action.onClicked.addListener((currentTab) => groupTabs(currentTab, di));

function tabsOf(windowId: number): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ windowId, pinned: false });
}

function tabGroupsOf(windowId: number): Promise<chrome.tabGroups.TabGroup[]> {
  return new Promise((resolve) => {
    chrome.tabGroups.query({ windowId }, resolve);
  });
}

async function applyGroup({
  tabIds,
  groupId,
  windowId,
  title,
  color,
}: ApplyGroupOptions): Promise<void> {
  const newGroupId: number = await new Promise((resolve) => {
    chrome.tabs.group(
      groupId ? { tabIds, groupId } : { tabIds, createProperties: { windowId } },
      resolve
    );
  });

  if (title || color) {
    await new Promise((resolve) => {
      chrome.tabGroups.update(newGroupId, { title, color }, resolve);
    });
  }
}
