(function () {
    "use strict";

    const state = {
        root: null,
        offset: 0,
        total: 0,
        records: [],
        status: null,
        ventureId: "well-noticed",
        portfolio: null,
        query: "",
        category: "",
        owner: "",
        pageSize: 50,
        loading: false,
        error: "",
        selectedProspect: null,
        intelligenceProfile: null,
        intelligenceLoading: false,
        intelligenceError: "",
        governance: {
            authStatus: null,
            identity: null,
            plan: null,
            approval: null,
            execution: null,
            auditEvents: [],
            loading: false,
            message: "",
            error: ""
        }
    };

    function reset(root) {
        state.root = root;
        state.offset = 0;
        state.total = 0;
        state.records = [];
        state.status = null;
        state.ventureId = "well-noticed";
        state.portfolio = null;
        state.query = "";
        state.category = "";
        state.owner = "";
        state.pageSize = 50;
        state.loading = false;
        state.error = "";
        state.selectedProspect = null;
        state.intelligenceProfile = null;
        state.intelligenceLoading = false;
        state.intelligenceError = "";
        state.governance = {
            authStatus: null,
            identity: null,
            plan: null,
            approval: null,
            execution: null,
            auditEvents: [],
            loading: false,
            message: "",
            error: ""
        };
    }

    window.JarvisCrmState = {
        state,
        reset
    };
})();
