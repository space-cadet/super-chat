/**
 * useAgent — React hook for multi-agent orchestration.
 *
 * Manages multiple ChatEngine instances (one per agent) and
 * provides dispatch for sequential or parallel execution.
 *
 * Usage:
 *   const { agents, responses, dispatch, isRunning } = useAgent([
 *     { id: 'researcher', name: 'Researcher', engine: researcherEngine },
 *     { id: 'critic', name: 'Critic', engine: criticEngine },
 *   ]);
 *
 *   await dispatch('What are the implications of quantum error correction?');
 */

import { useState, useCallback } from "react";
import type { AgentResponse } from "../../core/types";
import type { ChatEngine } from "../../core/ChatEngine";

export interface AgentConfig {
  id: string;
  name: string;
  color?: string;
  engine: ChatEngine;
}

export interface AgentState {
  agents: AgentConfig[];
  responses: AgentResponse[];
  isRunning: boolean;
  error: string | null;
}

export interface AgentActions {
  dispatch: (text: string, mode?: "sequential" | "parallel") => Promise<void>;
  addAgent: (agent: AgentConfig) => void;
  removeAgent: (agentId: string) => void;
  clearResponses: () => void;
}

export type UseAgentReturn = AgentState & AgentActions;

export function useAgent(initialAgents: AgentConfig[] = []): UseAgentReturn {
  const [agents, setAgents] = useState<AgentConfig[]>(initialAgents);
  const [responses, setResponses] = useState<AgentResponse[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useCallback(
    async (text: string, mode: "sequential" | "parallel" = "sequential") => {
      setError(null);
      setIsRunning(true);
      setResponses([]);

      try {
        if (mode === "parallel") {
          // Run all agents concurrently
          const promises = agents.map(async (agent) => {
            const stream = agent.engine.sendMessage(text);
            let content = "";

            for await (const event of stream) {
              if (event.type === "text-delta") {
                content += event.text;
              }
            }

            const response: AgentResponse = {
              agentId: agent.id,
              agentName: agent.name,
              message: {
                id: `resp-${agent.id}-${Date.now()}`,
                role: "assistant",
                content,
                timestamp: Date.now(),
              },
            };

            setResponses((prev) => [...prev, response]);
            return response;
          });

          await Promise.all(promises);
        } else {
          // Run agents sequentially
          for (const agent of agents) {
            const stream = agent.engine.sendMessage(text);
            let content = "";

            for await (const event of stream) {
              if (event.type === "text-delta") {
                content += event.text;
              }
            }

            const response: AgentResponse = {
              agentId: agent.id,
              agentName: agent.name,
              message: {
                id: `resp-${agent.id}-${Date.now()}`,
                role: "assistant",
                content,
                timestamp: Date.now(),
              },
            };

            setResponses((prev) => [...prev, response]);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setIsRunning(false);
      }
    },
    [agents]
  );

  const addAgent = useCallback((agent: AgentConfig) => {
    setAgents((prev) => [...prev, agent]);
  }, []);

  const removeAgent = useCallback((agentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
    setResponses((prev) => prev.filter((r) => r.agentId !== agentId));
  }, []);

  const clearResponses = useCallback(() => {
    setResponses([]);
  }, []);

  return {
    agents,
    responses,
    isRunning,
    error,
    dispatch,
    addAgent,
    removeAgent,
    clearResponses,
  };
}
