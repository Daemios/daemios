export const cartesian = {
  build(length) {
    const zeros = Array.from({ length }, () => 0);
    return zeros.map(() => zeros.slice());
  },
  iterate(array, callback) {
    array.forEach((row, x) => {
      row.forEach((cell, y) => {
        callback(Number(x), Number(y));
      });
    });
  },
};

export default cartesian;
