// Changes the RGB/HEX temporarily to a HSL-Value, modifies that value
// and changes it back to RGB/HEX.
const cell_colors = {
  hslToHex(h, s, l) {
    let new_l = l/ 100;
    const a = s * Math.min(new_l, 1 - new_l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = new_l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}


export default cell_colors;
