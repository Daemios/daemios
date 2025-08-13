const cartesian = {
  build(length) {
    const zeros = Array
      .apply(null, Array(length))
      .map(Number.prototype.valueOf, 0);
    return zeros.map(() => zeros.slice());
  },
  iterate(array, callback) {
    array.forEach((row, x) => {
      row.forEach((cell, y) => {
        callback(Number(x), Number(y));
      });
    });
  },
  inBounds(num, size) {
    if (num < 0) return 0;
    if (num >= size) return size - 1;
    return num;
  },
};

export default cartesian;
