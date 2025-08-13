export class Rectangle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  contains(x, y) {
    return x >= this.x
      && x <= this.x + this.width
      && y >= this.y
      && y <= this.y + this.height;
  }

  intersects(rectangle) {
    return this.x < rectangle.x + rectangle.width &&
      this.x + this.width > rectangle.x &&
      this.y < rectangle.y + rectangle.height &&
      this.y + this.height > rectangle.y;
  }

  neighbor(rectangle) {
    return this.x === rectangle.x ||
      this.x + this.width === rectangle.x + rectangle.width ||
      this.y === rectangle.y ||
      this.y + this.height === rectangle.y + rectangle.height;
  }
}


export class QuadTree {
  constructor(boundary, capacity) {
    // boundary is a rectangle object with x, y, w, h properties
    // (x, y) is the top left corner of the rectangle
    // (w, h) is the width and height of the rectangle
    // capacity is the maximum number of points that can be stored in the quadtree
    // points is an array of points that are stored in the quadtree
    // divided is a boolean that is true if the quadtree has been subdivided
    // northWest, northEast, southWest, southEast are quadtrees that are subdivided from this quadtree
    // (if divided is true) and contain points that are contained in the corresponding quadrants of this quadtree (if divided is true)
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  insert(point) {
    // if point is not in the quadtree's boundary, return
    if (!this.boundary.contains(point)) {
      return false;
    }

    // if there is space in the quadtree, add the point and return
    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    // if the quadtree is not divided, subdivide it
    if (!this.divided) {
      this.subdivide();
    }

    // insert the point into the quadtree
    if (this.northWest.insert(point)) {
      return true;
    } else if (this.northEast.insert(point)) {
      return true;
    } else if (this.southWest.insert(point)) {
      return true;
    } else if (this.southEast.insert(point)) {
      return true;
    }

    // if the point is not in any of the quadrants, return false
    return false;
  }

  // subdivide the quadtree into four quadrants
  subdivide() {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.w;
    const h = this.boundary.h;

    this.northWest = new QuadTree(new Rectangle(x, y, w / 2, h / 2), this.capacity);
    this.northEast = new QuadTree(new Rectangle(x + w / 2, y, w / 2, h / 2), this.capacity);
    this.southWest = new QuadTree(new Rectangle(x, y + h / 2, w / 2, h / 2), this.capacity);
    this.southEast = new QuadTree(new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2), this.capacity);

    this.divided = true;
  }

  query(range, found) {
    if (!this.boundary.intersects(range)) {
      return;
    }

    for (let i = 0; i < this.points.length; i++) {
      if (range.contains(this.points[i])) { // if range contains point
        found.push(this.points[i]);
      } else { // if range doesn't contain point
        if (this.divided) {
          this.northWest.query(range, found);
          this.northEast.query(range, found);
          this.southWest.query(range, found);
          this.southEast.query(range, found);
        }
      }
    }
  }
}
