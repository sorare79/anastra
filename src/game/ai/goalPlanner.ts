import type {
    GameState,
} from "../types";

import type {
    AITurnPlan,
    AIGoal,
} from "./types";

export function createGoals(
    state:GameState,
    plan:AITurnPlan,
):AIGoal[]{

    const goals:AIGoal[]=[];

    switch(plan.strategy){

        case "tempo":

            goals.push({

                type:"open-now",

                priority:1,

                score:90,

                reasons:[
                    "first-opening-advantage",
                ],

            });

            goals.push({

                type:"take-discard",

                priority:2,

                score:70,

                reasons:[
                    "discard-pile-opportunity",
                ],

            });

            goals.push({

                type:"protect-high-cards",

                priority:3,

                score:60,

                reasons:[
                    "protect-high-card",
                ],

            });

            break;

        case "patlama":

            goals.push({

                type:"wait-open",

                priority:1,

                score:95,

                reasons:[
                    "stronger-future-opening",
                ],

            });

            goals.push({

                type:"create-meld",

                priority:2,

                score:80,

                reasons:[
                    "future-meld-potential",
                ],

            });

            goals.push({

                type:"reduce-hand",

                priority:3,

                score:65,

                reasons:[
                    "immediate-score-gain",
                ],

            });

            break;

        case "tuzak":

            goals.push({

                type:"reduce-hand",

                priority:1,

                score:85,

                reasons:[
                    "opponent-penalty-pressure",
                ],

            });

            goals.push({

                type:"discard-low-card",

                priority:2,

                score:60,

                reasons:[
                    "discard-low-value-card",
                ],

            });

            break;

    }

    return goals;

}