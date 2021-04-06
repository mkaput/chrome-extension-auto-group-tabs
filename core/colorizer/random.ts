import { palette } from "./palette";
import { Colorizer } from "./types";

export class RandomColorizer implements Colorizer {
  private palette: chrome.tabGroups.ColorEnum[] = palette();

  public ignore(color: chrome.tabGroups.ColorEnum): void {
    const idx = this.palette.indexOf(color);
    if (idx >= 0) {
      this.palette.splice(idx, 1);
    }

    if (this.palette.length <= 0) {
      this.palette = palette();
    }
  }

  next(): chrome.tabGroups.ColorEnum {
    const color = sample(this.palette);
    this.ignore(color);
    return color;
  }
}

function sample<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
