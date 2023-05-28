var game = {
    stats:{},
    resources:{},
    tasks:{},
    dangers: {},
    determination: {base:0, max:0, amount: 0, decay: 0},
    events: [],

    persistent: {},
    onResetList: [],
    
    currentTask: null,
    activeDangers: [],
    timeLeft: 1.0,
    cycleLength: 1,
    cycle: 0,
    generation: 0,
    taskGroup: {}, // the current area/set of tasks
    
    lastTask: {}, // potato: for narration?
    longPlan: [], // potato: [[{},... tasks for hour],...]
}

var taskGroups = {};
var initialTaskGroup; // to be  defined by the main HTML file

function loadTaskGroup(id) {
    let taskGroup = taskGroups[id];
    //console.log("load TG", id, taskGroup)

    const stats = taskGroup.stats
        .map(s => game.stats.hasOwnProperty(s.id) ? game.stats[s.id] : loadStat(s))
    game.stats = Object.fromEntries(stats.map(s => [s.id, s]));

    const resources = taskGroup.resources
        .map(r =>  game.resources.hasOwnProperty(r.id) ? game.resources[r.id] : loadResource(r))
    game.resources = Object.fromEntries(resources.map(r => [r.id, r]));

    const dangers = Object.entries(taskGroup.dangers)
        .map(d => loadDanger(d))

    const tasks = Object.entries(taskGroup.tasks)
        .map(t => loadTask(t))
    game.tasks = Object.fromEntries(tasks.map(t => [t.id, t]));
    // dangers.filter(d => !!d.task)
    //     .forEach(d => {
    //         game.tasks[d.id] = loadTask({id:d.id, ...d.task})
    //         //console.log(d.id, d.task, game.tasks[d.id])
    // })
    game.dangers = Object.fromEntries(dangers.map(d => [d.id, d]));

    const events = Object.entries(taskGroup.events)
        .map(t => loadEvent(t))
    game.events = Object.fromEntries(events.map(t => [t.id, t]));

    game.taskGroup = taskGroup;

    Object.values(game.tasks).forEach(refreshTaskSpeed)
    showTop();
    showStats();
    showEvents();
    showTasks();
    showDangers();

    if (typeof(taskGroup.onLoad) == 'function')
        taskGroup.onLoad();
}

function loadStat({
    id, title,
    order=1000,
    level=0, genLevel=0,
    exp=0, genExp=0,
    nextLevelExp=100, nextGenLevelExp=100,
    speed=1,
}) {
    return {
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

function loadResource({
    id, title,
    initial=0,
    hidden=false,
    order=1000,
}) {
    return ({
    id, title, order,
    hidden:hidden || !title,
    amount:initial,
    });
}

function stripResource({
    id, amount, hidden
}) {
    return {id, amount, hidden};
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
    title, description,
    order = 1000,
    baseDuration = 0.0, // 1 = 1 hour, accelerated by stats
    statsScaling = [], // [["stat", 1.0], ...] number as exponent?
    boost = 0, // speed level modifier. +64 => x2.0
    isEnabled = () => true, // {context} => should show up
    onCompletion = () => true, // {context} => can be completed
    maxCompletion = task => Number.POSITIVE_INFINITY, // this => max that can be completed
}]) {
    return ({
    id, title, description, order, baseDuration, boost,
    isEnabled, onCompletion, maxCompletion,
    statsScaling:statsScaling.map(([s, p=1, e]) =>
    [s, p, typeof(e) === 'undefined' ? p : +e]),
    progress:0,
    });
}

function stripTask({
    id, baseDuration, boost, progress,
}) {
    baseDuration = isFinite(baseDuration) ? baseDuration : undefined;
    return {
        id, boost, progress, baseDuration,
    };
}

function loadDanger([id, {
    title, description,
    text, tooltip,
    order = 1000,
    isEnabled = () => true, // () => should show up
    onProgress = time => 0, // time => do things
    onCycle = () => true, // () => do things
    onDisplay = node => true, // () => do things
    custom,
}]) {
    return ({
    id, order, text:text || title, tooltip:tooltip || description,
    isEnabled, onProgress, onCycle, onDisplay,
    custom:{...custom},
    });
}

function stripDanger({
    id, custom,
}) {
    return {id, custom};
}

function save(id='quickSave') {
    let save = {
        stats: Object.values(game.stats).map(stripStat),
        resources: Object.values(game.resources).map(stripResource),
        tasks: Object.values(game.tasks).map(stripTask),
        dangers: Object.values(game.dangers).map(stripDanger),
        determination: game.determination,

        persistent: game.persistent,
        generation: game.generation,
        
        currentTask: game.currentTask?.id,
        timeLeft: game.timeLeft,
        cycleLength: game.cycleLength,
        cycle: game.cycle,
        taskGroup: game.taskGroup.id,
    };
    console.log("saving: ", save);
    localStorage.setItem(id, JSON.stringify(save));
}

function load(id='quickSave') {
    let save = JSON.parse(localStorage.getItem(id));
    console.log("loading: ", save);
    if (!save)
        return;
    game = {...game, ...save}; //probably breaks references?
    loadTaskGroup(save.taskGroup)
    //game = save;
    game.stats = Object.fromEntries(save.stats.map(s => [s.id, {...game.stats[s.id], ...s}]))
    game.resources = Object.fromEntries(save.resources.map(s => [s.id, {...game.resources[s.id], ...s}]))
    game.tasks = Object.fromEntries(save.tasks.map(s => [s.id, {...game.tasks[s.id], ...s}]))
    game.dangers = Object.fromEntries(save.dangers.map(s => [s.id, {...game.dangers[s.id], ...s}]))

    if (!!save.currentTask)
        game.currentTask = game.tasks[save.currentTask];
    
    //game.activeDangers = Object.values(game.dangers).filter(({isEnabled}) => isEnabled());
    Object.keys(game.tasks).forEach(key => refreshTaskSpeed(game.tasks[key]))

    showTop();
    showStats();
    showEvents();
    showTasks();
    showDangers();
}