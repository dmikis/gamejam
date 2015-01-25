define(['level.js'], function (playLevel) {
    var levels = [
        'res/maps/level0.json',
        'res/maps/level3.json',
        'res/maps/level2.json'
    ];

    var modPlayer;
    var modTimeout;
    var isMusic = true;

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

    loopPlayer();

    function playLevelWrap(levelIdx) {
        if (levelIdx === levels.length) return;
        playLevel(levels[levelIdx]).then(function () { playLevelWrap(levelIdx + 1); });
    }

    playLevelWrap(0);
});
