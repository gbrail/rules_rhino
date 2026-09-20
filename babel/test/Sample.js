class Point {
    x = 0;
    y = 0;

    static origin = new Point();

    async distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

function makePoints(...coords) {
    return coords.map(([x, y]) => Object.assign({}, { x, y }));
}

module.exports = { Point, makePoints };
