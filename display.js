function showTop() {
    const detdiv = document.getElementById("determination");
    let decay = game.determination.decay
    let amount = game.determination.amount
    let max = game.determination.max
    if (amount > decay) {
        detdiv.querySelector(".fill").style.width = ((amount - decay) / max * 100) + "%";
        detdiv.querySelector(".negative").style.width = "0%";
        detdiv.classList.remove("border");
    } else {
        detdiv.querySelector(".negative").style.width = ((decay - amount) / max * 100) + "%";
        detdiv.querySelector(".fill").style.width = "0%";
        detdiv.classList.add("border");
    }
    //detdiv.querySelector(".bar .decay").style.width = ((Math.min(decay, amount*2-decay) / max)*100) + "%"
    detdiv.querySelector(".bar .decay").style.width = ((Math.min(decay, amount) / max)*100) + "%"
    detdiv.querySelector(".title").innerHTML = "Determination: " + amount.toPrecision(3) +"/"+ max.toPrecision(3) + " (-" + decay.toPrecision(3) + " per cycle)";
    detdiv.querySelector(".tooltip .amount").innerHTML = amount.toPrecision(3);
    detdiv.querySelector(".tooltip .decay").innerHTML = decay.toPrecision(3);
    const cycdiv = document.getElementById("cycle");
    cycdiv.querySelector(".fill").style.width = (100-(game.timeLeft / game.cycleLength)*100) + "%"
    cycdiv.querySelector(".cycle").innerHTML = game.cycle;
    cycdiv.querySelector(".progress").innerHTML = (game.cycleLength - game.timeLeft).toFixed(0) + " / " + game.cycleLength;
    // div.querySelector(".title")
}

function showRecap() {
    const sectionRoot = document.getElementById("recap");
    sectionRoot.style.display = "";

    const lvlBar = sectionRoot.querySelector(".lvl");
    lvlBar.innerHTML = ""; // todo: hide elements? reuse elements?
    let totalLvlGain = Object.values(game.stats).map(s =>
        s.level - game.summary.startingStats[s.id].level)
        .reduce((a,b)=>a+b)
    lvlBar.style.display = totalLvlGain > 0 ? "" : "none"

    const cyclesBar = sectionRoot.querySelector(".cycles");
    cyclesBar.innerHTML = "";
    const idleNode = document.createElement("div"); // todo: template
    cyclesBar.appendChild(idleNode);
    let idleCycles = game.cycle - Object.values(game.summary.cyclesSpent)
        .reduce((a,b)=>a+b)/100;
    idleNode.style.width = idleCycles*100/game.cycle+"%";
    idleNode.innerHTML = "Idle: " + (idleCycles>= 1
                ? idleCycles.toPrecision(3) : idleCycles.toFixed(2));

    const lvlPaddingNode = document.createElement("div"); // todo: template
    lvlBar.appendChild(lvlPaddingNode);
    lvlPaddingNode.style.width = idleNode.style.width;

    for (stat of Object.values(game.stats)) {
        let levelDiff = stat.level - game.summary.startingStats[stat.id].level
        if (totalLvlGain > 0 && levelDiff/totalLvlGain > 0.01){
            const lvlNode = document.createElement("div"); // todo: template
            lvlBar.appendChild(lvlNode);
            lvlNode.style.width = levelDiff/totalLvlGain*(1-idleCycles/game.cycle)*100 + "%";
            lvlNode.innerHTML = stat.title + ' +' + levelDiff
        }
        const cycleNode = document.createElement("div"); // todo: template
        let cyclesSpent = game.summary.cyclesSpent[stat.id]/100
        if (cyclesSpent > 0) {
            cyclesBar.appendChild(cycleNode);
            cycleNode.style.width = cyclesSpent*100/game.cycle+"%";
            cycleNode.innerHTML = stat.title + ': ' + (cyclesSpent >= 1
                ? cyclesSpent.toPrecision(3) : cyclesSpent.toFixed(2));
        }
    }

    let endText = "Your journey ended."
    if (typeof(game.taskGroup.getEndText) == 'function') {
        endText = game.taskGroup.getEndText() + "<hr>";
    }
    sectionRoot.querySelector(".end").innerHTML = endText;
}
function hideRecap() {
    document.getElementById("recap").style.display = "none";
}

