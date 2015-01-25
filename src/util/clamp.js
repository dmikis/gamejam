define(function () {
    return function (x, min, max) {
        return Math.max(Math.min(x, max), min);
    };
});
