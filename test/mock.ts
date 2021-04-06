import { ApplyGroupOptions, DI } from "../core";
import { palette } from "../core/colorizer/palette";
import { Colorizer } from "../core/colorizer/types";

let counter = 0;

function nextId(): number {
  return counter++;
}

export function tab(props: Partial<chrome.tabs.Tab>): chrome.tabs.Tab {
  return {
    id: nextId(),
    active: false,
    autoDiscardable: false,
    discarded: false,
    groupId: -1,
    highlighted: false,
    incognito: false,
    index: 0,
    pinned: false,
    selected: false,
    windowId: 0,
    ...props,
  };
}

export class MockColorizer implements Colorizer {
  public readonly color = palette()[0];

  ignore(_color: chrome.tabGroups.ColorEnum): void {
    return;
  }

  next(): chrome.tabGroups.ColorEnum {
    return this.color;
  }
}

export class MockDI implements DI {
  public readonly actions: ApplyGroupOptions[] = [];

  public readonly colorizer = new MockColorizer();

  public readonly currentTab: chrome.tabs.Tab = tab({ active: true });

  public constructor(
    public readonly tabs: ReadonlyArray<chrome.tabs.Tab>,
    public readonly tabGroups: ReadonlyArray<chrome.tabGroups.TabGroup>
  ) {}

  tabsOf = async (_windowId: number): Promise<ReadonlyArray<chrome.tabs.Tab>> => this.tabs;

  tabGroupsOf = async (_windowId: number): Promise<ReadonlyArray<chrome.tabGroups.TabGroup>> =>
    this.tabGroups;

  applyGroup = async (options: ApplyGroupOptions): Promise<void> => {
    this.actions.push(options);
  };
}
