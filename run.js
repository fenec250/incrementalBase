const TTC_CORRECTION = Number.EPSILON * 100
const STOP_EARLY = TTC_CORRECTION * 100

var runLock = false;
function run(taskId, times=1, stopEarly=false) {
    if (runLock) return;
    runLock = true;

    if (!!taskId) game.currentTask = game.tasks[taskId]

    if (times > 1) {
        times = Math.min(times, game.currentTask.maxCompletion())
    }

    // run active task
    const timeToComplete = Math.max(Math.min(
        // ...tasksToRun.map(task =>
        //     (task.baseDuration - task.progress) / task.speed),
        game.currentTask.baseDuration == 0 ? 0 : Number.POSITIVE_INFINITY,
        (game.currentTask.baseDuration*times - game.currentTask.progress)
            / game.currentTask.speed + TTC_CORRECTION,
        game.timeLeft
        )-(stopEarly?STOP_EARLY:0), 0);
    // console.log(timeToComplete, game.timeLeft);
    
    if (!!game.currentTask) {
        runTask(game.currentTask, timeToComplete, stopEarly);
        //storeExp(game.currentTask.statsScaling, timeToComplete * game.currentTask.speed);
    }

    Object.values(game.objectives).filter(d => d.isEnabled())
        .forEach(d => d.onProgress(timeToComplete))

    // cycle check
    game.timeLeft -= timeToComplete;
    if (game.timeLeft <= 0) {
        endCycle()
    }

    showTop();
    showStats();
    showTasks();
    showObjectives();
    // if game.plan.lehgth > 0 game.currentTask = plan.un/shift() and re run()?
    runLock = false;
}

function runTask(task, duration, stopEarly) {
    if (task.baseDuration <= 0) {
        if (task.hasOwnProperty("onCompletion") && !stopEarly)
            task.onCompletion();
        return;
    }
    let remaining = duration;
    //console.log(task.id, progress, task.speed, timeToComplete)
    while (remaining * task.speed >= task.baseDuration - task.progress) {
        remaining -= (task.baseDuration - task.progress)/task.speed
        //console.log(task.baseDuration - task.progress)
        //progress -= task.baseDuration - task.progress;
        storeExp(task.statsScaling, task.baseDuration - task.progress);
        task.progress = 0;
        if (task.hasOwnProperty("onCompletion")) task.onCompletion();
    }
    task.progress += remaining * task.speed;
    storeExp(task.statsScaling, remaining * task.speed);

    // update summary
    let involvedStats = task.statsScaling.filter(([,p]) => p > 0).map(([id])=>id);
    for (id of involvedStats) {
        game.summary.cyclesSpent[id] += duration/involvedStats.length;
    }
}

function endCycle() {
    // apply stored exp
    for (let s of Object.values(game.stats)) {
        s.exp += s.storedExp;
        s.genExp += s.storedExp;
        while (s.exp >= s.nextLevelExp) {
            s.level += 1;
            s.exp -= s.nextLevelExp;
            s.nextLevelExp *= base2;
        }
        while (s.genExp >= s.nextGenLevelExp) {
            s.genLevel += 1;
            s.genExp -= s.nextGenLevelExp;
            s.nextGenLevelExp *= base8;
            // s.nextGenLevelExp = 10 * (1 << (s.genLevel >> 3) * (base8 ** (level % 8))); // good up to lvl ~511?
        }
        s.storedExp = 0;
        s.speed = speed(s.level + s.genLevel*4)
    }
    game.determination.amount -= game.determination.decay;
    Object.values(game.objectives).filter(d => d.isEnabled())
        .forEach(d => d.onCycle());
    if (game.determination.amount < 0) {
        showRecap();
        reset();
    }
    // refresh data of displayable
    Object.keys(game.tasks).forEach(key => refreshTaskSpeed(game.tasks[key]))
    Object.values(game.stats).forEach(s => s.speed = speed(s.level + s.genLevel*4))
    // set up next period
    game.timeLeft = game.cycleLength;
    game.cycle += 1;
}

function storeExp(statsScaling, exp) {
    let expShares = statsScaling
        .filter(([s]) => game.stats.hasOwnProperty(s))
        .map(([,,e]) => +e)
        .reduce((total, v) => total + v, 0);
    if (expShares <= 0) return;
    //console.log("exp is " + exp + "  exp pow is " + game.currentTask.speedLevel)
    for (var [s,,e] of statsScaling) {
        if (!game.stats.hasOwnProperty(s))
            continue;
        game.stats[s].storedExp += exp * Math.max(typeof(e) === 'undefined' ? p : +e, 0)/expShares;
        //stat.storedExp += exp ** (e||p)/expShares;
    }
}

function reset() {
    //console.log("reset!")
    Object.keys(game.stats).forEach(key => {
            game.stats[key].genLevel = 0;
            game.stats[key].genExp = 0;
            game.stats[key].nextGenLevelExp = 100;
            game.stats[key].storedExp = 0;
        });

    game = { ...game,
        //stats:{},
        resources:{},
        tasks:{},
        objectives: {},
        determination: {base:100, max:100, amount:100, decay: 0},
        events: [],
        
        currentTask: null,
        taskGroup: {}, // the current area/set of tasks
        cycle:0,
        timeLeft: 100.0,
        cycleLength: 100,
        summary: {
            cyclesSpent: Object.fromEntries(
                Object.values(game.stats).map(s => [s.id, 0])),
            startingStats: Object.fromEntries(
                Object.values(game.stats).map(s => [s.id, structuredClone(s)])),
        },

        //longPlan: [], // potato: [[{},... tasks for hour],...]
    }
    game.generation += 1;
    console.log("generation "+game.generation);
    loadTaskGroup(initialTaskGroup);
    game.summary.cyclesSpent = Object.fromEntries(
        Object.values(game.stats).map(s => [s.id, 0]))
    game.summary.startingStats = Object.fromEntries(
        Object.values(game.stats).map(s => [s.id, structuredClone(s)]))
    
    Object.keys(game.tasks).forEach(key => refreshTaskSpeed(game.tasks[key]))

    showTop();
    showStats();
    showEvents();
    showTasks();
    showObjectives()
}