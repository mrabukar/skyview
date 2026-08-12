import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { requireOrganizationId } from "../../common/utils/require-organization-id.util";
import { withOrganizationId } from "../../common/utils/with-organization-id.util";
import { PrismaService } from "../../prisma/prisma.service";
import { R2Service } from "../../common/r2/r2.service";
import { ConfirmUserAttachmentDto } from "./dto/confirm-user-attachment.dto";
import { CreateUploadUrlDto } from "./dto/create-upload-url.dto";
import { UserAttachmentQueryDto } from "./dto/user-attachment-query.dto";
import { USER_ATTACHMENT_EXTENSION } from "./user-attachment.constants";

const attachmentInclude = {
  uploadedBy: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.UserAttachmentInclude;

type AttachmentWithDetails = Prisma.UserAttachmentGetPayload<{
  include: typeof attachmentInclude;
}>;

@Injectable()
export class UserAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async createUploadUrl(dto: CreateUploadUrlDto, user: CurrentUserPayload) {
    const organizationId = requireOrganizationId(user);
    const target = await this.requireTargetUser(dto.userId);

    const ext = USER_ATTACHMENT_EXTENSION[dto.contentType] ?? "bin";
    const key = `user-docs/${organizationId}/${target.id}/${randomUUID()}.${ext}`;
    const url = await this.r2.presignPut(key, dto.contentType);

    return { key, url, expiresIn: 300 };
  }

  async confirm(dto: ConfirmUserAttachmentDto, user: CurrentUserPayload) {
    const organizationId = requireOrganizationId(user);
    const target = await this.requireTargetUser(dto.userId);

    const prefix = `user-docs/${organizationId}/${target.id}/`;
    if (!dto.key.startsWith(prefix)) {
      throw new BadRequestException(
        "Attachment key does not match the target user",
      );
    }

    const created = await this.prisma.userAttachment.create({
      data: withOrganizationId(
        {
          userId: target.id,
          key: dto.key,
          originalName: dto.originalName.trim().slice(0, 255),
          contentType: dto.contentType,
          size: dto.size,
          uploadedById: user.id,
        },
        organizationId,
      ),
      include: attachmentInclude,
    });

    return this.toClient(created);
  }

  async list(query: UserAttachmentQueryDto, user: CurrentUserPayload) {
    this.assertCanReadUser(query.userId, user);
    await this.requireTargetUser(query.userId);

    const rows = await this.prisma.userAttachment.findMany({
      where: { userId: query.userId },
      orderBy: { createdAt: "desc" },
      include: attachmentInclude,
    });

    const data = await Promise.all(rows.map((r) => this.toClient(r)));
    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: 1,
      },
    };
  }

  async getUrl(id: string, user: CurrentUserPayload) {
    const attachment = await this.requireAttachment(id);
    this.assertCanReadUser(attachment.userId, user);
    const url = await this.r2.presignGet(attachment.key);
    return { url, expiresIn: 300 };
  }

  async remove(id: string, _user: CurrentUserPayload): Promise<void> {
    const attachment = await this.requireAttachment(id);
    try {
      await this.r2.deleteObject(attachment.key);
    } catch {
      // ignore storage errors — the row must still be removed
    }
    await this.prisma.userAttachment.delete({ where: { id: attachment.id } });
  }

  private assertCanReadUser(targetUserId: string, user: CurrentUserPayload) {
    if (user.role === UserRole.admin || user.role === UserRole.super_admin) {
      return;
    }
    if (
      user.role === UserRole.branch_manager &&
      targetUserId === user.id
    ) {
      return;
    }
    throw new ForbiddenException(
      "You can only view your own documents",
    );
  }

  private async requireTargetUser(userId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }
    return target;
  }

  private async requireAttachment(id: string) {
    const attachment = await this.prisma.userAttachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException(
        `Attachment with id "${id}" not found`,
      );
    }
    return attachment;
  }

  private async toClient(attachment: AttachmentWithDetails) {
    return {
      id: attachment.id,
      userId: attachment.userId,
      userName: attachment.user?.name ?? null,
      originalName: attachment.originalName,
      contentType: attachment.contentType,
      size: attachment.size,
      uploadedByName: attachment.uploadedBy?.name ?? null,
      createdAt: attachment.createdAt.toISOString(),
      url: await this.r2.presignGet(attachment.key),
    };
  }
}
