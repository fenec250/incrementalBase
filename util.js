const base = 2**(1/64);
const base2 = 2**(1/32);
const base4 = 2**(1/16);
const base8 = 2**(1/8);
const goodEnough = Number.EPSILON * 64;
function speed(level) {
    return level > 0
        ? (1 << (level >> 6)) * (base ** (level % 64)) // this should work up to level ~4000?
        : 1/((1 << (-level >> 6)) * (base ** (-level % 64)))
}

function statSpeedLevel(stat) {
    return game.stats[stat].level+game.stats[stat].genLevel*4;
}

function statSpeed(stat) {
    return speed(game.stats[stat].level+game.stats[stat].genLevel*4);
}

function taskSpeedLevel(id) {
    return game.tasks[id].statsScaling
    .map(([s, p]) => [game.stats[s] || {level:0,genLevel:0}, p])
    .map(([s, p]) => (s.level + s.genLevel*4)*p)
    .reduce((total, v) => total + v, 0)
    + game.tasks[id].boost;
}

function refreshTaskSpeed(task) {
    task.speedLevel = task.getSpeedLevel();
    task.speed = speed(task.speedLevel);
    task.timeToComplete = task.baseDuration/task.speed;
    //console.log(task.id, task.speed, task.statsScaling);
}

function heal(amount) {
    game.determination.amount = Math.min(
        game.determination.max, game.determination.amount + amount)
}