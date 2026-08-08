import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { PageAccessGuard } from "./page-access.guard";
import type { PageKey } from "./pages";

export const PAGE_KEY = "PAGE_KEY";

/**
 * Tag a controller or route with its manager-page key and enforce access.
 * A branch_manager whose `disabledPages` contains this key gets a 403.
 */
export function Page(key: PageKey) {
  return applyDecorators(SetMetadata(PAGE_KEY, key), UseGuards(PageAccessGuard));
}
