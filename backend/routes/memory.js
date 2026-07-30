const express = require("express");

const router = express.Router();

const memory =
require("../memory/memoryEngine");


router.get("/", (req,res)=>{

    try {

        const context =
        memory.getExecutiveContext();


        res.json({
            status:"online",
            memory: context
        });


    }

    catch(error){

        res.status(500).json({
            error:error.message
        });

    }

});


module.exports = router;
