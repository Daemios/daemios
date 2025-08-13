export const cartesian = {
  build(length) {
    const zeros = Array
      .apply(null, Array(length))
      .map(Number.prototype.valueOf, 0);

    return zeros.map(function (i) {
      return zeros.slice();
    });
  },
  iterate(array, callback) {
    array.forEach((row, x) => {
      row.forEach((cell, y) => {
        callback(Number(x), Number(y))
      });
    });
  },
};
export default cartesian;
