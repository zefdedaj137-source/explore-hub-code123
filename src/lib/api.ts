import { supabase } from "@/integrations/supabase/client";

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/**
 * Wraps a Supabase query and throws a consistent ApiError on failure.
 * Usage:
 *   const data = await queryOrThrow(
 *     supabase.from("profiles").select("*").eq("id", userId).single(),
 *     "PROFILE_FETCH"
 *   );
 */
export async function queryOrThrow<T>(
  query: PromiseLike<{ data: T; error: { message: string } | null }>,
  errorCode: string
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw new ApiError(error.message, errorCode);
  }
  return data;
}

/**
 * Wraps a Supabase RPC call.
 */
export async function rpcOrThrow<T>(
  rpcName: string,
  params: Record<string, unknown>,
  errorCode: string
): Promise<T> {
  const { data, error } = (await supabase.rpc(rpcName, params)) as {
    data: T;
    error: { message: string } | null;
  };
  if (error) {
    throw new ApiError(error.message, errorCode);
  }
  return data;
}
