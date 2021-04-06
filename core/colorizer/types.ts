export interface Colorizer {
  ignore(color: chrome.tabGroups.ColorEnum): void;

  next(): chrome.tabGroups.ColorEnum;
}
