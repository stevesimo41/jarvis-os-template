function requestId(req) {
    return req.id || null;
}

function sendSuccess(req, res, data, options = {}) {
    const statusCode = options.statusCode || 200;

    return res.status(statusCode).json({
        ok: true,
        status: "success",
        data,
        meta: {
            requestId: requestId(req),
            ...(options.meta || {})
        }
    });
}

function sendError(req, res, options = {}) {
    return res.status(options.statusCode || 500).json({
        ok: false,
        status: "error",
        error: {
            code: options.code || "INTERNAL_ERROR",
            message: options.message || "An unexpected error occurred."
        },
        meta: {
            requestId: requestId(req)
        }
    });
}

module.exports = {
    sendSuccess,
    sendError
};
