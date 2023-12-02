const TTC_CORRECTION = Number.EPSILON * 10000
const STOP_EARLY = TTC_CORRECTION * 10


var runLock = false;
function run(taskId, times=1, stopEarly=false) {
    if (runLock) return;
    runLock = true;

    let task = game.tasks[taskId];
    times = Math.min(times, task.maxCompletion());
    let duration = (task.baseDuration*times - task.progress) / task.speed

    if (duration >= game.timeLeft) {
        runForDuration(task, game.timeLeft - (stopEarly?1:0))
    } else {
        runForProgress(task, task.baseDuration*times - task.progress
            - (stopEarly?1:0)); // task.speed*STOP_EARLY?
    }

    showTop();
    showStats();
    showTasks();
    updateObjectiveObjects();
    updateCheckpointButtons();

    runLock = false;
}

function advanceTime(time) {
    game.timeLeft -= time
    //recordStep(task, remaining - leftover)
    if (game.timeLeft <= 0) {
        endCycle();
    }
}

function endCycle() {
    //console.log("endCycle")
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
    // refresh data of displayable
    Object.keys(game.tasks).forEach(key => refreshTaskSpeed(game.tasks[key]))
    Object.values(game.stats).forEach(s => s.speed = speed(s.level + s.genLevel*4))
    // set up next period
    game.timeLeft = game.cycleLength;
    game.cycle += 1;
}

// Run for a certain duration, within the current cycle
function runForDuration(task, requestedDuration) {
    //console.log(game.cycle, game.timeLeft, "run for duration", task.id, requestedDuration);
    let progressTime = Math.min(requestedDuration, game.timeLeft);
    let remainingTime = Math.max(requestedDuration - game.timeLeft, 0);
    let progress = task.speed*progressTime;
    let speed = task.speed; // some tasks change speed after being completed
    let leftover = progressTask(task, progress + task.unclaimedProgress);
    remainingTime += (leftover/speed)>>0
    task.unclaimedProgress = leftover%speed
    game.timeLeft = remainingTime;
    recordStep(task, progress - leftover)
    if (game.timeLeft <= 0) {
        endCycle();
    }
    tryEndGeneration();
}

// Run for a certain amount of progress, across multiple Cycles if needed
function runForProgress(task, maxProgress) {
    //console.log(game.cycle, game.timeLeft, "run for progress", task.id, maxProgress);
    let remaining = maxProgress;
    let leftover = 0;
    let speed = task.speed;
    while (remaining > speed*game.timeLeft + task.unclaimedProgress
            && leftover == 0) {
        let progress = speed*game.timeLeft + task.unclaimedProgress;
        leftover = progressTask(task, progress);
        remaining -= progress - leftover;
        game.timeLeft = (leftover/speed)>>0;
        task.unclaimedProgress = leftover%speed
        speed = task.speed;
        recordStep(task, progress - leftover)
        endCycle();
        if (tryEndGeneration()) {
            return;
        }
    }
    if (!leftover) {
        leftover = progressTask(task, remaining);
        game.timeLeft -= Math.ceil((remaining - leftover - task.unclaimedProgress)/speed);
        task.unclaimedProgress = speed-(remaining - leftover - task.unclaimedProgress)%speed
        recordStep(task, remaining - leftover)
        if (game.timeLeft <= 0) {
            endCycle();
            tryEndGeneration();
        }
    }
}

function progressTask(task, progress) {
    //console.log("progressing:",task.id, progress)
    if (progress < 0) return 0;
    if (task.baseDuration <= 0) {
        if (task.hasOwnProperty("onCompletion")){
            task.onCompletion();
            //recordStep(task, 0);
        }
        return progress;
    }
    let remaining = progress;
    while (remaining >= task.baseDuration - task.progress && task.maxCompletion() > 0) {
        remaining -= task.baseDuration - task.progress
        storeExp(task.statsScaling, task.baseDuration - task.progress);
        //recordStep(task, task.baseDuration - task.progress);
        task.progress = 0;
        task.onCompletion();
    }
    if (task.maxCompletion() > 0) {
        task.progress += remaining;
        storeExp(task.statsScaling, remaining);
        //recordStep(task, remaining);
        return 0;
    } else {
        //console.log("remaining:", remaining)
        return remaining;
    }
}

function tryEndGeneration() {
    if (game.determination.amount < 0) {
        // possibility to defer end check to Content?
        showRecap();
        reset();
        return true;
    }
    return false;
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
        history: [],

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
    updateObjectiveObjects();
    updateCheckpointButtons();
}
