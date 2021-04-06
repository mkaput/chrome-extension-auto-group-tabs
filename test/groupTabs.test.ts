import { ApplyGroupOptions, groupTabs } from "../core";
import { MockDI, tab } from "./mock";

interface TestCase {
  name: string;
  tabs?: chrome.tabs.Tab[];
  groups?: chrome.tabGroups.TabGroup[];
  expect: Omit<ApplyGroupOptions, "color" | "windowId">[];
}

const testCases: TestCase[] = [
  {
    name: "does not do anything for no tabs",
    expect: [],
  },
  {
    name: "does not do anything for 1 tab",
    tabs: [tab({ url: "http://localhost" })],
    expect: [],
  },
  {
    name: "groups tabs in clean state",
    tabs: [
      tab({ id: 0, url: "http://localhost" }),
      tab({ id: 1, url: "http://localhost" }),
      tab({ id: 2, url: "http://localhost" }),
      tab({ id: 10, url: "https://onet.pl" }),
      tab({ id: 11, url: "https://onet.pl" }),
    ],
    expect: [
      {
        tabIds: [0, 1, 2],
        title: "localhost",
      },
      {
        tabIds: [10, 11],
        title: "onet.pl",
      },
    ],
  },
];

for (const tc of testCases) {
  test(tc.name, async () => {
    const di = new MockDI(tc.tabs ?? [], tc.groups ?? []);
    await groupTabs(di.currentTab, di);
    expect(di.actions).toStrictEqual(
      tc.expect.map((o) => ({
        windowId: di.currentTab.windowId,
        color: di.colorizer.color,
        ...o,
      }))
    );
  });
}