function showStats() {
    const statsDiv = document.getElementById("stats_container");
    statsDiv.innerHTML = "";
    const statTemplate = document.getElementById("stat_template");
    // const filteredStats = Object.entries(game.stats)
    //     //.filter(([,{hidden=true}]) => hidden)
    //     .map(([,stat]) => stat)
    //     .sort((a,b) => a.order > b.order)
    for (let [,stat] of Object.entries(game.stats)) {
        const statNode = statTemplate.cloneNode(true);
        statsDiv.appendChild(statNode);
        statNode.id = stat.id;

        let gExp = stat.genExp/stat.nextGenLevelExp;
        let gExpStorage = Math.min(stat.storedExp/stat.nextGenLevelExp, 1-gExp);
        statNode.querySelector(".gen .fill").style.width = gExp * 100 + "%";
        statNode.querySelector(".gen .sto").style.width = gExpStorage * 100 + "%";
        if (stat.genExp + stat.storedExp >= stat.nextGenLevelExp)
            statNode.querySelector(".gen").classList.add("border");
        else
            statNode.querySelector(".gen").classList.remove("border");
        statNode.querySelector(".tooltip .glvl").innerHTML = stat.genLevel.toPrecision(3);
        statNode.querySelector(".tooltip .gexp").innerHTML = stat.genExp.toPrecision(3);
        statNode.querySelector(".tooltip .ngexp").innerHTML = stat.nextGenLevelExp.toPrecision(3);

        let exp = stat.exp/stat.nextLevelExp;
        let expStorage = Math.min(stat.storedExp/stat.nextLevelExp, 1-exp);
        statNode.querySelector(".inst .fill").style.width = exp * 100 + "%";
        statNode.querySelector(".inst .sto").style.width = expStorage * 100 + "%";
        if (stat.exp + stat.storedExp >= stat.nextLevelExp)
            statNode.querySelector(".inst").classList.add("border");
        else
            statNode.querySelector(".inst").classList.remove("border");
        statNode.querySelector(".tooltip .lvl").innerHTML = stat.level.toPrecision(3);
        statNode.querySelector(".tooltip .exp").innerHTML = stat.exp.toPrecision(3);
        statNode.querySelector(".tooltip .nexp").innerHTML = stat.nextLevelExp.toPrecision(3);

        statNode.querySelectorAll(".tooltip .sto")
        .forEach(n => {
            n.style.display = stat.storedExp > 0 ? "inline" : "none";
            n.querySelector(".amount").innerHTML = stat.storedExp.toPrecision(3);
        })

        statNode.querySelector(".title").innerHTML = stat.title;
        statNode.querySelector(".speed").innerHTML = stat.speed.toPrecision(3);
    }
}

function showEvents() {
    const container = document.getElementById("events_container");
    container.innerHTML = "";
    const template = document.getElementById("event_template");
    for (let event of Object.values(game.events)) {
        let node = template.cloneNode(true);
        container.appendChild(node);
        node.id = "e_"+event.id;
        node.querySelector(".title").innerHTML = event.title;
        node.querySelector(".content").innerHTML = event.content;
        node.style.display = event.hidden ? "none" : null;
        node.querySelector(".content").style.display = event.collapse ? "none" : null;
    }
}

function showEvent(id) {
    let vent = game.taskGroup.events[id];
    game.currentEvent = vent;
    vent.hidden = false;
    // TODO: auto-collapse
    //document.getElementById("popup_group").style.display = 'block';
    //document.getElementById("popup_content").innerHTML = vent.content;
    if(!!document.getElementById("e_"+id))
        document.getElementById("e_"+id).style.display = null;
}

function collapseEvent(node, toggle=null) {
    if (typeof(node)=="string") node = document.getElementById(node);
    let parent = node.parentNode.parentNode;
    if (toggle === null) toggle = !parent.querySelector(".content").style.display;

    parent.querySelector(".content").style.display =
    toggle ? "none" : null;
}

function showTasks() {
    const tasksDiv = document.getElementById("tasks_container");
    tasksDiv.innerHTML = "";
    const filteredTasks = Object.entries(game.tasks)
        .filter(([,{isEnabled}]) => isEnabled())
        .map(([,task]) => task)
        .sort((a,b) => a.order > b.order);
    for (let task of filteredTasks) {
        let taskNode = document.getElementById("t_"+task.id);
        let init = false;
        if (!taskNode) {
            init = true;
            taskNode = document.getElementById("task_template").cloneNode(true);
            tasksDiv.appendChild(taskNode);
            taskNode.id = "t_"+task.id;
            taskNode.querySelector(".title").innerHTML = task.title;
            taskNode.querySelector('.tooltip .prog .duration').innerHTML = task.baseDuration;
        }
        let descrNode = document.getElementById("td_"+task.id);
        if (!descrNode) {
            descrNode = document.getElementById("item_description_template").cloneNode(true);
            descrNode.id = "td_"+task.id;
            document.querySelector("#description_container div").appendChild(descrNode);
            if (!!task.description) {
                descrNode.querySelector(".description").innerHTML = task.description;
            }
            if (!!task.image) {
                descrNode.querySelector('.image').style.display = ""
                descrNode.querySelector('.image').src = task.image;
            }
        }

        showTaskBase(task, taskNode, init, game.timeLeft*task.speed/task.baseDuration);
        showTaskTooltip(task, taskNode, init);

        descrNode.querySelector(".mechanics").innerHTML = taskNode.querySelector(".mechanics").innerHTML;
    }
}

