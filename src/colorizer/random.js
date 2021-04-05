/** @type {chrome.tabGroups.ColorEnum[]} */
const COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];

export class RandomColorizer {
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
