import { check, section } from "../helpers.mjs";

/**
 * User attachments — admin upload/list/delete; manager read-own only.
 * Full R2 PUT is skipped when upload-url fails (R2 not configured); metadata
 * and auth gates are still asserted.
 */
export async function runUserAttachments(ctx) {
  section("User attachments");
  const { admin, manager } = ctx;

  let r = await manager.req("GET", "/api/me");
  const managerId = r.json?.user?.id;
  check("setup: manager /me has id", !!managerId, JSON.stringify(r.json?.user?.id));

  r = await admin.req("GET", "/api/me");
  const adminId = r.json?.user?.id;
  check("setup: admin /me has id", !!adminId);

  // Manager cannot request upload URL
  r = await manager.req("POST", "/api/user-attachments/upload-url", {
    body: {
      userId: managerId,
      contentType: "image/jpeg",
      size: 1024,
    },
  });
  check("manager upload-url → 403", r.status === 403, `got ${r.status}`);

  // Manager may list own docs
  r = await manager.req(
    "GET",
    `/api/user-attachments?userId=${encodeURIComponent(managerId)}`,
  );
  check("manager list own → 200", r.status === 200, `got ${r.status}`);
  check("manager list own returns data array", Array.isArray(r.json?.data));

  // Manager cannot list another user's docs
  if (adminId) {
    r = await manager.req(
      "GET",
      `/api/user-attachments?userId=${encodeURIComponent(adminId)}`,
    );
    check("manager list other user → 403", r.status === 403, `got ${r.status}`);
  }

  // Admin upload-url for manager
  r = await admin.req("POST", "/api/user-attachments/upload-url", {
    body: {
      userId: managerId,
      contentType: "image/jpeg",
      size: 12,
    },
  });

  if (r.status !== 200 || !r.json?.key || !r.json?.url) {
    console.log(
      `  ⚠ admin upload-url skipped (R2 may be unset) — got ${r.status}`,
    );
    return;
  }

  check("admin upload-url → 200", true);
  const { key, url } = r.json;

  const put = await fetch(url, {
    method: "PUT",
    body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    headers: { "Content-Type": "image/jpeg" },
  });
  check("R2 PUT → 2xx", put.ok, `got ${put.status}`);

  r = await admin.req("POST", "/api/user-attachments", {
    body: {
      userId: managerId,
      key,
      contentType: "image/jpeg",
      size: 4,
      originalName: "smoke-id.jpg",
    },
  });
  check("admin confirm → 201", r.status === 201, `got ${r.status} ${(r.text ?? "").slice(0, 160)}`);
  const attachmentId = r.json?.id;
  check("confirm returns id + url", !!attachmentId && !!r.json?.url);

  // Bad key prefix → 400
  r = await admin.req("POST", "/api/user-attachments", {
    body: {
      userId: managerId,
      key: "receipts/wrong/prefix.jpg",
      contentType: "image/jpeg",
      size: 4,
      originalName: "bad.jpg",
    },
  });
  check("confirm bad key prefix → 400", r.status === 400, `got ${r.status}`);

  r = await manager.req(
    "GET",
    `/api/user-attachments?userId=${encodeURIComponent(managerId)}`,
  );
  check(
    "manager sees own attachment",
    (r.json?.data ?? []).some((a) => a.id === attachmentId),
    `n=${r.json?.data?.length ?? 0}`,
  );

  if (attachmentId) {
    r = await manager.req("GET", `/api/user-attachments/${attachmentId}/url`);
    check("manager get own url → 200", r.status === 200 && !!r.json?.url, `got ${r.status}`);

    r = await manager.req("DELETE", `/api/user-attachments/${attachmentId}`);
    check("manager delete → 403", r.status === 403, `got ${r.status}`);

    r = await admin.req("DELETE", `/api/user-attachments/${attachmentId}`);
    check("admin delete → 204", r.status === 204, `got ${r.status}`);
  }
}
