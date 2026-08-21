import { applyDecorators, UseGuards } from "@nestjs/common";
import { ShiftGuard } from "../guards/shift.guard";

/**
 * Marks a POS write route as shift-enforced.
 * Cashiers receive a 403 when their shift window has expired or it is not
 * one of their working days. Non-cashier roles pass through unaffected.
 *
 * Apply on individual route handlers inside a controller that already has
 * a broader @Roles(...) on the class:
 *
 * ```typescript
 * @ShiftGuarded()
 * @Post()
 * createOrder(...) {}
 * ```
 *
 * Depends on @thallesp/nestjs-better-auth AuthGuard running first so that
 * `request.user` is already populated.
 */
export function ShiftGuarded() {
  return applyDecorators(UseGuards(ShiftGuard));
}
