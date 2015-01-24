define([
    'jsiso/canvas/Control',
    'jsiso/canvas/Input',
    'jsiso/json/load',
    'jsiso/img/load',
    'jsiso/tile/Field',
    'util/clamp',
    'util/pathResolve',
    'chiptune2/chiptune2'
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
    
    var modPlayer;
    
    function loopPlayer() {
        if (modPlayer) {
            modPlayer.stop();
        } else {
            modPlayer = new ChiptuneJsPlayer(new ChiptuneJsConfig(1));
        }
        modPlayer.load('res/music/theme.xm', function(buffer){
            modPlayer.play(buffer);
            modPlayer.togglePause(buffer);
            
            setTimeout(loopPlayer, 1000 * modPlayer.duration());
            modPlayer.play(buffer);
        });
    }
    
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

    function getTilesByType(level, type) {
        var tileProps = level.tilesets[0].tileproperties;
        return Object.keys(tileProps).filter(function (tileId) {
            return tileProps[tileId] && tileProps[tileId].type === type;
        }).map(function (id) {
            return parseInt(id, 10);
        });
    }

    function tileIsNotWall(layerId, level, x, y) {
        return getTilesByType(level, 'wall').indexOf(level.layers[layerId].data[y * level.width + x] - 1) === -1;
    }

    function setPlayerEntryCoords(player, level) {
        var entranceTile = getTilesByType(level, 'entrance')[0];

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
            graphics: ['res/player-top.png', 'res/player-base.png', 'res/player-left.png', 'res/player-right.png']
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
                imgs: [imgRes[1].files['player-base.png'], imgRes[1].files['player-top.png'], imgRes[1].files['player-left.png'], imgRes[1].files['player-right.png']],
                level: 0
            };

            setPlayerEntryCoords(player, level);

            function render() {
                context.clearRect(0, 0, 640, 480);

                layers.forEach(function (layer, i) {
                    if (i === player.level + 1) {
                        var pc = layers[0].getTilePos(player.x, player.y);
                        context.drawImage(player.imgs[0], pc.x, pc.y);
                        context.drawImage(player.imgs[1], pc.x, pc.y - 16);
                        context.drawImage(player.imgs[2], pc.x - 16, pc.y - 8);
                        context.drawImage(player.imgs[3], pc.x + 16, pc.y - 8);
                    }
                    for (var x = 0; x < level.width; ++x) {
                        for (var y = 0; y < level.height; ++y) {
                            if (i > player.level && layer.getTile(player.x, player.y) >= 0) {
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

                if (
                    layers.slice(1).every(function (layer) {
                        return layer.getTile(player.x, player.y) < 0;
                    })
                ) {
                    var pc = layers[0].getTilePos(player.x, player.y);
                    context.drawImage(player.imgs[1], pc.x, pc.y - 16);
                    context.drawImage(player.imgs[2], pc.x - 16, pc.y - 8);
                    context.drawImage(player.imgs[3], pc.x + 16, pc.y - 8);
                }

                requestAnimationFrame(render);
            }

            var input = new InputControl(document, context.canvas);

            input.keyboard(function (key, pressed, e) {
                if (!pressed) {
                    var nextX = player.x, nextY = player.y;
                    switch (key) {
                        case 38: // arrow up
                            nextY = clamp(player.y - 1, 0, level.height - 1);
                            break;
                        case 40: // arrow down
                            nextY = clamp(player.y + 1, 0, level.height - 1);
                            break;
                        case 37: // arrow left
                            nextX = clamp(player.x - 1, 0, level.width - 1);
                            break;
                        case 39: // arrow right
                            nextX = clamp(player.x + 1, 0, level.width - 1);
                            break;
                        case 32: // space
                            if (layers[player.level + 1] && layers[player.level + 1].getTile(nextX, nextY) >= 0) {
                                player.level += 1;
                            }
                            break;
                    }

                    if (
                        tileIsNotWall(player.level, level, nextX, nextY) &&
                        layers[player.level].getTile(nextX, nextY) >= 0
                    ) {
                        player.x = nextX;
                        player.y = nextY;
                    }

                    if (
                        layers[player.level].getTile(player.x, player.y) === getTilesByType(level, 'exit')[0]
                    ) {
                        console.log('exit');
                    }
                }
            });

            if (navigator.getGamepads) {
                var gamepad = navigator.getGamepads()[0];

                function initGamepad(gamepad) {
                    console.log(gamepad);

                    var f = false;
                    setInterval(function () {
                        var nextX = player.x, nextY = player.y;
                        if (f) return;
                        switch ((true)) {
                            case gamepad.buttons[0].pressed:
                                if (layers[player.level + 1] && layers[player.level + 1].getTile(nextX, nextY) >= 0) {
                                    player.level += 1;
                                }
                                break;
                            case gamepad.buttons[1].pressed:
                                console.log(1);
                                break;
                            case gamepad.buttons[2].pressed:
                                console.log(3);
                                break;
                            case gamepad.buttons[3].pressed:
                                console.log(3);
                                break;
                            case gamepad.buttons[4].pressed:
                                console.log(4);
                                break;
                            case gamepad.buttons[5].pressed:
                                console.log(5);
                                break;
                            case gamepad.buttons[6].pressed:
                                console.log(6);
                                break;
                            case gamepad.buttons[7].pressed:
                                console.log(7);
                                break;
                            case gamepad.buttons[8].pressed:
                                console.log(8);
                                break;
                            case gamepad.buttons[9].pressed:
                                console.log(9);
                                break;
                            case gamepad.buttons[10].pressed:
                                console.log(10);
                                break;
                            case gamepad.buttons[11].pressed:
                                console.log(11);
                                nextY = clamp(player.y - 1, 0, level.height - 1);
                                break;
                            case gamepad.buttons[12].pressed:
                                console.log(12);
                                nextY = clamp(player.y + 1, 0, level.height - 1);
                                break;
                            case gamepad.buttons[13].pressed:
                                console.log(13);
                                nextX = clamp(player.x - 1, 0, level.width - 1);
                                break;
                            case gamepad.buttons[14].pressed:
                                console.log(14);
                                nextX = clamp(player.x + 1, 0, level.width - 1);
                                break;
                            default:
                                f = false;
                        }

                        if (
                            tileIsNotWall(player.level, level, nextX, nextY) &&
                            layers[player.level].getTile(nextX, nextY) >= 0
                        ) {
                            player.x = nextX;
                            player.y = nextY;
                        }

                        if (
                            layers[player.level].getTile(player.x, player.y) === getTilesByType(level, 'exit')[0]
                        ) {
                            console.log('exit');
                        }
                    }, 100);
                }

                if (gamepad) {
                    initGamepad(gamepad);
                } else {
                    window.addEventListener("gamepadconnected", function(e) {
                          console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                              e.gamepad.index, e.gamepad.id,
                                  e.gamepad.buttons.length, e.gamepad.axes.length);

                          initGamepad(e.gamepad);
                    });
                }
            }

            render();
            loopPlayer();
        });
    });
});
