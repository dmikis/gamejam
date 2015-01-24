define([
    'jsiso/canvas/Control',
    'jsiso/json/load',
    'jsiso/img/load',
    'jsiso/tile/Field'
], function (
    CanvasControl,
    jsonLoad,
    imgLoad,
    TileField
) {
    jsonLoad(['res/map/renat.json']).then(function (res) {
        var level = res[0];
        imgLoad(level.tilesets.map(function (tileset) {
            return {
                graphics: [tileset.image],
                spritesheet: {
                    width: level.tilewidth,
                    height: level.tileheight
                }
            };
        })).then(function (imgRes) {
            var context = CanvasControl.create('canvas', 640, 480);
            var map = new TileField(context, 640, 480);
            map.setup({
                layout: level.layers[0].data.map(function (i) { return i - 1; }),
                graphics: imgRes[0].files,
                graphicsDictionary: imgRes[0].dictionary,
                tileWidth: 16,
                tileHeight: 8,
                width: level.layers[0].width,
                height: level.layers[0].height,
                isometric: true
            });

            map.flip("horizontal");
            map.rotate("left");

            map.align("h-center", CanvasControl().width, 16, 0);
            map.align("v-center", CanvasControl().height, 16, 0);

            context.clearRect(0, 0, 640, 480);

            for (var x = 0; x < 16; ++x) {
                for (var y = 0; y < 16; ++y) {
                    map.draw(x, y);
                }
            }
        });
    });
});
