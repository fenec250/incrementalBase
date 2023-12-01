function recordStep(task, progress, forceDistinct) {
    if (!game.history[game.cycle]) {
        game.history[game.cycle] = [];
    }
    let cycleHistory = game.history[game.cycle];
    let last = cycleHistory[cycleHistory.length-1];
    distinct = forceDistinct
        || task.forceDistinct
        || !last
        || last.taskId != task.id
    //console.log("recording:", task.id, progress, distinct);
    if (!distinct) {
        last.progress += progress;
        last.endTimeLeft = game.timeLeft;
        return;
    }
    cycleHistory[cycleHistory.length] = {
        taskId: task.id,
        progress: progress,
        endTimeLeft: game.timeLeft,
    }
}

function replaySteps(cyclesHistory) {
    let genEnded = -1;
    cyclesHistory.forEach((cycleSteps, i) => {
        //console.log("Next cycle:", i, game.cycle);
        if (!(genEnded < 0)) return; // this should be shown to the player
        cycleSteps.forEach(step => {
            //console.log("New step:", step);
            let task = game.tasks[step.taskId]
            let remaining = step.progress;
            //console.log("Running step:", step, remaining);
            remaining = runForProgress(task, remaining);
        })
        if (i < cyclesHistory.length-1 && i == game.cycle) {
            //console.log("Closing cycle:", game.cycle, game.timeLeft);
            endCycle();
            genEnded = tryEndGeneration() ? i : genEnded;
        }
    })
    //console.log("Completed steps at:", game.cycle, game.timeLeft);
    showTop();
    showStats();
    showTasks();
    updateObjectiveObjects();
}

function saveCheckpoint() {
    //console.log("recording plan", game.cycle, game.history.length)
    game.plan = [...game.history] // copy array of array references
    if (!game.plan[game.cycle]){
        game.plan[game.cycle] = []
    } else {
        let last = game.history[game.cycle]
        game.plan[game.cycle] = [...last] // replace referenced array with a copy
        if (!!last.length) // replace last entry reference with a copy
            game.plan[game.cycle][last.length-1] = {...last[last.length-1]}
    }
}