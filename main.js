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

    function getTileByType(level, type) {
        var tileProps = level.tilesets[0].tileproperties;
        var tile = Object.keys(tileProps).filter(function (tileId) {
            return tileProps[tileId] && tileProps[tileId].type === type;
        })[0];

        return tile && (parseInt(tile, 10));
    }

    function tileIsNotWall(layerId, level, x, y) {
        return level.layers[layerId].data[y * level.width + x] !== getTileByType(level, 'wall') + 1;
    }

    function setPlayerEntryCoords(player, level) {
        var entranceTile = getTileByType(level, 'entrance');

        console.log(entranceTile);

        var entranceTileIdx = level.layers[0].data.indexOf(entranceTile + 1);

        console.log(entranceTileIdx);

        player.x = entranceTileIdx % level.width;
        player.y = (entranceTileIdx / level.width) | 0;
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
                var l = new TileField(context, 640, 480);
                l.setup({
                    layout: layer.data.map(function (i) { return i - 1; }),
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

            setPlayerEntryCoords(player, level);

            function render() {
                context.clearRect(0, 0, 640, 480);

                layers.forEach(function (layer, i) {
                    if (i === 1) {
                        var pc = layers[0].getTilePos(player.x, player.y);
                        context.drawImage(player.img, pc.x, pc.y);
                    }
                    for (var x = 0; x < level.width; ++x) {
                        for (var y = 0; y < level.height; ++y) {
                            if (i >= 1 && layer.getTile(player.x, player.y) >= 0) {
                                if (x === player.x && y === player.y) {
                                    context.globalAlpha = 0.1;
                                } else if (Math.abs(x - player.x) + Math.abs(y - player.y) === 1) {
                                    context.globalAlpha = 0.3;
                                } else if (Math.abs(x - player.x) === 1 && Math.abs(y - player.y) === 1) {
                                    context.globalAlpha = 0.5;
                                }
                            }
                            layer.draw(x, y);
                            context.globalAlpha = 1;
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
                            if (tileIsNotWall(0, level, player.x, clamp(player.y - 1, 0, level.height - 1))) {
                                player.y = clamp(player.y - 1, 0, level.height - 1);
                            }
                            break;
                        case 40: // arrow down
                            if (tileIsNotWall(0, level, player.x, clamp(player.y + 1, 0, level.height - 1))) {
                                player.y = clamp(player.y + 1, 0, level.height - 1);
                            }
                            break;
                        case 37: // arrow left
                            if (tileIsNotWall(0, level, clamp(player.x - 1, 0, level.width - 1), player.y)) {
                                player.x = clamp(player.x - 1, 0, level.width - 1);
                            }
                            break;
                        case 39: // arrow right
                            if (tileIsNotWall(0, level, clamp(player.x + 1, 0, level.width - 1), player.y)) {
                                player.x = clamp(player.x + 1, 0, level.width - 1);
                            }
                            break;
                    }
                }
            });

            render();
        });
    });
});
