define([
    'jsiso/canvas/Control',
    'jsiso/canvas/Input',
    'jsiso/json/load',
    'jsiso/img/load',
    'jsiso/tile/Field',
    'util/clamp',
    'util/pathResolve'
], function (
    CanvasControl,
    InputControl,
    jsonLoad,
    imgLoad,
    TileField,
    clamp,
    pathResolve
) {
    var levelFile = 'res/maps/dmikis.json';

    jsonLoad([levelFile]).then(function (res) {
        var level = res[0];

        console.log(level);

        imgLoad(level.tilesets.map(function (tileset) {
            return {
                graphics: [pathResolve(tileset.image, levelFile)],
                spritesheet: {
                    width: level.tilewidth,
                    height: level.tileheight
                }
            };
        }).concat({
            graphics: ['res/player.png']
        })).then(function (imgRes) {
            console.log(imgRes);
            var context = CanvasControl.create('canvas', 640, 480);
            var map = new TileField(context, 640, 480);
            map.setup({
                layout: level.layers[0].data.map(function (i) { return i - 1; }),
                graphics: imgRes[0].files,
                graphicsDictionary: imgRes[0].dictionary,
                tileWidth: level.tilewidth,
                tileHeight: level.tileheight,
                width: level.layers[0].width,
                height: level.layers[0].height,
                isometric: false
            });
            var objects = new TileField(context, 640, 480);
            objects.setup({
                layout: level.layers[0].data.map(function () { return 15 }),
                tileWidth: level.tilewidth,
                tileHeight: level.tileheight,
                width: level.layers[0].width,
                height: level.layers[0].height,
                isometric: false
            });

            map.flip("horizontal");
            map.rotate("left");

            map.align("h-center", CanvasControl().width, 16, 0);
            map.align("v-center", CanvasControl().height, 16, 0);

            objects.flip("horizontal");
            objects.rotate("left");

            objects.align("h-center", CanvasControl().width, 16, 0);
            objects.align("v-center", CanvasControl().height, 16, 0);

            var player = {
                x: 1,
                y: 1,
                img: imgRes[1].files['player.png']
            };

            function render() {
                context.clearRect(0, 0, 640, 480);

                for (var x = 0; x < level.width; ++x) {
                    for (var y = 0; y < level.height; ++y) {
                        map.draw(x, y);
                    }
                }

                objects.draw(player.x, player.y, player.img);

                requestAnimationFrame(render);
            }

            var input = new InputControl(document, context.canvas);

            input.keyboard(function (key, pressed, e) {
                if (!pressed) {
                    switch (key) {
                        case 38: // arrow up
                            console.log('up');
                            player.y = clamp(player.y - 1, 0, 15);
                            break;
                        case 40: // arrow down
                            console.log('down');
                            player.y = clamp(player.y + 1, 0, 15);
                            break;
                        case 37: // arrow left
                            console.log('left');
                            player.x = clamp(player.x - 1, 0, 15);
                            break;
                        case 39: // arrow right
                            console.log('right');
                            player.x = clamp(player.x + 1, 0, 15);
                            break;
                    }
                }
            });

            render();
        });
    });
});