function showTaskBase(task, taskNode, init=false, progress=0) {
    if (init) {
        taskNode.querySelector(".title").innerHTML = task.title;
        if (!!task.tooltip) {
            taskNode.querySelector(".tooltip .custom span").innerHTML = task.tooltip;
            taskNode.querySelector(".tooltip .custom").style.display = null;
        }
        taskNode.querySelector(".button.click").onclick = (e) => queueTask(e, task.id);
        taskNode.querySelector(".button.click").oncontextmenu = (e) => queueTask(e, task.id);
        taskNode.querySelector(".button.all").onclick = (e) => queueTask(e, task.id, Number.POSITIVE_INFINITY);
        taskNode.querySelector(".button.all").oncontextmenu = (e) => queueTask(e, task.id, Number.POSITIVE_INFINITY);
    }
    let fill = task.progress/task.baseDuration;
    taskNode.querySelector('.bar .fill').style = "width: " + fill*100+"%";
    let prog = task.baseDuration > 0 && Number.isFinite(task.baseDuration)
        ? Math.min(progress, 1-fill, task.maxCompletion())
        : task.maxCompletion() > 0;
    taskNode.querySelector('.bar .prog').style = "width: " + prog*100+"%";

    if (task.tags.length > 0) {
        taskNode.querySelector(".text .icons").style.display = "";
        taskNode.querySelector(".text .icons").innerHTML =
        task.tags.reduce((a,b)=>a+b); // todo: translate via taskGroup
    }
    else
        taskNode.querySelector(".text .icons").style.display = "none";

    let maxCompletion = +task.maxCompletion(task);
    taskNode.querySelector(".button.click").disabled = maxCompletion <= 0;
    taskNode.querySelector(".button.all").disabled = maxCompletion <= 0;
    if (maxCompletion > 0 && Number.isFinite(maxCompletion)) {
        let multiCompletion = (game.timeLeft*task.speed)/task.baseDuration;
        let hint = '';
        if (!isFinite(multiCompletion)) { hint = ''; }
        else if (task.progress/task.baseDuration + multiCompletion >= maxCompletion) {
            multiCompletion = maxCompletion - task.progress/task.baseDuration;
            hint += 'x' + ((multiCompletion > 1000 || multiCompletion%1>0) ? multiCompletion.toPrecision(2) : multiCompletion);
            hint += '|' + (100-game.timeLeft + (maxCompletion*task.baseDuration - task.progress)/task.speed).toFixed(0)
        } else {
            hint += 'x' + ((multiCompletion > 1000 || multiCompletion%1>0) ? multiCompletion.toPrecision(2) : multiCompletion);
        }
        taskNode.querySelector(".max").innerHTML = hint;
    }
}

function showTaskTooltip(task, taskNode, init) {
    taskNode.querySelector('.tooltip .prog .amount').innerHTML = task.progress>=1
        ? task.progress.toPrecision(3) : task.progress.toFixed(2);
    taskNode.querySelector('.tooltip .prog .duration').innerHTML = task.baseDuration.toPrecision(3);
    taskNode.querySelector('.tooltip .speed .val').innerHTML =
        task.speed.toPrecision(3);
    let scalingVisible = task.statsScaling.filter(([,p]) => !!p).length > 0
        && task.timeToComplete != 0;
    taskNode.querySelector('.tooltip .speed .scaling').style.display =
        scalingVisible ? "" : "none"
    if (scalingVisible)
        taskNode.querySelector('.tooltip .speed .sval').innerHTML =
            task.statsScaling
                .filter(([,p]) => !!p).map(([s,p]) =>
                    game.stats[s].title + (p==1 ? "":"^"+p.toPrecision(2)))
                .reduce((a,b) => a + ", " + b);
    taskNode.querySelector('.tooltip .boost').style.display =
        (task.speedLevel != expectedTaskSpeedLevel(task.id)
            && task.timeToComplete != 0) ? "" : "none"
    taskNode.querySelector('.tooltip .boost .val').innerHTML =
        speed(task.speedLevel - expectedTaskSpeedLevel(task.id)).toPrecision(3)

    taskNode.querySelector('.tooltip .ttci').style.display =
        task.timeToComplete == 0 ? "" : "none";
    taskNode.querySelector('.tooltip .ttc').style.display =
        task.timeToComplete > 100 ? "" : "none";
    taskNode.querySelector('.tooltip .ttcf').style.display =
        (task.timeToComplete < 100 && task.timeToComplete != 0) ? "" : "none";
    if (task.timeToComplete > 100) {
        taskNode.querySelector('.tooltip .ttc .val').innerHTML =
            (task.timeToComplete/100).toPrecision(3);
            taskNode.querySelector('.tooltip .ttc .left').innerHTML =
            +((task.baseDuration-task.progress)/task.speed/100).toPrecision(3);
    } else if (task.timeToComplete != 0) {
        taskNode.querySelector('.tooltip .ttcf span').innerHTML =
            (100/task.timeToComplete).toPrecision(3);
    }
}


