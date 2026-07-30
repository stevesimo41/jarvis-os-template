const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {

    const command = req.body.command.toLowerCase();

    let response = "";

    if (
        command.includes("priority") ||
        command.includes("priorities") ||
        command.includes("focus")
    ) {

        response =
        "Your JARVIS OS is online. Define your goals in the executive settings to get personalized priorities.";

    } else if (command.includes("venture")) {

        response =
        "Your active ventures are shown in the Agent Hub. Add your own ventures in the executive settings.";

    } else {

        response =
        "Chief of Staff Agent received your request. I am processing this through the JARVIS operating framework.";

    }

    res.json({
        agent: "Chief of Staff",
        command,
        response
    });

});

module.exports = router;
