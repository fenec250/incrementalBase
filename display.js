function showTop() {
    const detdiv = document.getElementById("determination");
    var det = game.determination
    if (det.amount > det.decay) {
        detdiv.querySelector(".fill").style.width = ((det.amount - det.decay) / det.max * 100) + "%";
        detdiv.querySelector(".negative").style.width = "0%";
        detdiv.classList.remove("border");
    } else {
        detdiv.querySelector(".negative").style.width = (det.decay-det.amount / det.max * 100) + "%";
        detdiv.querySelector(".fill").style.width = "0%";
        detdiv.classList.add("border");
    }
    detdiv.querySelector(".bar .decay").style.width = ((Math.min(det.decay, det.amount) / det.max)*100) + "%"
    detdiv.querySelector(".title").innerHTML = "Determination: " + det.amount.toPrecision(3) + " (-" + det.decay.toPrecision(3) + " per cycle)";
    detdiv.querySelector(".tooltip .amount").innerHTML = det.amount.toPrecision(3);
    detdiv.querySelector(".tooltip .decay").innerHTML = det.decay.toPrecision(3);
    const cycdiv = document.getElementById("cycle");
    cycdiv.querySelector(".fill").style.width = (100-(game.timeLeft / game.cycleLength)*100) + "%"
    cycdiv.querySelector(".cycle").innerHTML = game.cycle;
    cycdiv.querySelector(".progress").innerHTML = (game.cycleLength - game.timeLeft).toPrecision(3) + " / " + game.cycleLength;
    // div.querySelector(".title")

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

function showResources() {
    const resDiv = document.getElementById("resources_container");
    resDiv.innerHTML = "";
    const resTemplate = document.getElementById("resource_template");
    const filteredResources = Object.entries(game.resources)
        .filter(([,{hidden}]) => !hidden)
        .map(([,r]) => r)
        .sort((a,b) => a.order > b.order);
    for (let resource of filteredResources) {
        let resNode = resDiv.querySelector("#r_"+resource.id);
        if (!resNode) {
            resNode = resTemplate.cloneNode(true);
            resDiv.appendChild(resNode);
            resNode.id = "r_"+resource.id;
            resNode.querySelector(".title").innerHTML = resource.title;
        }
        resNode.querySelector(".amount").innerHTML = resource.amount;
    }
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
            if (!!task.description) {
                taskNode.querySelector(".tooltip .description").innerHTML = task.description;
            }
            taskNode.querySelector(".button.click").onclick = () => queueTask(task.id);
            taskNode.querySelector(".button.all").onclick = () => queueTask(task.id, Number.POSITIVE_INFINITY);
        }
        showTaskBase(task, taskNode, init, game.timeLeft*task.speed/task.baseDuration);
        showTaskButtons(task, taskNode, init);
    }
}
function showTaskBase(task, taskNode, init=false, progress=0) {
    if (init) {
        taskNode.querySelector(".title").innerHTML = task.title;
        if (!!task.description) {
            taskNode.querySelector(".tooltip .description").innerHTML = task.description;
        }
    }
    let fill = task.progress/task.baseDuration;
    taskNode.querySelector('.bar .fill').style = "width: " + fill*100+"%";
    let prog = Math.min(progress, 1-fill, task.maxCompletion());
    taskNode.querySelector('.bar .prog').style = "width: " + prog*100+"%";
    taskNode.querySelector('.tooltip .prog .amount').innerHTML = task.progress.toPrecision(3);
    taskNode.querySelector('.tooltip .prog .duration').innerHTML = task.baseDuration.toPrecision(3);

    if (task.timeToComplete > 1) {
        taskNode.querySelector('.tooltip .ttc').style.display = 'block';
        taskNode.querySelector('.tooltip .ttc span').innerHTML = task.timeToComplete.toPrecision(3);
        taskNode.querySelector('.tooltip .cps').style.display = 'none';
    } else {
        taskNode.querySelector('.tooltip .cps').style.display = 'block';
        taskNode.querySelector('.tooltip .cps span').innerHTML = (1/task.timeToComplete).toPrecision(3);
        taskNode.querySelector('.tooltip .ttc').style.display = 'none';
    }
    
}
function showTaskButtons(task, taskNode, init=false) {
    if (init) {
        taskNode.querySelector(".button.click").onclick = () => queueTask(task.id);
        taskNode.querySelector(".button.all").onclick = () => queueTask(task.id, Number.POSITIVE_INFINITY);
    }
    let maxCompletion = task.maxCompletion(task);
    taskNode.querySelector(".button.click").disabled = maxCompletion <= 0;
    taskNode.querySelector(".button.all").disabled = maxCompletion <= 0;
    let multiCompletion = Math.min(maxCompletion, ((task.progress+game.timeLeft*task.speed)/task.baseDuration)>>0);
    let ba = taskNode.querySelector(".button.max");
    ba.onclick = () => queueTask(task.id, Math.max(multiCompletion,1));
    if (multiCompletion > 0) {
        ba.innerHTML = 'x' + (multiCompletion>=1000 ? multiCompletion.toPrecision(3) : multiCompletion);
        ba.disabled = false;
    } else {ba.disabled = true;}
}

function showDangers() {
    const dangersDiv = document.getElementById("dangers_container");
    dangersDiv.innerHTML = "";
    const dangerTemplate = document.getElementById("danger_template");
    const filteredDangers = Object.entries(game.dangers)
        .filter(([,{isEnabled}]) => isEnabled())
        .map(([,danger]) => danger)
        .sort((a,b) => a.order > b.order);
    for (let danger of filteredDangers) {
        let dangerNode = document.getElementById("d_"+danger.id);
        let init = false;
        if (!dangerNode) {
            init = true;
            dangerNode = dangerTemplate.cloneNode(true);
            dangersDiv.appendChild(dangerNode);
            dangerNode.id = "d_"+danger.id;
            dangerNode.querySelector('.text').innerHTML = danger.text;
            dangerNode.querySelector('.tooltip').innerHTML = danger.tooltip;
        }
        danger.onDisplay(dangerNode);
        //showTaskBase(task, dangerNode, init, game.cycleLength*task.speed/task.baseDuration);
    }
}

function queueTask(id, times=1) {
    run(id, times);
}

function exitEvent() {
    document.getElementById("popup_group").style.display = 'none';
    if (typeof(game.currentEvent?.onExit) == "function")
        game.currentEvent.onExit();
}

function showEvent(id) {
    let vent = game.taskGroup.events[id];
    game.currentEvent = vent;
    document.getElementById("popup_group").style.display = 'block';
    document.getElementById("popup_content").innerHTML = vent.content;
}