function hideDescription() {
    document.getElementById("description_container")
        .querySelectorAll(".item-description:not(.hidden)")
        .forEach((shownDescr) => {shownDescr.classList.add("hidden")});
}

function showDescription(descrId, sticky=true) {
    if (!sticky && stickDescription)
        return;
    let descrNode = document.getElementById(descrId);
    if (descrNode) {
        hideDescription();
        descrNode.classList.remove("hidden");
        if (sticky) {
            stickDescription = true;
            document.getElementById("unstickDescription").style.display = null;
        }
    }
}

function handleDescriptionEvent(event) {
    let descrId = event.target.closest('.task')?.id.replace("t_", "td_")
        || event.target.closest('.objective')?.id.replace("o_", "od_");
    switch (event.type) {
        case "mouseenter":
            showDescription(descrId, false);
            break;
        case "click":
            showDescription(descrId, true);
            break;
    }
}

function showObjectives() {
    const objectivesDiv = document.getElementById("objectives_container");
    objectivesDiv.innerHTML = "";
    const objectiveTemplate = document.getElementById("objective_template");
    const filteredObjectives = Object.entries(game.objectives)
        .filter(([,{isEnabled}]) => isEnabled())
        .map(([,o]) => o)
        .sort((a,b) => a.order > b.order);
    for (let objective of filteredObjectives) {
        let node = document.getElementById("o_"+objective.id);
        if (!node) {
            node = objectiveTemplate.cloneNode(true);
            objectivesDiv.appendChild(node);
            node.id = "o_"+objective.id;
            node.querySelector('.text').innerHTML = objective.text;
            if (!!objective.tooltip) {
                node.querySelector('.tooltip').style.display = ""
                node.querySelector('.tooltip').innerHTML = objective.tooltip;
            }
        }
        let descrNode = document.getElementById("od_"+objective.id);
        if (!descrNode
            && (!!objective.description||!!objective.mechanics||!!objective.image)) {
            descrNode = document.getElementById("item_description_template").cloneNode(true);
            descrNode.id = "od_"+objective.id;
            document.querySelector("#description_container div").appendChild(descrNode);
            if (!!objective.description) {
                descrNode.querySelector(".description").innerHTML = objective.description;
            }
            if (!!objective.mechanics) {
                descrNode.querySelector('.mechanics').innerHTML = objective.mechanics;
            }
            if (!!objective.image) {
                descrNode.querySelector('.image').style.display = ""
                descrNode.querySelector('.image').src = objective.image;
            }
        }
        objective.onDisplay(node, descrNode);
    }
}

function queueTask(e, id, times=1) {
    if (!e) var e = window.event;
    if (!id) var id = e.target.id.replace("t_","");
    var rightclick;
    if (e.which) rightclick = (e.which == 3);
    else if (e.button) rightclick = (e.button == 2);
    run(id, times, rightclick);
    return false;
}

function showPopup(id) {
    let vent = game.taskGroup.events[id];
    game.currentEvent = vent;
    vent.hidden = false;
    // TODO: auto-collapse
    document.getElementById("popup_group").style.display = 'block';
    document.getElementById("popup_content").innerHTML = vent.content;
    // if(!!document.getElementById("e_"+id))
    //     document.getElementById("e_"+id).style.display = null;
}

function exitEvent() {
    document.getElementById("popup_group").style.display = 'none';
    if (typeof(game.currentEvent?.onExit) == "function")
        game.currentEvent.onExit();
}