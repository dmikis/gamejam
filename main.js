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
    var levelFile = 'res/maps/level3.json';
    //var levelFile = 'res/maps/level2.json';


    var modPlayer;
    var modTimeout;
    var isMusic = true;
    var isSound = true;
    var howlSound;
    var hasFinished = false;


    function loopPlayer() {
        if (modPlayer) {
            modPlayer.stop();
        } else {
            modPlayer = new ChiptuneJsPlayer(new ChiptuneJsConfig(1));
        }
        modPlayer.load('res/music/theme.xm', function(buffer){
            modPlayer.play(buffer);
            modPlayer.togglePause(buffer);

            modTimeout = setTimeout(loopPlayer, 1000 * modPlayer.duration());
            modPlayer.play(buffer);
        });
    }

    window.togglePlayer = function() {
        if (modPlayer) {
            if (isMusic) {
                modPlayer.stop();
                clearTimeout(modTimeout);
            } else {
                loopPlayer();
            }
            isMusic = !isMusic;
        }
    }
    
    function loadSoundSprites() {
        if (howlSound) {
            return;
        }
        howlSound = new Howl({
              urls: ['res/sound/sprites.wav'],
              sprite: {
                xray: [0, 630],
                wall: [642, 45],
                step: [694, 47],
                done: [741, 665],
                button: [1405, 475]
              }
            });
    }
    
    function playSoundSprite(spriteName) {
        if (isSound && howlSound) {
            console.log('playing sprite ' + spriteName);
            howlSound.play(spriteName);
        }
    }
    
    function playExit() {
        console.log('exit');
        hasFinished = true;
        playSoundSprite('done');
    }
    
    function playWall() {
        playSoundSprite('wall');
    }
    
    function playStep() {
        playSoundSprite('step');
    }
    
    function playButton() {
        playSoundSprite('button');
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

    function tileIsNotNoXRay(layerId, level, x, y) {
        return getTilesByType(level, 'noXRay').indexOf(level.layers[layerId].data[y * level.width + x] - 1) === -1;
    }

    function sameType(layerId1, x1, y1, layerId2, x2, y2, layers) {
        return layers[layerId1].getTile(x1, y1) === layers[layerId2].getTile(x2, y2);
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
            var context = CanvasControl.create('canvas', 900, 600);
            var layers = level.layers.map(function (layer) {
                var l = new TileField(context, 900, 600);
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
                context.clearRect(0, 0, 900, 600);

                layers.forEach(function (layer, i) {
                    if (i === player.level + 1) {
                        var pc = layers[0].getTilePos(player.x, player.y);
                        context.drawImage(player.imgs[0], pc.x, pc.y);
                        context.drawImage(player.imgs[1], pc.x, pc.y - 16);
                        context.drawImage(player.imgs[2], pc.x - 16, pc.y - 8);
                        context.drawImage(player.imgs[3], pc.x + 16, pc.y - 8);
                    }
                    if (!level.layers[i].visible) {
                        return;
                    }
                    for (var x = 0; x < level.width; ++x) {
                        for (var y = 0; y < level.height; ++y) {
                            if (i > player.level && layer.getTile(player.x, player.y) >= 0) {
                                if (x === player.x && y === player.y) {
                                    context.globalAlpha = 0.3;
                                } else if (Math.abs(x - player.x) + Math.abs(y - player.y) === 1) {
                                    context.globalAlpha = 0.5;
                                } else if (Math.abs(x - player.x) === 1 && Math.abs(y - player.y) === 1) {
                                    context.globalAlpha = 0.7;
                                }
                            }
                            layer.draw(x, y);
                            context.globalAlpha = 1;
                        }
                    }

                    if (i <= player.level) {
                        pc = layers[0].getTilePos(player.x, player.y);
                        context.drawImage(player.imgs[1], pc.x, pc.y - 16);
                        context.drawImage(player.imgs[2], pc.x - 16, pc.y - 8);
                        context.drawImage(player.imgs[3], pc.x + 16, pc.y - 8);
                    }
                });

                pc = layers[0].getTilePos(player.x, player.y);
                context.drawImage(player.imgs[1], pc.x, pc.y - 16);
                context.drawImage(player.imgs[2], pc.x - 16, pc.y - 8);
                context.drawImage(player.imgs[3], pc.x + 16, pc.y - 8);

                requestAnimationFrame(render);
            }

            var input = new InputControl(document, context.canvas);

            input.keyboard(function (key, pressed, e) {
                if (hasFinished)
                return;
                if (pressed) {
                    var nextX = player.x, nextY = player.y;

                    if ([38, 40, 37, 39, 90, 88].indexOf(key) >= 0) {
                        e.preventDefault();
                    }

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
                        case 90: // z button
                        case 88: // x button
                            variation = 1;
                            if (key === 88) {
                                variation = -1;
                            }
                            curLevel = player.level;
                            var xraySuccess = false;
                            while (layers[curLevel + variation]) {
                                if (level.layers[curLevel].visible && layers[curLevel + variation].getTile(nextX, nextY) >= 0) {
                                    if (tileIsNotWall(curLevel + variation, level, nextX, nextY)) {
                                        if (tileIsNotNoXRay(curLevel + variation, level, nextX, nextY)) {
                                            player.level = curLevel + variation;
                                            playSoundSprite('xray');
                                            xraySuccess = true;
                                        }
                                        break;
                                    }
                                }
                                curLevel += variation;
                            }
                            if (!xraySuccess) {
                                playWall();
                            }
                            break;
                    }

                    shouldMove = false;
                    nextLevel = player.level;
                    if ((layers[player.level].getTile(nextX, nextY) >= 0) && tileIsNotWall(player.level, level, nextX, nextY)) {
                        shouldMove = true;
                    } else if ((player.x != nextX) || (player.y != nextY)) {
                        curLevel = 0;
                        if (layers[player.level].getTile(nextX, nextY) >= 0)
                            curLevel = player.level;
                        lastNonWallLevel = curLevel;
                        lastTileWasNotWall = false;
                        while (layers[curLevel + 1]) {
                            if (layers[curLevel + 1].getTile(nextX, nextY) >= 0) {
                                lastTileWasNotWall = tileIsNotWall(curLevel + 1, level, nextX, nextY) && sameType(player.level, player.x, player.y, curLevel + 1, nextX, nextY, layers);
                                if (lastTileWasNotWall) {
                                    lastNonWallLevel = curLevel + 1;
                                }
                            }
                            if (lastTileWasNotWall) {
                                shouldMove = true;
                                nextLevel = lastNonWallLevel;
                            }
                            curLevel += 1;
                        }
                    }
                    if (shouldMove) {
                        player.x = nextX;
                        player.y = nextY;
                        player.level = nextLevel;
                        playStep();
                    } else {
                        playWall();
                    }

                    if (
                        layers[player.level].getTile(player.x, player.y) === getTilesByType(level, 'exit')[0]
                    ) {
                        playExit();
                    }

                    if (
                        layers[player.level].getTile(player.x, player.y) === getTilesByType(level, 'button')[0]
                    ) {
                        switch (levelFile) {
                            case 'res/maps/level3.json':
                                level.layers[4].visible = true;
                                console.log('push da button');
                                playButton();
                                break;
                        }
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
                                if (
                                    layers[player.level + 1] &&
                                    layers[player.level + 1].getTile(nextX, nextY) >= 0 &&
                                    tileIsNotWall(player.level + 1, level, nextX, nextY)
                                ) {
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
                            playExit();
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
            loadSoundSprites();
            loopPlayer();
        });
    });
});
