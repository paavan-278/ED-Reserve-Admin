import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import api from "../services/api";

const AppContext = createContext(null);

const readCache = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const groupResourcesByBlock = (resourcesList) => {
  const grouped = {};

  resourcesList.forEach((resource) => {
    const key = resource.block_id || "extra";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(resource);
  });

  return grouped;
};

export const AppProvider = ({ children }) => {
  const initialBlocks = readCache("blocks", []);
  const initialResources = readCache("resources", {});
  const initialIncharges = readCache("incharges", {});
  const initialDataLoaded = initialBlocks.length > 0 && Object.keys(initialResources).length > 0;
  const [blocks, setBlocks] = useState(initialBlocks);
  const [resources, setResources] = useState(initialResources);
  const [incharges, setIncharges] = useState(initialIncharges);
  const [dataLoaded, setDataLoaded] = useState(initialDataLoaded);
  const [prefetching, setPrefetching] = useState(false);
  const prefetchStartedRef = useRef(false);

  const fetchInitialData = useCallback(async (options = {}) => {
    const force = Boolean(options.force);
    if (!force && (dataLoaded || prefetchStartedRef.current)) {
      return;
    }

    prefetchStartedRef.current = true;
    setPrefetching(true);
    try {
      const [blocksRes, inchargesRes, resourcesRes] = await Promise.all([
        api.get("/blocks", { cache: !force }),
        api.get("/incharges", { cache: !force }),
        api.get("/all-resources", { cache: !force })
      ]);

      const nextBlocks = blocksRes.data || [];
      const nextIncharges = inchargesRes.data || {};
      const nextResources = groupResourcesByBlock(resourcesRes.data || []);

      setBlocks(nextBlocks);
      setIncharges(nextIncharges);
      setResources(nextResources);
      setDataLoaded(true);

      writeCache("blocks", nextBlocks);
      writeCache("incharges", nextIncharges);
      writeCache("resources", nextResources);
      localStorage.setItem("dataLoaded", "true");
    } catch (error) {
      prefetchStartedRef.current = false;
      throw error;
    } finally {
      prefetchStartedRef.current = false;
      setPrefetching(false);
    }
  }, [dataLoaded]);

  const preloadAfterLogin = useCallback(async (role) => {
    setPrefetching(true);
    try {
      const commonRequests = [
        api.get("/blocks", { cache: false }),
        api.get("/incharges", { cache: false }),
        api.get("/all-resources", { cache: false })
      ];
      const roleRequests = role === "admin"
        ? [
            api.get("/admin/bookings/pending", { cache: false }),
            api.get("/admin/schedule", { cache: false }),
            api.get("/admin/history", { cache: false })
          ]
        : [
            api.get("/client/dashboard", { cache: false }),
            api.get("/client/bookings", { cache: false })
          ];

      const responses = await Promise.all([...commonRequests, ...roleRequests]);
      const [blocksRes, inchargesRes, resourcesRes] = responses;
      const nextBlocks = blocksRes.data || [];
      const nextIncharges = inchargesRes.data || {};
      const nextResources = groupResourcesByBlock(resourcesRes.data || []);

      setBlocks(nextBlocks);
      setIncharges(nextIncharges);
      setResources(nextResources);
      setDataLoaded(true);
      writeCache("blocks", nextBlocks);
      writeCache("incharges", nextIncharges);
      writeCache("resources", nextResources);

      if (role === "admin") {
        localStorage.setItem("adminPendingBookings", JSON.stringify(responses[3].data || []));
        localStorage.setItem("adminSchedule", JSON.stringify(responses[4].data || []));
        localStorage.setItem("adminHistory", JSON.stringify(responses[5].data || []));
      } else {
        localStorage.setItem("dashboard", JSON.stringify(responses[3].data || {}));
        localStorage.setItem("bookings", JSON.stringify(responses[4].data || []));
      }
    } finally {
      setPrefetching(false);
    }
  }, []);

  const value = useMemo(() => ({
    blocks,
    resources,
    incharges,
    dataLoaded,
    prefetching,
    fetchInitialData,
    preloadAfterLogin,
    setBlocks,
    setResources,
    setIncharges
  }), [blocks, dataLoaded, fetchInitialData, incharges, prefetching, preloadAfterLogin, resources]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
