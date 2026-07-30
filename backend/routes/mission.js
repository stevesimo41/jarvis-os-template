const express = require("express");

const router = express.Router();

const dailyMission = require("../services/canonicalExecutiveService");


router.get("/", (req,res)=>{

    try {

        const mission =
        dailyMission.mission();


        res.json({
            status:"online",
            mission
        });


    }

    catch(error){

        res.status(500).json({
            error:error.message
        });

    }

});


module.exports = router;
