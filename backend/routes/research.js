const express =
    require("express");

const research =
    require("../research/researchEngine");

const router =
    express.Router();

router.post(
    "/organization",
    (req, res) => {

        try {

            const result =
                research.researchOrganization(
                    req.body
                );

            res.json({

                status:
                    "success",

                result

            });

        } catch (error) {

            res.status(400).json({

                status:
                    "error",

                error:
                    error.message

            });

        }

    }
);

module.exports =
    router;
