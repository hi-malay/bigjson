import { invoke } from "@tauri-apps/api/core";

export type NodeKind = "object" | "array" | "string" | "number" | "bool" | "null";

export type NodeKey =
  | { kind: "root" }
  | { kind: "object_key"; key: string }
  | { kind: "array_index"; index: number };

export type FileMeta = {
  path: string;
  size: number;
  node_count: number;
  parse_ms: number;
  index_ms: number;
  root_id: number;
};

export type NodeView = {
  id: number;
  parent: number | null;
  key: NodeKey;
  kind: NodeKind;
  child_count: number;
  preview: string | null;
};

export type SearchMode = "text" | "jsonpath";

export const ipc = {
  openFile: (path: string) => invoke<FileMeta>("open_file", { path }),
  closeFile: () => invoke<void>("close_file"),
  getNode: (id: number) => invoke<NodeView>("get_node", { id }),
  getChildren: (id: number, offset: number, limit: number) =>
    invoke<NodeView[]>("get_children", { id, offset, limit }),
  getAncestors: (id: number) => invoke<number[]>("get_ancestors", { id }),
  getValue: (id: number) => invoke<string>("get_value", { id }),
  getPath: (id: number) => invoke<string>("get_path", { id }),
  search: (query: string, mode: SearchMode) =>
    invoke<number[]>("search", { query, mode }),
};
