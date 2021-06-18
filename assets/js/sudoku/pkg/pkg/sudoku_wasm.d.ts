/* tslint:disable */
/* eslint-disable */
/**
*/
export function greet(): void;
/**
* @param {BoardFFI} board
* @returns {string}
*/
export function solve_board(board: BoardFFI): string;
/**
*/
export class BoardFFI {
  free(): void;
}
/**
*/
export class RuleFFI {
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly greet: () => void;
  readonly __wbg_ruleffi_free: (a: number) => void;
  readonly __wbg_boardffi_free: (a: number) => void;
  readonly solve_board: (a: number, b: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
