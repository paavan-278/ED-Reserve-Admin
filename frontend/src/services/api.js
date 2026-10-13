import axios from "axios";

const cache = {};

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

/*
  LOCAL BACKEND URL

  Agar backend FastAPI port 8000 par chal raha hai
  toh ye correct hai.

  Production me .env ka
  REACT_APP_API_URL use hoga.
*/

const baseURL = isLocal
  ? "http://127.0.0.1:8000"
  : process.env.REACT_APP_API_URL ||
    "http://127.0.0.1:8000";

const api = axios.create({
  baseURL,
  timeout: 15000,

  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================
   CACHE KEY
========================= */

const getCacheKey = (
  url,
  config = {}
) => {
  const params = config.params
    ? JSON.stringify(config.params)
    : "";

  return `${url}?${params}`;
};

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    config.headers = config.headers || {};

    if (
      token &&
      token !== "null" &&
      token !== "undefined"
    ) {
      config.headers.Authorization =
        `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },

  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

api.interceptors.response.use(
  (response) => {
    const method =
      response.config?.method?.toLowerCase();

    const url =
      response.config?.url;

    /*
      GET RESPONSE CACHE
    */

    if (
      method === "get" &&
      url
    ) {
      const key = getCacheKey(
        url,
        response.config
      );

      cache[key] = {
        data: response.data,
        time: Date.now(),
      };
    }

    /*
      WRITE REQUEST KE BAAD
      PURA CACHE CLEAR
    */

    if (
      [
        "post",
        "put",
        "delete",
        "patch",
      ].includes(method)
    ) {
      Object.keys(cache).forEach(
        (key) => delete cache[key]
      );
    }

    return response;
  },

  (error) => {
    const config = error?.config;

    /*
      401 UNAUTHORIZED

      IMPORTANT:
      Login request khud fail ho toh
      unnecessary redirect loop nahi hoga.
    */

    if (
      error?.response?.status === 401 &&
      !config?.url?.includes("/login")
    ) {
      localStorage.removeItem("token");

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    /*
      NETWORK ERROR

      Sirf ek retry.
    */

    if (
      !error.response &&
      config &&
      !config.__retry
    ) {
      config.__retry = true;

      return api(config);
    }

    return Promise.reject(error);
  }
);

/* =========================
   CUSTOM GET WITH CACHE
========================= */

const originalGet =
  api.get.bind(api);

api.get = async (
  url,
  config = {}
) => {
  const cacheKey =
    getCacheKey(url, config);

  const cached =
    cache[cacheKey];

  const CACHE_TIME = 5000;

  /*
    CACHE DISABLED
  */

  if (
    config.cache === false
  ) {
    return originalGet(
      url,
      config
    );
  }

  /*
    VALID CACHE
  */

  if (
    cached &&
    Date.now() -
      cached.time <
      CACHE_TIME
  ) {
    return {
      data: cached.data,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      fromCache: true,
    };
  }

  /*
    REAL API REQUEST
  */

  return originalGet(
    url,
    config
  );
};

/* =========================
   CLEAR CACHE
========================= */

api.clearCache = (
  keys = []
) => {
  /*
    ALL CACHE CLEAR
  */

  if (
    !Array.isArray(keys) ||
    keys.length === 0
  ) {
    Object.keys(cache).forEach(
      (key) => delete cache[key]
    );

    return;
  }

  /*
    SPECIFIC CACHE CLEAR
  */

  keys.forEach(
    (keyPrefix) => {
      Object.keys(cache)
        .filter(
          (cacheKey) =>
            cacheKey.startsWith(
              keyPrefix
            )
        )
        .forEach(
          (cacheKey) =>
            delete cache[cacheKey]
        );
    }
  );
};

export default api;