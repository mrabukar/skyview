import { IsEnum, IsOptional } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class PayOrderDto {
  /** Payment method used. Optional — may be null if not recorded. */
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
