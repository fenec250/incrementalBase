

loadStats({
        stat1:{ // unique stat id, used in Tasks
            title: "Stat1", // short title for display
        },
        stat2:{title: "Stat2"},
        stat3:{title: "Stat3"},
    });
chapters["test"] = {
    id: "test",
    resources: [ // list of resources for this group
        {
            id: "resource", // unique id, used by the engine
            title: "Resource", // short title for display
            initial: 0, // defaults to 0
            hidden: false, // defaults to false
            // hidden is set to True if Title is empty or not defined
        },
        {
            id: "hidden_resource",
        },
        {
            id: "initial_resource", // unique id, used by the engine
            title: "Initial resource", // short title for display
            initial: 10,
        },
        {
            id: "challenge_complete", // unique id, used by the engine
            title: "Hidden tracker", // short title for display
            initial: 0,
            hidden: true,
        },
    ],
    tasks: [ // list of tasks for this group
        {
            id: "wait", // unique id for engine
            title: "Wait", // short title for display
            description: "simple task with no scaling", // for tooltip
            order: 1000, // number for ordering in the list.
            baseDuration: Number.POSITIVE_INFINITY,
            statsScaling: [],
            boost: 0,
            isEnabled: () => true, // {context} => should show up
            onCompletion: () => null, // {context} => do when completed
            maxCompletion: task => Number.POSITIVE_INFINITY, // this task => max number of times it can be completed
        },
        {
            id: "task", // unique id for engine
            title: "Task", // short title for display
            description: "simple task with 'stat' scaling",
            order: 1001, // number for ordering in the list.
            baseDuration: 1.0,
            statsScaling: [["stat1", 1]],
        },
        {
            id: "halfboost", // unique id for engine
            title: "half/boost", // short title for display
            description: "simple task with a +64(x2.0) speed modifier and a 0.5 'stat' scaling",
            order: 1001, // number for ordering in the list.
            baseDuration: 100.0,
            statsScaling: [["stat1", .5]],
            boost: 64, // x2.0
        },
        {
            id: "spawn", // unique id for engine
            title: "Spawn a resource", // short title for display
            order: 1001, // number for ordering in the list.
            baseDuration: 1.0,
            statsScaling: [["stat2", 1], ["stat1", 1]],
            onCompletion: () => {
                game.resources["resource"].amount += 1;
                return true;
            },
        },
        {
            id: "event", // unique id for engine
            title: "Event", // short title for display
            description: "An instantaneous task which runs an event",
            order: 1001, // number for ordering in the list.
            baseDuration: 0,
            statsScaling: [],
            onCompletion: () => {
                game.resources["resource"].amount += 1;
                return true;
            },
        },
        {
            id: "transform", // unique id for engine
            title: "Transform resources", // short title for display
            order: 1002, // number for ordering in the list.
            baseDuration: 2,
            statsScaling: [["stat1", 1]],
        
            isEnabled: () => game.resources["initial_resource"].amount > 0,
            onCompletion: () => {
                game.resources["initial_resource"].amount -= 1;
                game.resources["resource"].amount += 1;
            },
            maxCompletion: task => game.resources["initial_resource"].amount
        },
        {
            id: "preview",
            title: "Preview",
            description: "simple task with 'stat1' scaling",
            order: 1008,
            baseDuration: 1.0,
            statsScaling: [["stat1", 1]],
            maxCompletion: t => 0,
        },
    ],
    objectives: [
        {
            id: "danger", // unique id for engine
            order: 1000, // number for ordering in the list.
        
            isEnabled: a => true, // {context} => should show up
            onCycle: () => {
                console.log("danger onCycle");
            }, // () => do things
            text: "Danger",
            local: true, // used to remove the task when leaving its relevant area
        },
        {
            id: "new_danger", // unique id for engine
            text: "New danger", // short title for display
            order: 1000, // number for ordering in the list.
            statsScaling: [["stat1", -1]], // use negative scaling to slow down dangers
        
            isEnabled: a => game.resources.amount > 10, // {context} => should show up
            onCycle: () => {game.determination.decay *= base8; return true;}, // {context} => should show up
            local: true, // used to remove the task when leaving its relevant area
        },
    ],
    events: {
        test: {
            content:"Test content",
            onExit: () => console.log("test event onExit")
        }
    },
    onLoad: () => console.log("test onLoad"),
    cycleLength: 10.0,
    next: () => plains,
}