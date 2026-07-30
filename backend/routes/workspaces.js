const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");


router.get("/:agentId", (req, res) => {

    const filePath = path.join(
        __dirname,
        "../../agents/workspaces/workspaces.json"
    );


    const workspaces =
        JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );


    const workspace =
        workspaces[req.params.agentId];


    if (!workspace) {

        return res.status(404).json({
            error: "Workspace not found"
        });

    }


    res.json(workspace);

});


module.exports = router;