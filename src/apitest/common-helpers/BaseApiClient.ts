import type { APIRequestContext, APIResponse } from "@playwright/test";
import { logger } from "@helpers/Logger";

export type ApiRequestOptions = Parameters<APIRequestContext["get"]>[1];

/**
 * Base class for all API page-helper modules.
 */
export abstract class BaseApiClient {
  constructor(protected readonly request: APIRequestContext) {}

  protected async get(path: string, options?: ApiRequestOptions): Promise<APIResponse> {
    logger.info(`API GET ${path}`);
    return this.request.get(path, options);
  }

  protected async post(
    path: string,
    options?: Parameters<APIRequestContext["post"]>[1],
  ): Promise<APIResponse> {
    logger.info(`API POST ${path}`);
    return this.request.post(path, options);
  }

  protected async put(
    path: string,
    options?: Parameters<APIRequestContext["put"]>[1],
  ): Promise<APIResponse> {
    logger.info(`API PUT ${path}`);
    return this.request.put(path, options);
  }

  protected async delete(
    path: string,
    options?: Parameters<APIRequestContext["delete"]>[1],
  ): Promise<APIResponse> {
    logger.info(`API DELETE ${path}`);
    return this.request.delete(path, options);
  }
}
