var game = {
    stats:{},
    resources:{},
    tasks:{},
    objectives: {},
    determination: {base:0, max:0, amount: 0, decay: 0},
    events: [],

    persistent: {},
    summary: {cyclesSpent:{}, startingStats:{}, },
    history: [], // [[{taskId, progress, endTimeLeft},... cycle 1 tasks],[{}, ... cycle 2...]]
    plan: [], // same structure as history
    
    currentTask: null,
    timeLeft: 1.0,
    cycleLength: 1,
    cycle: 0,
    generation: 0,
    taskGroup: {}, // the current area/set of tasks
    
    lastTask: {}, // potato: for narration?
    longPlan: [], // potato: [[{},... tasks for hour],...]
}
var stats = [];
var chapters = {};
var initialTaskGroup; // to be  defined by the main HTML file

function loadStats(stats) {
    Object.entries(stats).map(loadStat);
    showStats();
}

function loadStat([id, {
    title,
    order=1000,
    level=0, genLevel=0,
    exp=0, genExp=0,
    nextLevelExp=100, nextGenLevelExp=100,
    speed=1,
}]) {
    game.stats[id] = {
    id, title, order, level, genLevel, exp, genExp, nextLevelExp, speed,
    nextGenLevelExp,
    storedExp: 0,
    };
}
function stripStat({
    id, level, genLevel, exp, genExp,
    nextLevelExp, nextGenLevelExp,
    storedExp, speed,
}) {
    return {
        id, level, genLevel, exp, genExp,
        nextLevelExp, nextGenLevelExp,
        storedExp, speed,
    };
}

function loadTaskGroup(id) {
    let taskGroup = chapters[id];
    //console.log("load TG", id, taskGroup)
    const resources = taskGroup.resources
        .map(r =>  [r.id, game.resources.hasOwnProperty(r.id) ? game.resources[r.id] : r.initial||0])
    game.resources = Object.fromEntries(resources);

    const objectives = Object.entries(taskGroup.objectives)
        .map(d => loadObjective(d))

    const tasks = Object.entries(taskGroup.tasks)
        .map(t => loadTask(t))
    game.tasks = Object.fromEntries(tasks.map(t => [t.id, t]));
    // objectives.filter(d => !!d.task)
    //     .forEach(d => {
    //         game.tasks[d.id] = loadTask({id:d.id, ...d.task})
    //         //console.log(d.id, d.task, game.tasks[d.id])
    // })
    game.objectives = Object.fromEntries(objectives.map(d => [d.id, d]));

    const events = Object.entries(taskGroup.events)
        .map(t => loadEvent(t))
    game.events = Object.fromEntries(events.map(t => [t.id, t]));

    game.taskGroup = taskGroup;

    Object.values(game.tasks).forEach(refreshTaskSpeed)
    showTop();
    showEvents();
    showTasks();
    createObjectiveObjects();

    if (typeof(taskGroup.onLoad) == 'function')
        taskGroup.onLoad();
}

function loadEvent([id, {
    title, content,
    hidden=true, collapsed,
    order=1000,
}]) {
    //console.log(content);
    return ({
    id, order, content,
    title: title || id,
    hidden: hidden || !title,
    collapsed: collapsed || false,
    });
}

function stripEvent({
    id, hidden, collapsed
}) {
    return {id, hidden, collapsed};
}

function loadTask ([id,{
    title, description, tooltip, image,
    order = 1000,
    baseDuration = 0.0, // 1 = 1 hour, accelerated by stats
    statsScaling = [], // [["stat", power:1.0, expWeigth:1.0], ...]
    tags, // defaults to statScaling items
    boost = 0, // speed level modifier. +64 => x2.0
    forceDistinct = false,
    getSpeedLevel = () => taskSpeedLevel(id), // {this task} => speed
    isEnabled = () => true, // {context} => should show up
    onCompletion = () => true, // {context} => can be completed
    maxCompletion,// = task => , // this => max that can be completed
}]) {
    return ({
    id, title, description, tooltip, image,
    order, baseDuration, boost, forceDistinct,
    getSpeedLevel, isEnabled, onCompletion,
    statsScaling:statsScaling.map(([s, p=1, e]) =>
    [s, p, typeof(e) === 'undefined' ? p : +e]),
    tags: tags || statsScaling.map(([s]) => s),
    maxCompletion: typeof(maxCompletion) === 'function' ? maxCompletion
        : !!forceDistinct ? task=>1 : task=>Number.POSITIVE_INFINITY,
    progress:0, unclaimedProgress:0
    });
}

function stripTask({
    id, baseDuration, boost, progress, unclaimedProgress
}) {
    baseDuration = isFinite(baseDuration) ? baseDuration : undefined;
    return {
        id, boost, progress, baseDuration, unclaimedProgress
    };
}

function loadObjective([id, {
    description, mechanics, tooltip, image,
    text, title,
    tags = [],
    order = 1000,
    isEnabled = () => true, // () => should show up
    onCycle = () => true, // () => do things
    onDisplay = node => true, // () => do things
    custom,
}]) {
    return ({
    id, order, tags, image, tooltip, mechanics,
    text:text || title || "",
    description:description || "",
    isEnabled, onCycle, onDisplay,
    custom:{...custom},
    });
}

function save(id='quickSave') {
    let save = {
        stats: Object.values(game.stats).map(stripStat),
        resources: Object.entries(game.resources),
        tasks: Object.values(game.tasks).map(stripTask),
        determination: game.determination,

        persistent: game.persistent,
        generation: game.generation,
        summary: game.summary,
        history: game.history,
        plan: game.plan,
        
        currentTask: game.currentTask?.id,
        timeLeft: game.timeLeft,
        cycleLength: game.cycleLength,
        cycle: game.cycle,
        taskGroup: game.taskGroup.id,
    };
    console.log("saving "+id+": ", save);
    localStorage.setItem("save_"+id, JSON.stringify(save));
}

function load(id='quickSave') {
    let save = JSON.parse(localStorage.getItem("save_"+id));
    console.log("loading "+id+": ", save);
    if (!save)
        return;
    game = {...game, ...save,
        stats:game.stats};
    loadTaskGroup(save.taskGroup)

    game.stats = {...game.stats,
        ...Object.fromEntries(save.stats
            .filter(s => !!game.stats[s.id])
            .map(s => [s.id, {...game.stats[s.id], ...s}]))
    };
    game.resources = {...game.resources,
        ...Object.fromEntries(save.resources
            .filter(r => !(game.resources[r[0]]===undefined)))
    };
    game.tasks = {...game.tasks,
        ...Object.fromEntries(save.tasks
            .filter(s => !!game.tasks[s.id])
            .map(s => [s.id, {...game.tasks[s.id], ...s}]))
    };

    if (!!save.currentTask)
        game.currentTask = game.tasks[save.currentTask];
    
    Object.keys(game.tasks).forEach(key => refreshTaskSpeed(game.tasks[key]))

    showTop();
    showStats();
    showEvents();
    showTasks();
    createObjectiveObjects(); updateObjectiveObjects();
    updateCheckpointButtons();
}