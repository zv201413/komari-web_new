import {
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useNodeList } from "./NodeListContext";
import { apiService } from "@/services/api";
import type { NodeData } from "@/types/node";

export interface NodeDataContextType {
  nodes: NodeData[];
  loading: boolean;
  error: string | null;
  refreshNodes: () => void;
  getNodeDetails: (uuid: string) => Promise<any>;
  getLoadHistory: (uuid: string, hours?: number) => Promise<any>;
  getPingHistory: (uuid: string, hours?: number) => Promise<any>;
  getRecentLoadHistory: (uuid: string) => Promise<any>;
  getNodesByGroup: (group: string) => NodeData[];
  getGroups: () => string[];
}

const NodeDataContext = createContext<NodeDataContextType | null>(null);

export const useNodeData = () => {
  const context = useContext(NodeDataContext);
  if (!context) {
    throw new Error("useNodeData must be used within a NodeDataProvider");
  }
  return context;
};

interface NodeDataProviderProps {
  children: ReactNode;
}

export const NodeDataProvider = ({ children }: NodeDataProviderProps) => {
  const { nodeList, isLoading, error, refresh } = useNodeList();

  const nodes = (nodeList || []) as unknown as NodeData[];

  const getNodeDetails = useCallback(async (uuid: string) => {
    try {
      const recentStats = await apiService.getNodeRecentStats(uuid);
      return { recentStats };
    } catch (err) {
      console.error("Failed to fetch node recent stats:", err);
      return null;
    }
  }, []);

  const getLoadHistory = useCallback(
    async (uuid: string, hours: number = 24) => {
      try {
        const loadHistory = await apiService.getLoadHistory(uuid, hours);
        return loadHistory;
      } catch (err) {
        console.error("Failed to fetch load history:", err);
        return null;
      }
    },
    []
  );

  const getPingHistory = useCallback(
    async (uuid: string, hours: number = 24) => {
      try {
        const pingHistory = await apiService.getPingHistory(uuid, hours);
        return pingHistory;
      } catch (err) {
        console.error("Failed to fetch ping history:", err);
        return null;
      }
    },
    []
  );

  const getRecentLoadHistory = useCallback(async (uuid: string) => {
    try {
      const recentStats = await apiService.getNodeRecentStats(uuid);
      if (!recentStats) return null;
      return { count: recentStats.length, records: recentStats };
    } catch (err) {
      console.error("Failed to fetch recent load history:", err);
      return null;
    }
  }, []);

  const getNodesByGroup = useCallback(
    (group: string) => {
      return nodes.filter((node) => node.group === group);
    },
    [nodes]
  );

  const getGroups = useCallback(() => {
    return Array.from(
      new Set(nodes.map((node) => node.group).filter(Boolean))
    );
  }, [nodes]);

  return (
    <NodeDataContext.Provider
      value={{
        nodes,
        loading: isLoading,
        error,
        refreshNodes: refresh,
        getNodeDetails,
        getLoadHistory,
        getPingHistory,
        getRecentLoadHistory,
        getNodesByGroup,
        getGroups,
      }}
    >
      {children}
    </NodeDataContext.Provider>
  );
};
