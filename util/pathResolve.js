define(function () {
    return function (file, baseFile) {
        return baseFile.split('/').slice(0, -1).concat(file).join('/');
    };
});
