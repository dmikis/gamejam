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
    var levelFile = 'res/maps/level0.json';

    function getTileProperties(tilesets, tileGid) {
        var i = 0;

        while (
            i < tilesets.length &&
            tilesets[i].firstgid < tileGid
        ) {
            i += 1;
        }

        return tilesets.tileproperties[tileGid - tilesets[i - 1].firstgid];
    }

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
            var layers = level.layers.map(function (layer) {
                if (layer.type == "objectgroup") {
                    return {
                        getType: function () {
                            return "objectgroup";
                        },

                        objects: layer.objects
                    };
                }

                var l = new TileField(context, 640, 480);
                l.setup({
                    layout: layer.data && layer.data.map(function (i) { return i - 1; }),
                    graphics: imgRes[0].files,
                    graphicsDictionary: imgRes[0].dictionary,
                    tileWidth: level.tilewidth,
                    tileHeight: level.tileheight,
                    width: layer.width,
                    height: layer.height,
                    type: layer.type
                });

                l.flip("horizontal");
                l.rotate("left");

                l.align("h-center", CanvasControl().width, layer.width, 0);
                l.align("v-center", CanvasControl().height, layer.height, 0);

                return l;
            });

            var player = {
                x: 1,
                y: 1,
                img: imgRes[1].files['player.png']
            };

            function render() {
                context.clearRect(0, 0, 640, 480);

                layers.forEach(function (layer, i) {
                    if (i === 1) {
                        var pc = layers[0].getTilePos(player.x, player.y);
                        context.drawImage(player.img, pc.x, pc.y);
                    }
                    if (layer.getType() !== 'objectgroup') {
                        for (var x = 0; x < level.width; ++x) {
                            for (var y = 0; y < level.height; ++y) {
                                layer.draw(x, y);
                            }
                        }
                    }
                });

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
